/**
 * Firebase client init — JustAsk (project: justask-6bfb9).
 * SSR-safe: services are created lazily and only in the browser.
 * Config values are public by design; security lives in Security Rules.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config);
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
