/**
 * גישת שרת מיוחסת — ללא firebase-admin.
 *
 * למה REST ולא ה-SDK: חבילת firebase-admin לא שורדת את האריזה של Vite/Nitro
 * (נשברת עם "Cannot read properties of undefined (reading 'SDK_VERSION')"),
 * בדיוק כמו @sentry/cloudflare לפניה. fetch נקי אין לו מה להישבר.
 *
 * אימות הטוקן נעשה אצל גוגל (Identity Toolkit), והגישה ל-Firestore/Storage
 * דרך אסימון חשבון השירות של Cloud Run — כלומר עוקפת את חוקי המסד, כנדרש.
 */

const PROJECT_ID = "justask-6bfb9";
const BUCKET = "justask-6bfb9.firebasestorage.app";
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string;
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/* ---------- אימות המשתמש הפונה ---------- */

/** מאמת את טוקן ההתחברות מול גוגל ומחזיר את ה-uid. */
export async function requireUser(idToken: string | undefined): Promise<string> {
  if (!idToken) throw new Error("unauthenticated: missing id token");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) {
    throw new Error(`unauthenticated: ${(await res.text()).slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    users?: { localId?: string; email?: string; emailVerified?: boolean }[];
  };
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new Error("unauthenticated: token has no user");
  return uid;
}

/**
 * זהות מאומתת מול גוגל — כולל האימייל.
 * חשוב: אסור להסתמך על שדה email שבמסמך המשתמש, כי המשתמש כותב אותו בעצמו.
 */
export async function requireIdentity(
  idToken: string | undefined,
): Promise<{ uid: string; email: string; emailVerified: boolean }> {
  if (!idToken) throw new Error("unauthenticated: missing id token");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) throw new Error(`unauthenticated: ${(await res.text()).slice(0, 120)}`);
  const data = (await res.json()) as {
    users?: { localId?: string; email?: string; emailVerified?: boolean }[];
  };
  const u = data.users?.[0];
  if (!u?.localId) throw new Error("unauthenticated: token has no user");
  return { uid: u.localId, email: u.email ?? "", emailVerified: !!u.emailVerified };
}

/* ---------- אסימון חשבון השירות (Cloud Run metadata) ---------- */

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const res = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );
  if (!res.ok) throw new Error(`metadata token failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    // חידוש דקה לפני הפקיעה — בקשה עם אסימון פג נכשלת ב-401
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

/* ---------- Firestore REST ---------- */

type FsValue = {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields?: Record<string, FsValue> };
};

function decode(v: FsValue | undefined): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(decode);
  if (v.mapValue) {
    const out: Record<string, unknown> = {};
    for (const [k, f] of Object.entries(v.mapValue.fields ?? {})) out[k] = decode(f);
    return out;
  }
  return undefined;
}

/** קריאת מסמך תיק בהרשאות שרת. מחזיר null אם אינו קיים. */
export async function adminGetCase(caseId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${DOCS}/cases/${encodeURIComponent(caseId)}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore get failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
  const doc = (await res.json()) as { fields?: Record<string, FsValue> };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) out[k] = decode(v);
  return out;
}

type Primitive = string | number | boolean | string[];

function encode(v: Primitive): FsValue {
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map((x) => ({ stringValue: x })) } };
  }
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  return { stringValue: v };
}

/** כתיבת שדות על מסמך כלשהו בהרשאות שרת (עוקף את חוקי המסד). */
/** יצירת מסמך חדש באוסף (מזהה אוטומטי). זורקת בכשל — שהקורא יחליט. */
export async function adminCreate(
  collectionId: string,
  fields: Record<string, Primitive>,
): Promise<void> {
  const body = {
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, encode(v)])),
  };
  const res = await fetch(`${DOCS}/${collectionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`firestore create failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
  }
}

export async function adminPatch(
  path: string,
  fields: Record<string, Primitive>,
): Promise<void> {
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const body = {
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, encode(v)])),
  };
  const res = await fetch(`${DOCS}/${path}?${mask}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`firestore patch failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
  }
}

export function adminUpdateCase(
  caseId: string,
  fields: Record<string, Primitive>,
): Promise<void> {
  return adminPatch(`cases/${encodeURIComponent(caseId)}`, fields);
}

/** קריאת מסמך כלשהו בהרשאות שרת. null אם אינו קיים. */
export async function adminGetDoc(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${DOCS}/${path}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!res.ok) return null;
  const doc = (await res.json()) as { fields?: Record<string, FsValue> };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) out[k] = decode(v);
  return out;
}

/**
 * רישום תגובה של עו"ד לתיק — בסיס למדד התגובתיות שהפלטפורמה מודדת בעצמה.
 * נעשה בשרת בלבד: מדד ששקוף ללקוחות אסור שיהיה ניתן לניפוח מהדפדפן.
 */
export async function recordLawyerResponse(uid: string, responseMs: number): Promise<void> {
  try {
    const path = `lawyerStats/${encodeURIComponent(uid)}`;
    const cur = (await adminGetDoc(path)) ?? {};
    const responses = Number(cur.responses ?? 0) + 1;
    const totalResponseMs = Number(cur.totalResponseMs ?? 0) + Math.max(0, responseMs);
    await adminPatch(path, { responses, totalResponseMs, updatedAt: Date.now() });
  } catch {
    /* מדד שנכשל לא אמור להפיל הבעת עניין */
  }
}

/**
 * דירוג לקוח על עורך הדין — נכתב בשרת בלבד.
 *
 * זה החוליה שסגרה את הלולאה: עד כה rating היה מקובע ל-0 בקוד, ולכן
 * הפירמידה שתכננו ל-Pro לא הייתה יכולה להתבסס על איכות אמיתית לעולם.
 * הדירוג נשמר פעם אחת לתיק (מזהה המסמך הוא מזהה התיק) כדי שלא יהיה
 * ניתן להצביע פעמיים על אותו חיבור.
 */
export async function recordLawyerRating(
  caseId: string,
  lawyerId: string,
  clientId: string,
  stars: number,
  note: string,
): Promise<void> {
  const path = `ratings/${encodeURIComponent(caseId)}`;
  if (await adminGetDoc(path)) throw new Error("already rated");

  const clean = Math.min(5, Math.max(1, Math.round(stars)));
  await adminPatch(path, {
    caseId,
    lawyerId,
    clientId,
    stars: clean,
    note: note.slice(0, 500),
    at: Date.now(),
  });

  const statsPath = `lawyerStats/${encodeURIComponent(lawyerId)}`;
  const cur = (await adminGetDoc(statsPath)) ?? {};
  await adminPatch(statsPath, {
    ratings: Number(cur.ratings ?? 0) + 1,
    ratingSum: Number(cur.ratingSum ?? 0) + clean,
    updatedAt: Date.now(),
  });
}

/**
 * רישום חיבור — הבסיס למודל הניסיון.
 *
 * "חיבור" הוא הרגע שבו לקוח בחר בעורך דין. זו היחידה שנספרת, ולא
 * הצעות: הגבלת הצעות הייתה פוגעת דווקא בלקוח, שכל הערך שלו הוא
 * להשוות כמה שיותר הצעות. הצעה לא עולה לאף אחד כלום; חיבור הוא ערך
 * שהתממש.
 *
 * נכתב בשרת בלבד, ורק דרך הנתיב הזה: מונה שקובע מתי מתחילים לשלם
 * חייב להיות בלתי ניתן לאיפוס מהדפדפן. הכתיבה אידמפוטנטית לפי מזהה
 * התיק — אותו חיבור לא נספר פעמיים גם אם הקריאה חוזרת.
 */
export async function recordConnection(uid: string, caseId: string): Promise<number> {
  const path = `lawyerStats/${encodeURIComponent(uid)}`;
  const cur = (await adminGetDoc(path)) ?? {};
  const seen: string[] = Array.isArray(cur.connectionCaseIds)
    ? (cur.connectionCaseIds as string[])
    : [];
  if (seen.includes(caseId)) return seen.length;
  const next = [...seen, caseId];
  await adminPatch(path, {
    connectionCaseIds: next,
    connections: next.length,
    updatedAt: Date.now(),
  });
  return next.length;
}

/* ---------- התראות דחיפה (FCM HTTP v1) ---------- */

/** קריאת מסמך משתמש בהרשאות שרת — לשליפת טוקני הדחיפה והעדפותיו. */
export async function adminGetUser(uid: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${DOCS}/users/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!res.ok) return null;
  const doc = (await res.json()) as { fields?: Record<string, FsValue> };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) out[k] = decode(v);
  return out;
}

/**
 * ה-uid של חשבון לפי אימייל — מתוך Firebase Auth, לא ממסמך המשתמש.
 *
 * חשוב שזה יגיע מ-Auth: שדה ה-email במסמך users נכתב ע"י המשתמש עצמו,
 * ולכן מי שיכתוב שם את כתובת האדמין היה מקבל את התראות האדמין.
 */
export async function uidByEmail(email: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await accessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: [email] }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { localId?: string }[] };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

/**
 * מה עלה בגורל ההתראה.
 *
 * `sendPush` החזירה קודם void, ולכן "נשלח" ו"אין מכשיר רשום" נראו זהים
 * למי שקרא לה. זה בדיוק ההבדל שקובע אם צריך לשלוח מייל במקום — ולכן הוא
 * חייב לחזור החוצה.
 */
export type PushOutcome =
  | "sent" /* לפחות מכשיר אחד קיבל */
  | "no-tokens" /* אין מכשיר רשום — כאן נכנס המייל */
  | "opted-out" /* המשתמש כיבה את הערוץ — לא פוש ולא מייל */
  | "no-user"
  | "failed"; /* כל המכשירים נדחו או שהקריאה נפלה */

/**
 * מטען ההתראה — פונקציה טהורה כדי שהצורה שלו תהיה ניתנת לבדיקה.
 *
 * **אין כאן `notification` ברמה העליונה, וזו לא שכחה.**
 *
 * המטען נשלח לשלוש מעטפות שונות, וכל אחת מציגה אחרת:
 * · PWA ו-TWA — `data` בלבד, וה-service worker מציג בעצמו. כך ההתראה
 *   יוצאת בעברית עם dir=rtl וקישור, ולא בעיצוב ברירת המחדל.
 * · iOS מקורי — `apns.payload.aps.alert`, כי מטען data בלבד מגיע בשקט
 *   ל-iOS והמשתמש לעולם לא יידע.
 *
 * `notification` ברמה העליונה מיותר לשתיהן: ב-iOS ה-alert גובר עליו,
 * וברשת הדפדפן מציג אותו **בנוסף** למה שה-service worker כבר הציג —
 * כלומר שתי התראות זהות. דביר קיבל בדיוק את זה ב-6/8/2026, ותמונת מסך
 * של מסך הנעילה הייתה הדרך היחידה לגלות: השרת החזיר 200, הבדיקות עברו,
 * והלוגים נראו תקינים.
 *
 * אם ייווסף אי פעם Android מקורי (Capacitor במקום TWA) — הוא יצטרך
 * בלוק `android.notification` משלו, ולא את זה בחזרה.
 */
export function buildPushMessage(
  token: string,
  msg: { title: string; body: string; link?: string },
) {
  return {
    message: {
      token,
      data: { title: msg.title, body: msg.body, link: msg.link ?? "/" },
      webpush: { headers: { Urgency: "high" } },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: { title: msg.title, body: msg.body },
            sound: "default",
            badge: 1,
          },
        },
      },
    },
  };
}

/**
 * שליחת התראה לכל המכשירים של משתמש.
 * לעולם לא זורקת — התראה שנכשלה לא אמורה להפיל את הפעולה שיצרה אותה.
 * ההתראה נשלחת כ-data בלבד, כדי שה-service worker יציג אותה בעברית (dir=rtl).
 */
export async function sendPush(
  uid: string,
  msg: { title: string; body: string; link?: string },
  topic?: "caseUpdates" | "lawyerInterest",
): Promise<PushOutcome> {
  try {
    const user = await adminGetUser(uid);
    if (!user) return "no-user";
    // העדפה שכובתה מכבדת את המשתמש; ברירת המחדל היא לשלוח
    if (topic && user[topic] === false) return "opted-out";
    const tokens = (user.pushTokens as string[] | undefined) ?? [];
    if (!tokens.length) return "no-tokens";

    const token = await accessToken();
    const results = await Promise.all(
      tokens.slice(0, 10).map((t) =>
        fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(buildPushMessage(t, msg)),
        })
          .then((r) => r.ok)
          .catch(() => false),
      ),
    );
    return results.some(Boolean) ? "sent" : "failed";
  } catch {
    /* התראה היא תוספת, לא תנאי */
    return "failed";
  }
}

/* ---------- מייל ---------- */

/**
 * כתובת המייל של משתמש — מ-Firebase Auth, לא ממסמך users.
 *
 * מאותה סיבה שב-uidByEmail: השדה במסמך users נכתב מהדפדפן. כתובת שמגיעה
 * מ-Auth היא זו שגוגל אימתה בהתחברות, וזו היחידה שמותר לשלוח אליה.
 */
export async function emailByUid(uid: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await accessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ localId: [uid] }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { email?: string; emailVerified?: boolean }[] };
    const u = data.users?.[0];
    // כתובת לא מאומתת אינה ראיה לכך שהיא שייכת למי שמולנו
    return u?.email && u.emailVerified ? u.email : null;
  } catch {
    return null;
  }
}

export type MailOutcome = "sent" | "no-key" | "no-address" | "failed";

/**
 * שליחת מייל לכתובת ידועה דרך Resend.
 *
 * REST ולא ה-SDK, מאותה סיבה שכל הקובץ הזה הוא REST. לעולם לא זורקת.
 */
export async function sendMailTo(
  to: string,
  msg: { title: string; body: string; link?: string; cta?: string },
): Promise<MailOutcome> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "no-key";
  try {
    const { buildNotificationMail, MAIL_FROM, unsubscribeUrl } = await import("../mail-templates");
    const mail = buildNotificationMail(msg);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MAIL_FROM,
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        // בלי אלה ספקי דואר מסמנים התראות אוטומטיות כספאם
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl()}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) {
      await logServerError("sendMail", new Error(`resend ${res.status}: ${await res.text()}`));
      return "failed";
    }
    return "sent";
  } catch (err) {
    await logServerError("sendMail", err);
    return "failed";
  }
}

/** שליחת מייל למשתמש לפי uid — הכתובת נשלפת מ-Firebase Auth בלבד. */
export async function sendMail(
  uid: string,
  msg: { title: string; body: string; link?: string; cta?: string },
): Promise<MailOutcome> {
  const to = await emailByUid(uid);
  if (!to) return "no-address";
  return sendMailTo(to, msg);
}

/**
 * התראה החוצה — פוש, ומייל למי שאין לו פוש.
 *
 * זה הכלל: **מי שהפעיל התראות מקבל פוש; מי שלא — מקבל מייל.** לא שניהם,
 * כי אותה ידיעה פעמיים היא הטרדה, ולא כלום, כי תיק שיושב בלי מענה הולך
 * למישהו אחר. מי שכיבה את הערוץ במפורש לא מקבל דבר — גם לא מייל; דחיית
 * הרשאה בטלפון היא לא כיבוי, ולכן היא כן מקבלת מייל.
 *
 * לעולם לא זורקת, ומחזירה את מה שקרה בפועל כדי שאפשר יהיה לבדוק.
 */
export async function notify(
  uid: string,
  msg: { title: string; body: string; link?: string; cta?: string },
  topic?: "caseUpdates" | "lawyerInterest",
): Promise<{ push: PushOutcome; mail: MailOutcome | "skipped" }> {
  const push = await sendPush(uid, msg, topic);
  if (push === "sent" || push === "opted-out" || push === "no-user") {
    return { push, mail: "skipped" };
  }
  return { push, mail: await sendMail(uid, msg) };
}

/* ---------- מחיקת חשבון בפועל ---------- */

async function adminDelete(path: string): Promise<void> {
  await fetch(`${DOCS}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await accessToken()}` },
  }).catch(() => undefined);
}

/** מזהי מסמכים באוסף לפי שדה — לאיתור כל התיקים של המשתמש. */
async function adminQueryIds(
  collectionId: string,
  field: string,
  value: string,
): Promise<string[]> {
  const res = await fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: { stringValue: value },
          },
        },
        limit: 500,
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as { document?: { name?: string } }[];
  return rows.map((r) => r.document?.name?.split("/").pop()).filter((x): x is string => !!x);
}

/**
 * שליפת מסמכים שזמנם הגיע — לפי שדה תאריך מספרי קטן-או-שווה לעכשיו.
 * משמש את המחיקה המתוזמנת; מחזיר גם את גוף המסמך ולא רק מזהים.
 */
async function adminQueryDue(
  collectionId: string,
  field: string,
  atMost: number,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "LESS_THAN_OR_EQUAL",
            value: { integerValue: String(Math.floor(atMost)) },
          },
        },
        limit: 200,
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as {
    document?: { name?: string; fields?: Record<string, Record<string, unknown>> };
  }[];
  return rows
    .filter((r) => r.document?.name)
    .map((r) => {
      const out: Record<string, unknown> = {
        id: r.document!.name!.split("/").pop(),
      };
      for (const [k, v] of Object.entries(r.document!.fields ?? {})) {
        out[k] =
          v.stringValue ??
          (v.integerValue !== undefined ? Number(v.integerValue) : undefined) ??
          v.booleanValue;
      }
      return out;
    });
}

/**
 * מחיקת קובץ מ-Storage. לעולם לא זורקת, אבל אומרת את האמת: true רק אם
 * הקובץ נמחק (או שכבר לא היה). מי שחותם "נמחק" — כמו מחיקת סרטון
 * האימות — חייב לדעת אם זה באמת קרה.
 */
export async function adminDeleteStorage(path: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${await accessToken()}` } },
    );
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * מחיקה אמיתית של חשבון וכל מה שנגזר ממנו.
 * עד כה בקשת מחיקה רק נרשמה — התקנון הבטיח "מחיקה מלאה תוך 14 יום"
 * ושום קוד לא מחק דבר. זו הפונקציה שהופכת את ההבטחה לאמת.
 */
export interface PurgeReport {
  cases: number;
  /** כל נתיב שנמחק (או שהיה נמחק, בהרצה יבשה) — לאימות לפני ואחרי. */
  paths: string[];
  storage: string[];
  dryRun: boolean;
}

/**
 * מחיקת חשבון וכל הנגזר ממנו.
 *
 * `dryRun` מדווח בדיוק מה היה נמחק בלי לגעת בכלום. זו הפעולה ההרסנית
 * ביותר במערכת ואין ממנה חזרה — ולכן חייבת להיות דרך לאמת אותה על חשבון
 * אמיתי מבלי לבצע אותה. אל תריצו אותה "רטובה" בפעם הראשונה על חשבון
 * שאכפת לכם ממנו.
 */
export async function purgeAccount(uid: string, dryRun = false): Promise<PurgeReport> {
  const paths: string[] = [];
  const storage: string[] = [];
  const del = async (path: string) => {
    paths.push(path);
    if (!dryRun) await adminDelete(path);
  };
  const delFile = async (path: string) => {
    storage.push(path);
    if (!dryRun) await adminDeleteStorage(path);
  };

  const caseIds = await adminQueryIds("cases", "clientId", uid);

  for (const id of caseIds) {
    const c = await adminGetDoc(`cases/${id}`);
    /*
     * תמונות תיק — **נשאר בכוונה אחרי שההעלאה בוטלה** (12/8/2026).
     *
     * המוצר אינו מקבל עוד קבצים, אבל תיקים שנוצרו לפני השינוי עדיין
     * נושאים את השדה, והקבצים עדיין יושבים ב-Storage. מחיקת חשבון
     * חייבת לנקות גם אותם — אחרת נשארנו עם תיעוד רפואי של אדם שביקש
     * להימחק. הקוד הזה יורד רק אחרי שנוודא שאין יותר תיקים כאלה.
     */
    const images = (c?.images as { origPath?: string; censPath?: string }[] | undefined) ?? [];
    for (const img of images) {
      if (img.origPath) await delFile(img.origPath);
      if (img.censPath) await delFile(img.censPath);
    }
    // תתי-אוספים אינם נמחקים עם המסמך ב-Firestore
    await del(`cases/${id}/memo/full`);
    for (const k of ["met", "demandSent", "filed", "closed"]) {
      await del(`cases/${id}/milestones/${k}`);
    }
    /*
     * פרטי הקשר שנחשפו לעו"ד על התיק — הם נכתבים תחת מזהה עורך הדין,
     * ולכן לא נמחקים עם מסמך התיק ולא נתפסים בשאילתה לפי clientId.
     */
    for (const lid of ((c?.interestedIds as string[] | undefined) ?? [])) {
      await del(`cases/${id}/contacts/${lid}`);
    }
    await del(`cases/${id}`);
  }

  for (const nid of await adminQueryIds("notifications", "userId", uid)) {
    await del(`notifications/${nid}`);
  }

  /*
   * דירוגים — מסמך הדירוג נושא clientId, כלומר הוא מידע אישי שנשאר
   * אחרי "מחיקה מלאה". נמחק גם כשהמשתמש הוא עורך הדין המדורג.
   */
  for (const rid of await adminQueryIds("ratings", "clientId", uid)) {
    await del(`ratings/${rid}`);
  }
  for (const rid of await adminQueryIds("ratings", "lawyerId", uid)) {
    await del(`ratings/${rid}`);
  }

  /* אירועי המשפך נושאים uid — מידע התנהגותי שחייב ללכת עם החשבון */
  for (const eid of await adminQueryIds("funnelEvents", "uid", uid)) {
    await del(`funnelEvents/${eid}`);
  }

  await del(`lawyerProfiles/${uid}`);
  await del(`lawyerContacts/${uid}`);

  /*
   * קבצי האימות — **תוקן 16/8/2026.**
   *
   * תעודת הלשכה ותעודת הבוגר יושבות ב-Storage תחת verifications/{uid}/,
   * ומחיקת מסמך ה-Firestore לבדה השאירה אותן שם לנצח. אלה מסמכי זהות
   * אישיים עם מספר רישיון ותמונה: מחיקת חשבון שמשאירה אותם אינה מחיקה,
   * והתקנון מבטיח אחרת.
   *
   * הסרטון כבר נמחק עם ההכרעה, אבל אנחנו עוברים על כל הקבצים ולא רק על
   * השניים הידועים — כדי שסוג קובץ שיתווסף בעתיד לא ידלוף בשקט. מחיקה
   * חוזרת בטוחה: adminDeleteStorage מחזיר true גם על 404.
   */
  const ver = await adminGetDoc(`verifications/${uid}`);
  for (const p of Object.values((ver?.files ?? {}) as Record<string, unknown>)) {
    if (typeof p === "string" && p) await delFile(p);
  }
  await del(`verifications/${uid}`);
  await del(`lawyerStats/${uid}`);
  await del(`usage/${uid}`);
  await del(`users/${uid}`);

  return { cases: caseIds.length, paths, storage, dryRun };
}

/**
 * כמה תיקים פתוחים מותר ללקוח בו-זמנית.
 *
 * התקרה היומית (15 ולידציות) הגנה על העלות שלנו, לא על תשומת הלב של
 * עורכי הדין: אדם אחד יכול היה לפתוח 15 תיקים ביום ולהציף את הפיד.
 * שלושה במקביל נדיבים מאוד לאדם אמיתי — לרוב יש עניין אחד — ומונעים
 * הצפה לחלוטין.
 *
 * נספרים רק תיקים שמתחרים על תשומת לב: בבדיקה, בהמתנה לעורך דין, או
 * עם התעניינות. תיק שכבר מחובר או נסגר אינו תופס מקום בפיד.
 */
/** מחיקת תיק שנוצר ולא נבדק מעולם (נחסם על התקרה). */
export async function adminDeleteCase(caseId: string): Promise<void> {
  await adminDelete(`cases/${encodeURIComponent(caseId)}`);
}

/**
 * מחיקה מלאה של תיק בודד — תת-האוספים, ההתראות, והמסמך עצמו.
 *
 * נבנה לניקוי תיקי דמו ובדיקה (17/8/2026): חשבון הבדיקה צבר תיקים
 * כמעט זהים שהצ'ק-ליסט של החנויות דורש למחוק לפני ביקורת. מחיקת
 * המסמך לבדה משאירה תזכיר, אבני דרך, חשיפות קשר והתראות יתומים —
 * לכן הרשימה כאן משקפת אחד-לאחד את הבלוק הפר-תיקי של purgeAccount.
 * אם purgeAccount לומד תת-אוסף חדש, גם הפונקציה הזו חייבת.
 *
 * הקבצים נוספו ב-17/8/2026: ההערה למעלה טענה התאמה אחד-לאחד, אבל
 * `purgeAccount` מוחק גם את תמונות התיק מ-Storage וכאן זה נשמט. תיק
 * שנוצר לפני ביטול ההעלאות עדיין נושא אותן, וזה בדיוק סוג התיק
 * שהפונקציה הזו נבנתה כדי לנקות — כלומר המחיקה הייתה משאירה מסמך
 * רפואי באחסון בלי מסמך תיק שמצביע עליו.
 */
export async function adminPurgeCase(
  caseId: string,
): Promise<{ existed: boolean; deleted: number }> {
  const id = encodeURIComponent(caseId);
  const c = await adminGetDoc(`cases/${id}`);
  if (!c) return { existed: false, deleted: 0 };

  let deleted = 0;
  const del = async (path: string) => {
    await adminDelete(path);
    deleted++;
  };

  const images = (c.images as { origPath?: string; censPath?: string }[] | undefined) ?? [];
  for (const img of images) {
    if (img.origPath) { await adminDeleteStorage(img.origPath); deleted++; }
    if (img.censPath) { await adminDeleteStorage(img.censPath); deleted++; }
  }

  await del(`cases/${id}/memo/full`);
  for (const k of ["met", "demandSent", "filed", "closed"]) {
    await del(`cases/${id}/milestones/${k}`);
  }
  for (const lid of (c.interestedIds as string[] | undefined) ?? []) {
    await del(`cases/${id}/contacts/${encodeURIComponent(lid)}`);
  }
  for (const nid of await adminQueryIds("notifications", "caseId", caseId)) {
    await del(`notifications/${nid}`);
  }
  await del(`cases/${id}`);
  return { existed: true, deleted };
}

export { MAX_OPEN_CASES, OPEN_CASE_LIMIT_ENABLED } from "../limits";
import { MAX_OPEN_CASES } from "../limits";

/*
 * פנייה שנמשכה ממשיכה להיספר שבוע.
 *
 * בלי זה המשיכה משחררת מקום מיד, והמכסה מאבדת כל משמעות: פותחים 3,
 * מושכים 3, פותחים עוד 3 — בדיוק לולאת ההצפה שהמכסה נועדה למנוע.
 * לאדם אמיתי זה בלתי מורגש: הוא משך פנייה אחת ונשארו לו שתיים.
 */
const WITHDRAWN_HOLD_MS = 7 * 24 * 60 * 60 * 1000;

const OPEN_STATUSES = ["validating", "matching", "has_interest", "withdrawn"];

/**
 * תיק שנשאר ב"בבדיקה" יותר מזה מעולם לא הושלם — הוא לא מתחרה על תשומת
 * לב של איש, ולכן אינו נספר. בלי זה תיק אחד שנתקע היה מקטין לצמיתות
 * את המכסה של אדם אמיתי.
 */
const STALE_VALIDATING_MS = 30 * 60 * 1000;

export async function countOpenCases(clientId: string): Promise<number> {
  const res = await fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "cases" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: "clientId" },
                  op: "EQUAL",
                  value: { stringValue: clientId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: "status" },
                  op: "IN",
                  value: {
                    arrayValue: {
                      values: OPEN_STATUSES.map((v) => ({ stringValue: v })),
                    },
                  },
                },
              },
            ],
          },
        },
        limit: 20,
      },
    }),
  });
  if (!res.ok) return 0; // כשל בספירה לא חוסם אדם אמיתי
  const rows = (await res.json()) as {
    document?: { fields?: Record<string, Record<string, string>> };
  }[];
  const now = Date.now();
  return rows.filter((r) => {
    if (!r.document) return false;
    const f = r.document.fields ?? {};
    const status = f.status?.stringValue;
    if (status === "withdrawn") {
      const at = Number(f.withdrawnAt?.integerValue ?? 0);
      return at > 0 && now - at < WITHDRAWN_HOLD_MS;
    }
    if (status !== "validating") return true;
    const createdAt = Number(f.createdAt?.integerValue ?? 0);
    return createdAt > 0 && now - createdAt < STALE_VALIDATING_MS;
  }).length;
}

/**
 * מתקן תיקים שסווגו בקטגוריה שהמודל המציא.
 *
 * הריצה חד-פעמית, אבל בטוחה לחזרה: תיק שכבר תקין אינו נגוע. מדווח מה
 * שונה ולאן, כדי שנראה בעיניים שהמיפוי עשה את הדבר הנכון ולא ניחש.
 */
export async function fixInventedCategories(): Promise<{
  scanned: number;
  fixed: { id: string; from: string; to: string }[];
}> {
  const { normalizeCategory, CATEGORY_SPECS } = await import("../specialties");
  const res = await fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "cases" }], limit: 500 },
    }),
  });
  if (!res.ok) return { scanned: 0, fixed: [] };
  const rows = (await res.json()) as {
    document?: { name?: string; fields?: Record<string, { stringValue?: string }> };
  }[];

  const fixed: { id: string; from: string; to: string }[] = [];
  let scanned = 0;
  for (const r of rows) {
    if (!r.document?.name) continue;
    scanned += 1;
    const id = r.document.name.split("/").pop()!;
    const from = r.document.fields?.category?.stringValue ?? "";
    if (!from || from in CATEGORY_SPECS) continue;
    const to = normalizeCategory(from);
    if (to === from) continue;
    await adminPatch(`cases/${encodeURIComponent(id)}`, { category: to });
    fixed.push({ id, from, to });
  }
  return { scanned, fixed };
}

/* ---------- מחיקה מתוזמנת ---------- */

/**
 * ימי הצינון שבין הבקשה לביצוע.
 *
 * מחיקה היא בלתי הפיכה, ולחיצה בטעות בשלוש לפנות בוקר אחרי יום קשה
 * היא תרחיש אמיתי אצל קהל שנמצא בדיוק במצב כזה. שבעה ימים שבהם
 * התחברות מבטלת — ואחריהם זה קורה מעצמו, בלי אדם בלולאה.
 */
export const DELETION_GRACE_DAYS = 7;

/**
 * מבצע כל מחיקה שהגיע זמנה.
 *
 * זו הנקודה שבה ההבטחה "אפשר למחוק הכל" הופכת ממשית: קודם היא הייתה
 * בקשה בתור שאדם מבצע ידנית, וכל תור כזה נדחה בשבוע עמוס ונשכח בחודש
 * עמוס. מה שאנחנו מחזיקים כאן — תיאור פגיעה, תמונות, תזכיר משפטי —
 * הוא מהרגיש שיש, ולכן החזקה מיותרת שלו היא סיכון בלי שום תמורה.
 *
 * בטוח להרצה חוזרת: כל בקשה מסומנת done לפני שהיא נספרת, ומחיקה
 * שנכשלה נשארת פתוחה לריצה הבאה במקום להיעלם בשקט.
 */
export async function runDueDeletions(
  now = Date.now(),
): Promise<{ processed: number; failed: number }> {
  const due = await adminQueryDue("deletionRequests", "scheduledFor", now);
  let processed = 0;
  let failed = 0;
  for (const req of due) {
    if (req.status !== "scheduled") continue;
    try {
      await purgeAccount(req.userId as string);
      await adminPatch(`deletionRequests/${req.id}`, {
        status: "done",
        purgedAt: now,
      });
      processed += 1;
    } catch {
      /*
       * נשארת פתוחה בכוונה — כשל שמסמן "done" הוא מחיקה שהמשתמש
       * התבשר עליה ולא קרתה. עדיף שתנסה שוב מחר.
       */
      failed += 1;
    }
  }
  return { processed, failed };
}

/**
 * סריקה אופורטוניסטית — המחיקות מתבצעות בלי שום תשתית חיצונית.
 *
 * נקודת הקצה /__cron/deletions קיימת ומוכנה ל-Cloud Scheduler, אבל
 * "שכחנו להקים את הקרון" היא תקלה שקורית — והתוצאה שלה כאן היא
 * מחיקות שמצטברות בשקט אחרי שהבטחנו למשתמשים שהן יקרו. לכן ברירת
 * המחדל אינה תלויה באף הגדרה: כל בקשה לשרת בודקת בזול אם עבר יום,
 * ואם כן — מריצה.
 *
 * שני מנעולים כדי שזה לא ירוץ פעמיים במקביל:
 *   בזיכרון — מגביל את *הבדיקה* עצמה לפעם בשעה לכל מופע, כך שאיננו
 *   קוראים מהמסד בכל בקשה.
 *   במסד — התביעה נכתבת לפני הריצה, כך ששני מופעים שהתעוררו יחד
 *   אינם מוחקים פעמיים.
 */
const SWEEP_DOC = "system/deletionSweep";
const SWEEP_EVERY_MS = 24 * 60 * 60 * 1000;
let lastLocalCheck = 0;

export async function sweepDeletionsIfDue(now = Date.now()): Promise<boolean> {
  if (now - lastLocalCheck < 60 * 60 * 1000) return false;
  lastLocalCheck = now;
  try {
    const cur = await adminGetDoc(SWEEP_DOC);
    const last = Number(cur?.lastRunAt ?? 0);
    if (now - last < SWEEP_EVERY_MS) return false;
    // תובעים לפני שמריצים — שני מופעים שהתעוררו יחד לא ירוצו שניהם
    await adminPatch(SWEEP_DOC, { lastRunAt: now });
    await runDueDeletions(now);
    return true;
  } catch {
    /* סריקה שנכשלה תנסה שוב מחר; לעולם לא מפילה בקשה של משתמש */
    return false;
  }
}

/* ---------- הגבלת קצב ---------- */

/**
 * תקרה יומית לכל משתמש, פר-פעולה.
 * שלוש פונקציות ה-AI פתוחות לכל חשבון גוגל, ו-intakeTurn שולח את כל
 * התמליל בכל תור — לולאה מתוסרטת מייצרת עלות ריבועית. המונה נשמר בשרת
 * בלבד; חוקי המסד אוסרים כתיבה מהדפדפן, כך שאי אפשר לאפס אותו.
 */
const DAILY_CAPS: Record<string, number> = {
  intakeTurn: 120,
  validateCase: 15,
  detectRegions: 30,
};

export async function enforceDailyCap(uid: string, action: string): Promise<void> {
  const cap = DAILY_CAPS[action];
  if (!cap) return;
  const day = new Date().toISOString().slice(0, 10);
  const path = `usage/${encodeURIComponent(uid)}`;
  let used = 0;
  try {
    const cur = (await adminGetDoc(path)) ?? {};
    if (cur.day === day) used = Number(cur[action] ?? 0);
    const next: Record<string, string | number | boolean> = { day };
    next[action] = used + 1;
    // יום חדש מאפס את שאר המונים בפעם הראשונה שנוגעים בהם
    await adminPatch(path, next);
  } catch {
    // כשל במונה לא יחסום משתמש אמיתי
    return;
  }
  if (used >= cap) {
    throw new Error(`daily cap reached for ${action}`);
  }
}

/* ---------- הזמנת עורכי דין (בשרת) ---------- */

/** התראה למשתמש — נכתבת בהרשאות שרת. */
export async function adminNotify(
  userId: string,
  n: { type: string; title: string; body: string; caseId?: string },
): Promise<void> {
  const fields: Record<string, FsValue> = {
    userId: { stringValue: userId },
    type: { stringValue: n.type },
    title: { stringValue: n.title },
    body: { stringValue: n.body },
    read: { booleanValue: false },
    createdAt: { integerValue: String(Date.now()) },
  };
  if (n.caseId) fields.caseId = { stringValue: n.caseId };
  await fetch(`${DOCS}/notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
}

/**
 * אותה התראה לרשימת נמענים — בבקשה אחת במקום אחת לכל נמען.
 *
 * הקוד הקודם עשה `Promise.all` על התוצאה של adminApprovedLawyerIds,
 * שמחזירה **עד 500** עורכי דין. כלומר בקשה אחת של לקוח פתחה עד 500
 * חיבורי HTTPS מקבילים ממכונה עם CPU אחד ו-512MB — **והלקוח המתין
 * לכולם** לפני שקיבל תשובה.
 *
 * עם עורך דין אחד זה בלתי נראה. עם רשימת המתנה מלאה זה הופך כל תיק
 * מאושר לפרץ, בדיוק בזמן שקמפיין שיווקי מביא תנועה. זה לא כשל שמתגלה
 * בהדרגה — הוא מופיע ביום הראשון שיש בו גם עורכי דין וגם תנועה.
 *
 * `:batchWrite` ב-Firestore מקבל עד 500 כתיבות בקריאה אחת, כלומר בדיוק
 * התקרה של השאילתה. החלוקה לקבוצות נשארת בכל זאת — התקרה של השאילתה
 * עשויה לעלות יום אחד, ומגבלת ה-API לא.
 */
export const BATCH_MAX = 500;

export interface NotifyWrite {
  update: { name: string; fields: Record<string, FsValue> };
}

/**
 * בניית הכתיבות והחלוקה לקבוצות — טהורה, כדי שתהיה ניתנת לבדיקה.
 *
 * שלושה דברים חייבים להתקיים כאן, ולכולם יש בדיקה:
 * · אף קבוצה אינה חורגת מ-500 — זו מגבלת ה-API, וחריגה נכשלת בשלמותה.
 * · אף נמען אינו נופל בין הקבוצות.
 * · **המזהים ייחודיים.** ל-batchWrite אין "צור עם מזהה אוטומטי" וכל
 *   כתיבה חייבת נתיב מלא. שני מזהים זהים באותה קבוצה אינם שגיאה —
 *   הם דורסים זה את זה בשקט, ועורך דין אחד פשוט לא מקבל התראה.
 */
export function buildNotifyWrites(
  userIds: readonly string[],
  n: { type: string; title: string; body: string; caseId?: string },
  now: number = Date.now(),
): NotifyWrite[][] {
  const chunks: NotifyWrite[][] = [];
  for (let i = 0; i < userIds.length; i += BATCH_MAX) {
    const chunk = userIds.slice(i, i + BATCH_MAX).map((userId, j) => {
      const fields: Record<string, FsValue> = {
        userId: { stringValue: userId },
        type: { stringValue: n.type },
        title: { stringValue: n.title },
        body: { stringValue: n.body },
        read: { booleanValue: false },
        createdAt: { integerValue: String(now) },
      };
      if (n.caseId) fields.caseId = { stringValue: n.caseId };
      /*
       * המיקום ברשימה (i+j) נכנס למזהה ולא רק אקראיות: הוא מבטיח ייחודיות
       * בתוך הקבוצה בוודאות ולא בהסתברות.
       */
      const id = `${now.toString(36)}${(i + j).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      return { update: { name: `${DOCS}/notifications/${id}`, fields } };
    });
    chunks.push(chunk);
  }
  return chunks;
}

export async function adminNotifyMany(
  userIds: string[],
  n: { type: string; title: string; body: string; caseId?: string },
): Promise<void> {
  if (!userIds.length) return;
  const token = await accessToken();

  for (const writes of buildNotifyWrites(userIds, n)) {
    const res = await fetch(`${DOCS}:batchWrite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) {
      throw new Error(`batchWrite failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
    }
  }
}

/**
 * עורכי הדין *המאושרים* שהתיק בתחום שלהם.
 *
 * שתי טעויות היו כאן קודם. הראשונה: הפיצוץ רץ מול כל lawyerProfiles —
 * כולל מי שטרם אושר — ומהדפדפן של הלקוח, כך שסגירת טאב פירושה שאף עורך
 * דין לא נודע על התיק. השנייה, שנולדה בתיקון הראשונה: הסינון לפי תחום
 * נשאר בדפדפן ולא הועבר לכאן, ולכן *כל* עורך דין מאושר קיבל *כל* תיק.
 * עורך דין שמקבל תיק נזיקין שלישי כשהוא רשום לרשלנות רפואית מכבה התראות.
 *
 * מסמך verifications כבר מכיל specialties, ולכן הסינון נעשה על התשובה
 * ולא בשאילתה — array-contains-any יחד עם שוויון היה דורש אינדקס מורכב,
 * וכשל אינדקס כאן פירושו שאף אחד לא מקבל התראה.
 */
export async function adminApprovedLawyerIds(category?: string): Promise<string[]> {
  const { categoryMatchesSpecialties } = await import("../specialties");
  const res = await fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "verifications" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "approved" },
          },
        },
        limit: 500,
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as {
    document?: { name?: string; fields?: Record<string, FsValue> };
  }[];
  return rows
    .filter((r) => {
      if (!category) return true;
      const specs = decode(r.document?.fields?.specialties);
      // עו"ד שאין לו תחומים כלל (רשומה ישנה) ממשיך לקבל הכל — עדיף
      // מלהשתיק אותו בשקט בלי שידע
      if (!Array.isArray(specs) || specs.length === 0) return true;
      return categoryMatchesSpecialties(category, specs as string[]);
    })
    .map((r) => r.document?.name?.split("/").pop())
    .filter((x): x is string => !!x);
}

/**
 * ספירת התיקים הפתוחים לפי תחום — בלי שום תוכן.
 *
 * עורך דין שטרם אומת אינו רשאי לקרוא תיקים, וזה נכון: אין סיבה שזר
 * לא-מאומת יראה את המקרה של אדם אמיתי. אבל מסך ריק לגמרי גם לא נכון —
 * הוא נראה כמו מוצר מת בדיוק ברגע שבו עורך הדין מחליט אם להשקיע
 * בהשלמת האימות.
 *
 * מספרים בלבד עוברים את שני התנאים: אפס מידע אישי, והוכחה שיש כאן עבודה.
 */
export async function adminOpenCaseCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "cases" }],
        // רק הקטגוריה והתאריך — אין סיבה למשוך תיאורי מקרים לזיכרון
        select: { fields: [{ fieldPath: "category" }, { fieldPath: "createdAt" }] },
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "IN",
            value: {
              arrayValue: {
                values: [{ stringValue: "matching" }, { stringValue: "has_interest" }],
              },
            },
          },
        },
        limit: 500,
      },
    }),
  });
  if (!res.ok) return {};
  const rows = (await res.json()) as { document?: { fields?: Record<string, FsValue> } }[];
  // אותו חלון של 30 יום כמו בפיד — אחרת נציג תיקים שממילא לא יופיעו
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const out: Record<string, number> = {};
  for (const r of rows) {
    const f = r.document?.fields;
    if (!f) continue;
    const at = Number(decode(f.createdAt) ?? 0);
    if (at < cutoff) continue;
    const cat = String(decode(f.category) ?? "").trim();
    if (!cat) continue;
    out[cat] = (out[cat] ?? 0) + 1;
  }
  return out;
}

/* ---------- יומן שגיאות שרת ---------- */

/**
 * רישום כשל של פונקציית שרת ל-Firestore, כדי שיופיע במשרד הטכנולוגי.
 * נחוץ כי stdout/stderr של האפליקציה אינם מגיעים ל-Cloud Logging, והשגיאה
 * מגיעה ללקוח מעורפלת ("Seroval Error") — בלי זה כשל שקט אינו ניתן לאבחון.
 * הרישום עצמו לעולם לא מפיל את הבקשה.
 */
export async function logServerError(context: string, err: unknown): Promise<void> {
  try {
    const body = {
      fields: {
        context: { stringValue: context },
        message: { stringValue: err instanceof Error ? err.message : String(err) },
        at: { integerValue: String(Date.now()) },
        handled: { booleanValue: false },
      },
    };
    await fetch(`${DOCS}/serverErrors`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    /* יומן שנכשל לא ישבור את הפעולה עצמה */
  }
}

/** עוטף מנוע שרת ברישום שגיאות ומחזיר את השגיאה הלאה. */
export async function withErrorLog<T>(context: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    await logServerError(context, e);
    throw e;
  }
}

/* ---------- Storage REST ---------- */

/** הורדת תמונה כ-base64 עבור הזנת ראיות לוולידציה. null כשנכשל או גדול מדי. */
export async function downloadImageBase64(path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`,
      { headers: { Authorization: `Bearer ${await accessToken()}` } },
    );
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3 * 1024 * 1024) return null;
    return Buffer.from(buf).toString("base64");
  } catch {
    return null;
  }
}

/* ---------- הודעת השקה לרשימת ההמתנה ---------- */

/**
 * מודיע לכל מי שהשאיר פרטים בדף הנחיתה שהאפליקציה באוויר.
 *
 * **מייל ולא פוש, ואין ברירה אחרת.** התראת פלאפון דורשת אפליקציה
 * מותקנת והרשאה שניתנה — לאנשים האלה אין אף אחת מהשתיים; הם מילאו
 * טופס באתר. מייל הוא הערוץ היחיד שבאמת מגיע אליהם.
 *
 * **מסומן פר-נמען ולא פר-הרצה.** `launchNotifiedAt` נכתב על כל ליד
 * מיד אחרי ששליחתו הצליחה, ולכן הרצה שנפלה באמצע ממשיכה מהנקודה שבה
 * עצרה במקום להתחיל מהתחלה. הרצה שנייה על רשימה שכבר טופלה אינה
 * שולחת דבר — וזה הדבר היחיד שמונע מעורך דין לקבל את אותה הודעה
 * פעמיים ולמחוק אותנו כספאם ביום שהכי חשוב לנו.
 */
export async function announceLaunch(
  link: string,
): Promise<{ sent: number; skipped: number; failed: number }> {
  const res = await fetch(`${DOCS}/lawyerLeads?pageSize=500`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!res.ok) throw new Error(`leads read failed: ${res.status}`);
  const data = (await res.json()) as {
    documents?: { name: string; fields?: Record<string, FsValue> }[];
  };

  let sent = 0, skipped = 0, failed = 0;
  for (const doc of data.documents ?? []) {
    const f = doc.fields ?? {};
    const email = (decode(f.email) as string | undefined) ?? "";
    const name = (decode(f.fullName) as string | undefined) ?? "";
    if (!email || decode(f.launchNotifiedAt) !== undefined) {
      skipped++;
      continue;
    }
    const outcome = await sendMailTo(email, {
      title: "JustAsk באוויר — האפליקציה שלך מחכה",
      body:
        `${name ? name + ", " : ""}האפליקציה עלתה לאוויר. ` +
        "הפניות שתראו כבר עברו בדיקה ראשונית, והן בתחומים שסימנתם בלבד. " +
        "חצי השנה הראשונה ללא תשלום, כפי שהובטח.",
      link,
      cta: "כניסה לאפליקציה",
    });
    if (outcome === "sent") {
      sent++;
      /*
       * הסימון נכתב רק אחרי שליחה מוצלחת. סימון מראש היה "מגן" מפני
       * כפילות במחיר גרוע יותר: מי שהמייל אליו נכשל לא היה מקבל שוב
       * לעולם.
       */
      const id = doc.name.split("/").pop() ?? "";
      await adminPatch(`lawyerLeads/${id}`, { launchNotifiedAt: Date.now() }).catch(() => undefined);
    } else {
      failed++;
    }
  }
  return { sent, skipped, failed };
}
