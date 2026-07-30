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

async function accessToken(): Promise<string> {
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
 * שליחת התראה לכל המכשירים של משתמש.
 * לעולם לא זורקת — התראה שנכשלה לא אמורה להפיל את הפעולה שיצרה אותה.
 * ההתראה נשלחת כ-data בלבד, כדי שה-service worker יציג אותה בעברית (dir=rtl).
 */
export async function sendPush(
  uid: string,
  msg: { title: string; body: string; link?: string },
  topic?: "caseUpdates" | "lawyerInterest",
): Promise<void> {
  try {
    const user = await adminGetUser(uid);
    if (!user) return;
    // העדפה שכובתה מכבדת את המשתמש; ברירת המחדל היא לשלוח
    if (topic && user[topic] === false) return;
    const tokens = (user.pushTokens as string[] | undefined) ?? [];
    if (!tokens.length) return;

    const token = await accessToken();
    await Promise.all(
      tokens.slice(0, 10).map((t) =>
        fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token: t,
              data: { title: msg.title, body: msg.body, link: msg.link ?? "/" },
              webpush: { headers: { Urgency: "high" } },
            },
          }),
        }).catch(() => undefined),
      ),
    );
  } catch {
    /* התראה היא תוספת, לא תנאי */
  }
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

async function adminDeleteStorage(path: string): Promise<void> {
  await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${await accessToken()}` } },
  ).catch(() => undefined);
}

/**
 * מחיקה אמיתית של חשבון וכל מה שנגזר ממנו.
 * עד כה בקשת מחיקה רק נרשמה — התקנון הבטיח "מחיקה מלאה תוך 14 יום"
 * ושום קוד לא מחק דבר. זו הפונקציה שהופכת את ההבטחה לאמת.
 */
export async function purgeAccount(uid: string): Promise<{ cases: number }> {
  const caseIds = await adminQueryIds("cases", "clientId", uid);

  for (const id of caseIds) {
    const c = await adminGetDoc(`cases/${id}`);
    const images = (c?.images as { origPath?: string; censPath?: string }[] | undefined) ?? [];
    for (const img of images) {
      if (img.origPath) await adminDeleteStorage(img.origPath);
      if (img.censPath) await adminDeleteStorage(img.censPath);
    }
    // תתי-אוספים אינם נמחקים עם המסמך ב-Firestore
    await adminDelete(`cases/${id}/memo/full`);
    for (const k of ["met", "demandSent", "filed", "closed"]) {
      await adminDelete(`cases/${id}/milestones/${k}`);
    }
    await adminDelete(`cases/${id}`);
  }

  for (const nid of await adminQueryIds("notifications", "userId", uid)) {
    await adminDelete(`notifications/${nid}`);
  }

  await adminDelete(`lawyerProfiles/${uid}`);
  await adminDelete(`lawyerContacts/${uid}`);
  await adminDelete(`verifications/${uid}`);
  await adminDelete(`lawyerStats/${uid}`);
  await adminDelete(`usage/${uid}`);
  await adminDelete(`users/${uid}`);

  return { cases: caseIds.length };
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
