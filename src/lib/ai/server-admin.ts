/**
 * Firebase Admin — צד שרת בלבד (נטען רק מתוך createServerFn).
 * על App Hosting האתחול משתמש ב-Application Default Credentials של Cloud Run.
 */
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const BUCKET = "justask-6bfb9.firebasestorage.app";

function adminApp(): App {
  return getApps()[0] ?? initializeApp({ storageBucket: BUCKET });
}

/** אימות טוקן ההתחברות של הפונה — כל פונקציות ה-AI דורשות משתמש מחובר. */
export async function requireUser(idToken: string | undefined): Promise<string> {
  if (!idToken) throw new Error("unauthenticated");
  const decoded = await getAuth(adminApp()).verifyIdToken(idToken);
  return decoded.uid;
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

/** הורדת תמונה מה-Storage כ-base64 — עבור הזנת ראיות לוולידציה. */
export async function downloadImageBase64(path: string): Promise<string | null> {
  try {
    const [buf] = await getStorage(adminApp()).bucket(BUCKET).file(path).download();
    if (buf.length > 3 * 1024 * 1024) return null;
    return buf.toString("base64");
  } catch {
    return null;
  }
}
