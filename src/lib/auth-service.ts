/**
 * שירותי ההתחברות של JustAsk — Firebase Auth אמיתי.
 * גוגל (popup), אימייל (קישור התחברות ללא סיסמה), טלפון (SMS + reCAPTCHA שקוף).
 */
import {
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
  getRedirectResult,
  signInWithRedirect,
  type UserCredential,
} from "firebase/auth";
import { fbAuth } from "./firebase";

const EMAIL_KEY = "justask-auth-email";

/*
 * סימון שיצאנו להפניית התחברות.
 *
 * בלעדיו אין הבדל בין "המשתמש פשוט פתח את האפליקציה ואינו מחובר" לבין
 * "המשתמש חזר מגוגל וההתחברות נפלה בשקט". שניהם נראים כמו מסך התחברות,
 * והמשתמש לוחץ שוב, ושוב — זו הלולאה שדווחה.
 *
 * ב-localStorage ולא ב-sessionStorage: ב-PWA של iOS ההפניה עלולה לפתוח
 * הקשר גלישה חדש, ואז sessionStorage נמחק — כלומר דווקא במקרה שבו הכי
 * חשוב לזהות כשל, הסימון היה נעלם והמסך היה שותק שוב.
 */
const REDIRECT_FLAG = "justask-auth-redirect-at";

/** אחרי זה הניסיון כבר אינו רלוונטי, ואין להציג עליו שגיאה. */
const REDIRECT_STALE_MS = 10 * 60 * 1000;

/**
 * האם להשתמש בהפניה במקום בחלון קופץ.
 *
 * ב-PWA שמותקנת למסך הבית iOS אינו יכול לפתוח חלון בתוך האפליקציה,
 * ולכן פותח את גוגל בספארי — והאפליקציה נשארת מאחור. מהמשתמש זה נראה
 * כאילו היא נעלמה. גם בדפדפן נייד רגיל התנהגות הפופאפ עלובה.
 * בדסקטופ הפופאפ עדיף: הוא לא מוציא את המשתמש מהעמוד.
 */
function prefersRedirect(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mobile = /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent);
  return standalone || mobile;
}

/**
 * התחברות עם גוגל.
 *
 * בהפניה הדפדפן עוזב את העמוד ולכן אין ערך מוחזר — החזרה מטופלת
 * ע"י consumeRedirectSignIn ו-onAuthStateChanged.
 */
export async function signInGoogle(): Promise<UserCredential | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  if (prefersRedirect()) {
    try {
      localStorage.setItem(REDIRECT_FLAG, String(Date.now()));
    } catch {
      /* מצב פרטי — נוותר על האבחון, לא על ההתחברות */
    }
    await signInWithRedirect(fbAuth(), provider);
    return null;
  }
  return signInWithPopup(fbAuth(), provider);
}

export type RedirectOutcome =
  /** לא חזרנו מהפניה — פתיחה רגילה של האפליקציה */
  | { status: "none" }
  /** חזרנו מהפניה והמשתמש מחובר */
  | { status: "completed" }
  /** יצאנו להפניה וחזרנו בלי חשבון מחובר — חייבים לומר זאת ולא לשתוק */
  | { status: "failed" };

/** ממתין להבטחה, ומוותר אחריה — כדי שכשל רשת לא יתקע את עליית האפליקציה. */
async function withDeadline<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    p,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

/**
 * קליטת החזרה מהפניית ההתחברות.
 *
 * נקראת פעם אחת בעליית האפליקציה, ו**חייבים להמתין לה** לפני שמכריזים
 * שהמשתמש אינו מחובר: אחרת onAuthStateChanged יורה null לפני שההפניה
 * נקלטה, האפליקציה תשלח אותו למסך ההתחברות, והוא ילחץ שוב — לולאה.
 *
 * לעולם אינה זורקת ולעולם אינה תלויה: כשל כאן אינו אמור למנוע
 * מהאפליקציה לעלות.
 */
export async function consumeRedirectSignIn(): Promise<RedirectOutcome> {
  let pending = false;
  try {
    const at = Number(localStorage.getItem(REDIRECT_FLAG) ?? 0);
    pending = at > 0 && Date.now() - at < REDIRECT_STALE_MS;
    localStorage.removeItem(REDIRECT_FLAG);
  } catch {
    /* ignore */
  }

  const auth = fbAuth();
  try {
    const cred = await withDeadline(getRedirectResult(auth), 12_000);
    if (cred?.user) return { status: "completed" };
  } catch {
    /* נופל להכרעה למטה */
  }

  // ייתכן שה-SDK כבר קלט את המשתמש בלי להחזיר credential (למשל אחרי
  // פסק הזמן) — זה עדיין הצלחה, ואסור להציג עליה שגיאה.
  if (auth.currentUser) return { status: "completed" };
  return pending ? { status: "failed" } : { status: "none" };
}

/** Apple — ידרוש הגדרת ספק בקונסולה (חשבון Apple Developer). */
export async function signInApple(): Promise<UserCredential> {
  const provider = new OAuthProvider("apple.com");
  return signInWithPopup(fbAuth(), provider);
}

export async function sendEmailLink(email: string): Promise<void> {
  const addr = email.trim().toLowerCase();
  await sendSignInLinkToEmail(fbAuth(), addr, {
    url: `${window.location.origin}/auth`,
    handleCodeInApp: true,
  });
  try {
    localStorage.setItem(EMAIL_KEY, addr);
  } catch {
    /* ignore */
  }
}

/** משלים התחברות אם הגענו מקישור אימייל. מחזיר true אם הושלמה. */
export async function completeEmailLinkIfPresent(): Promise<boolean> {
  const auth = fbAuth();
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return false;
  let email = "";
  try {
    email = localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    /* ignore */
  }
  if (!email) {
    email = window.prompt("לאישור זהותך, הזינו את כתובת האימייל שאליה נשלח הקישור:") ?? "";
  }
  if (!email) return false;
  await signInWithEmailLink(auth, email.trim().toLowerCase(), href);
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* ignore */
  }
  // נקה את פרמטרי הקישור מהכתובת
  window.history.replaceState({}, "", window.location.pathname);
  return true;
}

/** נרמול מספר ישראלי ל-E.164 (05X… → +9725X…). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return `+972${digits}`;
}

let recaptcha: RecaptchaVerifier | null = null;

/** שליחת SMS עם קוד — reCAPTCHA שקוף על אלמנט העוגן. */
export async function startPhoneSignIn(
  rawPhone: string,
  anchorId: string,
): Promise<ConfirmationResult> {
  const auth = fbAuth();
  if (!recaptcha) {
    recaptcha = new RecaptchaVerifier(auth, anchorId, { size: "invisible" });
  }
  try {
    return await signInWithPhoneNumber(auth, normalizePhone(rawPhone), recaptcha);
  } catch (e) {
    // reCAPTCHA שנשרף חייב איפוס לפני ניסיון נוסף
    try {
      recaptcha.clear();
    } catch {
      /* ignore */
    }
    recaptcha = null;
    throw e;
  }
}
