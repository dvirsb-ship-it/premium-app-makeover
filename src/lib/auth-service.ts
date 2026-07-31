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
    await signInWithRedirect(fbAuth(), provider);
    return null;
  }
  return signInWithPopup(fbAuth(), provider);
}

/**
 * קליטת החזרה מהפניית ההתחברות.
 *
 * נקראת פעם אחת בעליית האפליקציה. לעולם לא זורקת: כשלון כאן אינו
 * אמור למנוע מהאפליקציה לעלות — המשתמש פשוט יראה את מסך ההתחברות.
 */
export async function consumeRedirectSignIn(): Promise<void> {
  try {
    await getRedirectResult(fbAuth());
  } catch {
    /* ההתחברות פשוט לא הושלמה */
  }
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
  let digits = raw.replace(/[^\d+]/g, "");
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
