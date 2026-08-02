/**
 * Firebase client init — JustAsk (project: justask-6bfb9).
 * SSR-safe: services are created lazily and only in the browser.
 * Config values are public by design; security lives in Security Rules.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/*
 * authDomain — תמיד הדומיין שהמשתמש גולש בו כרגע.
 *
 * ה-auth handler מוגש בפרוקסי מכל דומיין של האפליקציה (server.ts), ולכן
 * הוא תמיד יכול להיות same-origin. כשהוא דומיין אחר — למשל גלישה מ-
 * justask.co.il עם authDomain על hosted.app — ספארי חוסם את האחסון שלו
 * כצד-שלישי וההתחברות לא חוזרת. הערך מה-env נשאר לפיתוח מקומי (הדפדפן
 * ב-http ו-SDK מניח https) ול-SSR, שם ממילא אין התחברות.
 *
 * התלות: כל דומיין כזה חייב להופיע גם ב-Authorized domains של Firebase
 * Auth וגם כ-redirect URI ב-OAuth client — אחרת גוגל דוחה את ההפניה.
 */
const liveAuthDomain =
  typeof window !== "undefined" && import.meta.env.PROD
    ? window.location.host
    : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string);

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: liveAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config);
}

/** ה-app היחיד של הלקוח — לכל מי שצריך אתחול מחוץ לקובץ הזה (push). */
export function fbApp(): FirebaseApp {
  return app();
}

export function fbAuth(): Auth {
  return getAuth(app());
}

export function fbDb(): Firestore {
  return getFirestore(app());
}

export function fbStorage(): FirebaseStorage {
  return getStorage(app());
}

export const isBrowser = typeof window !== "undefined";
