/**
 * התראות דחיפה (FCM Web Push).
 * הרשאת הדפדפן נדרשת ולכן ההפעלה חייבת לצאת מלחיצה של המשתמש.
 * הטוקן נשמר על מסמך המשתמש; השרת שולח אליו.
 */
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { fbDb } from "./firebase";

const VAPID_KEY =
  "BCscZD1BTgvJOYEpfHyyTI-4fm6PtSTrHZjt2tGgNuVSTO22PvLs2uMcb3rV4sU-0mx3wIADwyAym2JPdbE_gJU";

const TOKEN_CACHE = "justask-push-token";

export type PushSupport = "ready" | "denied" | "unsupported";

/** האם הדפדפן הזה מסוגל בכלל לקבל התראות. */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
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
