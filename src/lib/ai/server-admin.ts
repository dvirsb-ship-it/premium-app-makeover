/**
 * Firebase Admin — צד שרת בלבד (נטען רק מתוך createServerFn).
 * על App Hosting האתחול משתמש ב-Application Default Credentials של Cloud Run.
 */
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const PROJECT_ID = "justask-6bfb9";
const BUCKET = "justask-6bfb9.firebasestorage.app";

function adminApp(): App {
  // projectId מפורש — App Hosting לא בהכרח מגדיר GOOGLE_CLOUD_PROJECT,
  // ובלעדיו verifyIdToken נכשל כי אין מול מה לאמת את ה-audience.
  return getApps()[0] ?? initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
}

/** אימות טוקן ההתחברות של הפונה — כל פונקציות ה-AI דורשות משתמש מחובר. */
export async function requireUser(idToken: string | undefined): Promise<string> {
  if (!idToken) throw new Error("unauthenticated: missing id token");
  try {
    const decoded = await getAuth(adminApp()).verifyIdToken(idToken);
    return decoded.uid;
  } catch (e) {
    // הודעת השגיאה נבלעת בדרך ללקוח — בלי הלוג הזה אי אפשר לאבחן בענן
    console.error("[auth] verifyIdToken failed:", e instanceof Error ? e.message : e);
    throw e;
  }
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
