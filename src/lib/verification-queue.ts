/**
 * תור אימות עורכי הדין — Firestore + Storage אמיתיים.
 * המסמכים (רישיון לשכה, תעודת בוגר) נשמרים ב-Storage תחת verifications/{uid}/
 * והבקשה עצמה ב-verifications/{uid} — מסמך אחד לעו"ד (הגשה חוזרת מעדכנת אותו).
 */
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, uploadString } from "firebase/storage";
import { fbAuth, fbDb, fbStorage } from "./firebase";
import { notify } from "./db";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationRecord {
  id: string; // ה-uid של עורך הדין
  fullName: string;
  idNumber: string;
  email: string;
  phone: string;
  barNumber: string;
  barYear: string;
  university: string;
  gradYear: string;
  specialties: string[];
  /** שפות שבהן עורך הדין נותן שירות — נשמר גם כאן, כדי שהאדמין יראה. */
  languages?: string[];
  otherSpecialty?: string;
  submittedAt: number;
  status: VerificationStatus;
  reviewedAt?: number;
  /*
   * הבדיקה הידנית מול פנקס לשכת עורכי הדין.
   *
   * אין דרך אוטומטית: המאגר הפתוח מכיל שמות וכתובות בלבד — בלי מספרי
   * רישיון ובלי סטטוס — והפנקס החי חסום לגישה תוכניתית. לכן האימות
   * נעשה בעיניים, וכאן נרשם שהוא נעשה, מתי ועל ידי מי. זו התשובה
   * לשאלה "על סמך מה אישרת את האדם הזה".
   */
  registryCheckedAt?: number;
  registryCheckedBy?: string;
  files?: { barCard?: string; diploma?: string; selfieVideo?: string };
  /**
   * הסרטון נמחק מה-Storage אחרי ההחלטה. תיעוד ביומטרי נשמר רק כמה
   * שצריך: ברגע שההשוואה נעשתה, מה שנשאר הוא העדות שהיא נעשתה — לא
   * הפנים עצמן.
   */
  selfiePurgedAt?: number;
}

/* ---------- סרטון האימות ---------- */

/**
 * למה סרטון ולא שיחה: מתחזה שולט בכל מה שבטופס — בשם, במסמכים, בטלפון
 * שמסר. הוא לא שולט בפנים שלו. סרטון קצר שבו הפנים, התעודה, ואמירת
 * "אני נרשם ל-JustAsk" קושר את בעל החשבון לתעודה — והאזכור של JustAsk
 * מונע שימוש חוזר בסרטון שצולם למטרה אחרת.
 */
export const SELFIE_VIDEO_MAX_BYTES = 80 * 1024 * 1024;

export type SelfieVideoProblem = "missing" | "not-video" | "too-big";

/** בדיקת קובץ הסרטון — טהורה, בלי DOM, כדי שאפשר לבדוק אותה. */
export function selfieVideoProblem(
  meta: { type: string; size: number } | null,
): SelfieVideoProblem | null {
  if (!meta) return "missing";
  if (!meta.type.startsWith("video/")) return "not-video";
  if (meta.size > SELFIE_VIDEO_MAX_BYTES) return "too-big";
  return null;
}

/** נתיב הסרטון ב-Storage — נגזר מסוג הקובץ, עם סיומת בטוחה. */
export function selfieVideoPath(uid: string, fileName: string): string {
  const ext = (fileName.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  return `verifications/${uid}/selfieVideo.${ext}`;
}

export interface UploadableFile {
  name: string;
  type: string;
  dataUrl: string;
}

/** הגשת בקשת אימות: מעלה את המסמכים ל-Storage וכותב את הבקשה ל-Firestore. */
export async function enqueueVerification(
  data: Omit<VerificationRecord, "id" | "status" | "submittedAt" | "files">,
  files: {
    barCard?: UploadableFile | null;
    diploma?: UploadableFile | null;
    /** קובץ גולמי ולא dataUrl — סרטון של עשרות MB לא שורד קידוד base64 בזיכרון של טלפון. */
    selfieVideo?: File | null;
  },
): Promise<VerificationRecord> {
  const user = fbAuth().currentUser;
  if (!user) throw new Error("not signed in");
  const uid = user.uid;

  const paths: { barCard?: string; diploma?: string; selfieVideo?: string } = {};
  async function up(kind: "barCard" | "diploma", f?: UploadableFile | null) {
    if (!f?.dataUrl) return;
    const ext = (f.name.split(".").pop() || "bin").toLowerCase();
    const path = `verifications/${uid}/${kind}.${ext}`;
    await uploadString(ref(fbStorage(), path), f.dataUrl, "data_url");
    paths[kind] = path;
  }
  async function upVideo(f?: File | null) {
    if (!f) return;
    const path = selfieVideoPath(uid, f.name);
    await uploadBytes(ref(fbStorage(), path), f, { contentType: f.type || "video/mp4" });
    paths.selfieVideo = path;
  }
  await Promise.all([
    up("barCard", files.barCard),
    up("diploma", files.diploma),
    upVideo(files.selfieVideo),
  ]);

  const rec: VerificationRecord = {
    ...data,
    id: uid,
    submittedAt: Date.now(),
    status: "pending",
    files: paths,
  };
  const { id: _id, ...docData } = rec;
  await setDoc(doc(fbDb(), "verifications", uid), docData);
  return rec;
}

/** כל הבקשות — לאדמין, בזמן אמת (חדשות ראשונות). */
export function watchVerifications(
  cb: (rows: VerificationRecord[]) => void,
  /*
   * כשל כאן הציג "אין בקשות ממתינות" בזמן שעורך דין אמיתי ממתין בתור.
   * זו הרשימה שעליה נשען כל גיוס עורכי הדין — היא לא תשקר בשקט.
   */
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    collection(fbDb(), "verifications"),
    (snap) => {
      cb(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<VerificationRecord, "id">) }))
          .sort((a, b) => b.submittedAt - a.submittedAt),
      );
    },
    (err) => onError?.(err),
  );
}

/** סטטוס הבקשה של עו"ד מסוים — בזמן אמת (null אם טרם הגיש). */
export function watchMyVerification(
  uid: string,
  cb: (rec: VerificationRecord | null) => void,
  /*
   * קריטי להפריד: null פירושו "טרם הגיש בקשה", והמסך מציע על סמך זה
   * להתחיל אימות. אם כשל רשת היה מחזיר null גם הוא, עורך דין *מאושר*
   * היה מקבל הצעה להירשם מחדש. לכן בכשל לא נוגעים ב-cb בכלל.
   */
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    doc(fbDb(), "verifications", uid),
    (snap) => {
      cb(
        snap.exists() ? { id: snap.id, ...(snap.data() as Omit<VerificationRecord, "id">) } : null,
      );
    },
    (err) => onError?.(err),
  );
}

/**
 * החלטת אדמין + התראה לעורך הדין.
 *
 * באישור נרשמת גם הבדיקה מול הפנקס: מי בדק ומתי. זה לא שדה קישוט —
 * זו הראיה היחידה שיש לנו לכך שהאישור לא ניתן על סמך מסמך שהועלה.
 */
export async function updateVerification(
  uid: string,
  status: VerificationStatus,
  registryCheckedBy?: string,
): Promise<void> {
  await updateDoc(doc(fbDb(), "verifications", uid), {
    status,
    reviewedAt: Date.now(),
    ...(status === "approved" && registryCheckedBy
      ? { registryCheckedAt: Date.now(), registryCheckedBy }
      : {}),
  });
  await notify(
    uid,
    status === "approved"
      ? {
          type: "verification_approved",
          title: "האימות שלך אושר! 🎉",
          body: "הפרופיל שלך אומת — מעכשיו אפשר להביע עניין בתיקים ולהופיע בפני לקוחות.",
        }
      : {
          type: "verification_rejected",
          title: "האימות לא אושר",
          body: "חלק מהפרטים לא עברו בדיקה. אפשר להגיש שוב עם מסמכים מעודכנים.",
        },
  );
}

/** קישור צפייה למסמך שהועלה (דורש הרשאת קריאה — בעלים או אדמין). */
export async function verificationFileUrl(path: string): Promise<string> {
  return getDownloadURL(ref(fbStorage(), path));
}
