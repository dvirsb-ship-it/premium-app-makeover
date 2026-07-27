/**
 * תור אימות עורכי הדין — Firestore + Storage אמיתיים.
 * המסמכים (רישיון לשכה, תעודת בוגר) נשמרים ב-Storage תחת verifications/{uid}/
 * והבקשה עצמה ב-verifications/{uid} — מסמך אחד לעו"ד (הגשה חוזרת מעדכנת אותו).
 */
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
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
  otherSpecialty?: string;
  submittedAt: number;
  status: VerificationStatus;
  reviewedAt?: number;
  files?: { barCard?: string; diploma?: string };
}

export interface UploadableFile {
  name: string;
  type: string;
  dataUrl: string;
}

/** הגשת בקשת אימות: מעלה את המסמכים ל-Storage וכותב את הבקשה ל-Firestore. */
export async function enqueueVerification(
  data: Omit<VerificationRecord, "id" | "status" | "submittedAt" | "files">,
  files: { barCard?: UploadableFile | null; diploma?: UploadableFile | null },
): Promise<VerificationRecord> {
  const user = fbAuth().currentUser;
  if (!user) throw new Error("not signed in");
  const uid = user.uid;

  const paths: { barCard?: string; diploma?: string } = {};
  async function up(kind: "barCard" | "diploma", f?: UploadableFile | null) {
    if (!f?.dataUrl) return;
    const ext = (f.name.split(".").pop() || "bin").toLowerCase();
    const path = `verifications/${uid}/${kind}.${ext}`;
    await uploadString(ref(fbStorage(), path), f.dataUrl, "data_url");
    paths[kind] = path;
  }
  await Promise.all([up("barCard", files.barCard), up("diploma", files.diploma)]);

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
    () => cb([]),
  );
}

/** סטטוס הבקשה של עו"ד מסוים — בזמן אמת (null אם טרם הגיש). */
export function watchMyVerification(
  uid: string,
  cb: (rec: VerificationRecord | null) => void,
): () => void {
  return onSnapshot(
    doc(fbDb(), "verifications", uid),
    (snap) => {
      cb(
        snap.exists()
          ? { id: snap.id, ...(snap.data() as Omit<VerificationRecord, "id">) }
          : null,
      );
    },
    () => cb(null),
  );
}

/** החלטת אדמין + התראה לעורך הדין. */
export async function updateVerification(
  uid: string,
  status: VerificationStatus,
): Promise<void> {
  await updateDoc(doc(fbDb(), "verifications", uid), {
    status,
    reviewedAt: Date.now(),
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
