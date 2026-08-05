/**
 * התראות דחיפה (FCM Web Push).
 * הרשאת הדפדפן נדרשת ולכן ההפעלה חייבת לצאת מלחיצה של המשתמש.
 * הטוקן נשמר על מסמך המשתמש; השרת שולח אליו.
 */
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { fbDb } from "./firebase";
import { isNativeApp } from "./native";

const VAPID_KEY =
  "BCscZD1BTgvJOYEpfHyyTI-4fm6PtSTrHZjt2tGgNuVSTO22PvLs2uMcb3rV4sU-0mx3wIADwyAym2JPdbE_gJU";

const TOKEN_CACHE = "justask-push-token";

export type PushSupport = "ready" | "denied" | "unsupported";

/** האם הסביבה הזו מסוגלת בכלל לקבל התראות. */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  /*
   * באפליקציה מקורית אין service worker ואין אובייקט Notification —
   * ההרשאה נשאלת דרך המערכת. הבדיקה של הדפדפן הייתה מחזירה כאן
   * "unsupported" ומכבה את ההתראות בדיוק במקום שבו הן עובדות הכי טוב.
   */
  if (isNativeApp()) return "ready";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ready";
}

export function pushEnabledLocally(): boolean {
  try {
    return !!localStorage.getItem(TOKEN_CACHE);
  } catch {
    return false;
  }
}

/**
 * מבקש הרשאה, רושם את ה-service worker ושומר את הטוקן על המשתמש.
 * מחזיר false אם המשתמש סירב או שהדפדפן אינו תומך.
 */
export async function enablePush(uid: string): Promise<boolean> {
  if (pushSupport() !== "ready") return false;
  if (isNativeApp()) return enableNativePush(uid);

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const { getMessaging, getToken } = await import("firebase/messaging");
  // אתחול אחד לכל האפליקציה — config כפול כאן נתן פעם app עם authDomain שגוי
  const { fbApp } = await import("./firebase");
  const app = fbApp();

  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;

  await updateDoc(doc(fbDb(), "users", uid), { pushTokens: arrayUnion(token) });
  try {
    localStorage.setItem(TOKEN_CACHE, token);
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * המסלול של אפליקציה מקורית.
 *
 * ב-iOS אין Web Push בתוך אפליקציה: המערכת מוסרת התראות דרך APNs.
 * התוסף מבקש את ההרשאה מהמערכת, נרשם ב-APNs, ומחליף את הטוקן בטוקן
 * FCM — ולכן השרת ממשיך לשלוח בדיוק אותו דבר, לאותו שדה, בלי שום
 * ידיעה על איזה מכשיר מדובר. זו הנקודה: מסלול אחד בשרת, שניים בלקוח.
 */
async function enableNativePush(uid: string): Promise<boolean> {
  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== "granted") return false;

    const { token } = await FirebaseMessaging.getToken();
    if (!token) return false;

    await updateDoc(doc(fbDb(), "users", uid), { pushTokens: arrayUnion(token) });
    try {
      localStorage.setItem(TOKEN_CACHE, token);
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    /* התראות הן תוספת — כשל כאן לא שובר את האפליקציה */
    return false;
  }
}

/** מסיר את הטוקן של המכשיר הזה. הרשאת הדפדפן עצמה נשארת — רק אנחנו מפסיקים לשלוח. */
export async function disablePush(uid: string): Promise<void> {
  let token = "";
  try {
    token = localStorage.getItem(TOKEN_CACHE) ?? "";
    localStorage.removeItem(TOKEN_CACHE);
  } catch {
    /* ignore */
  }
  if (token) {
    await updateDoc(doc(fbDb(), "users", uid), { pushTokens: arrayRemove(token) });
  }
}
