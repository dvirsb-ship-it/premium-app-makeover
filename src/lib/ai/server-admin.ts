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
  const data = (await res.json()) as { users?: { localId?: string }[] };
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new Error("unauthenticated: token has no user");
  return uid;
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
