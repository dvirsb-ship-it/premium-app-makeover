/**
 * שכבת הנתונים של JustAsk — Firestore.
 * ממפה את מסמכי המסד לטיפוסי ה-UI הקיימים (Case, FeedCase) כך שהמסכים לא משתנים.
 * הצפנה באחסון + בידוד משתמשים נאכפים ע"י Firestore + Security Rules.
 */
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { fbDb } from "./firebase";
import type { Case, CaseStatus, FeedCase, Lawyer, Role } from "./types";

/* ---------- users ---------- */

export interface UserDoc {
  role?: Role;
  name?: string;
  email?: string;
  phone?: string;
  createdAt?: Timestamp;
}

export async function ensureUserDoc(
  uid: string,
  data: Partial<UserDoc>,
): Promise<void> {
  // Firestore לא מקבל undefined — מסננים שדות חסרים (למשל טלפון בהתחברות גוגל)
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  );
  await setDoc(
    doc(fbDb(), "users", uid),
    { ...clean, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function readUserRole(uid: string): Promise<Role | null> {
  const snap = await getDoc(doc(fbDb(), "users", uid));
  const role = snap.exists() ? (snap.data().role as Role | undefined) : undefined;
  return role === "client" || role === "lawyer" ? role : null;
}

export async function writeUserRole(uid: string, role: Role | null): Promise<void> {
  await setDoc(doc(fbDb(), "users", uid), { role }, { merge: true });
}

/* ---------- cases ---------- */

interface CaseDoc {
  clientId: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  incidentDate?: string;
  damageType?: "body" | "financial" | "both";
  hasDocumentation?: boolean;
  status: CaseStatus | "rejected";
  createdAt: number; // epoch ms — תואם ל-Case.createdAt הקיים
  location?: string;
  interested: Lawyer[]; // דה-נורמליזציה לתצוגה
  interestedIds: string[];
  chosenLawyerId?: string;
  /** נכתב כשהלקוח בוחר עו"ד — גלוי רק לעו"ד הנבחר (נאכף בחוקים). */
  clientContact?: { name: string; phone: string; email: string };
}

function toCase(id: string, d: CaseDoc): Case {
  return {
    id,
    title: d.title,
    category: d.category,
    summary: d.summary,
    createdAt: d.createdAt,
    status: (d.status === "rejected" ? "validating" : d.status) as CaseStatus,
    interested: d.interested ?? [],
    chosenLawyerId: d.chosenLawyerId,
  };
}

function agoLabel(ms: number, lang: "he" | "en" = "he"): string {
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (lang === "en") {
    if (mins < 60) return `${mins}m ago`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / (60 * 24))}d ago`;
  }
  if (mins < 60) return `לפני ${mins} דק׳`;
  if (mins < 60 * 24) return `לפני ${Math.round(mins / 60)} שעות`;
  return `לפני ${Math.round(mins / (60 * 24))} ימים`;
}

function toFeedCase(id: string, d: CaseDoc, myUid: string): FeedCase {
  return {
    id,
    title: d.title,
    category: d.category,
    summary: d.summary,
    location: d.location || "ישראל",
    postedAgo: agoLabel(d.createdAt),
    urgency: d.damageType === "body" ? "דחוף" : "רגיל",
    interestedCount: d.interestedIds?.length ?? 0,
    expressed: (d.interestedIds ?? []).includes(myUid),
  };
}

/** תיקי הלקוח — בזמן אמת. */
export function watchMyCases(
  uid: string,
  cb: (cases: Case[]) => void,
): () => void {
  // המיון בצד הלקוח — חוסך אינדקס מורכב (where + orderBy)
  const q = query(collection(fbDb(), "cases"), where("clientId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs
        .map((d) => toCase(d.id, d.data() as CaseDoc))
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  }, () => cb([]));
}

/** פיד עורך הדין: תיקים שעברו ולידציה וזמינים — בזמן אמת. */
export function watchLawyerFeed(
  myUid: string,
  cb: (feed: FeedCase[]) => void,
): () => void {
  const q = query(
    collection(fbDb(), "cases"),
    where("status", "in", ["matching", "has_interest"]),
  );
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as CaseDoc }));
    docs.sort((a, b) => b.data.createdAt - a.data.createdAt);
    cb(docs.map((d) => toFeedCase(d.id, d.data, myUid)));
  }, () => cb([]));
}

export interface NewCaseInput {
  clientId: string;
  description: string;
  incidentDate?: string;
  damageType?: "body" | "financial" | "both";
  hasDocumentation?: boolean;
}

/** יצירת תיק חדש במצב ולידציה. מחזיר את מזהה התיק. */
export async function createCase(input: NewCaseInput): Promise<string> {
  const ref = await addDoc(collection(fbDb(), "cases"), {
    clientId: input.clientId,
    title: "",
    category: "",
    summary: "",
    description: input.description,
    incidentDate: input.incidentDate ?? "",
    damageType: input.damageType ?? "body",
    hasDocumentation: input.hasDocumentation ?? false,
    status: "validating",
    createdAt: Date.now(),
    interested: [],
    interestedIds: [],
  } satisfies Omit<CaseDoc, "chosenLawyerId" | "location"> & object);
  return ref.id;
}

export async function readCaseRaw(caseId: string) {
  const snap = await getDoc(doc(fbDb(), "cases", caseId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as CaseDoc) }) : null;
}

/** עדכון תוצאת הוולידציה. */
export async function applyValidation(
  caseId: string,
  result: { validated: boolean; title: string; category: string; summary: string },
): Promise<void> {
  await updateDoc(doc(fbDb(), "cases", caseId), {
    title: result.title,
    category: result.category,
    summary: result.summary,
    status: result.validated ? "matching" : "rejected",
  });
}

/** עו"ד מביע עניין בתיק + התראה ללקוח. */
export async function expressInterestDb(
  caseId: string,
  lawyer: { uid: string; profile: Lawyer },
): Promise<void> {
  await updateDoc(doc(fbDb(), "cases", caseId), {
    interestedIds: arrayUnion(lawyer.uid),
    interested: arrayUnion(lawyer.profile),
    status: "has_interest",
  });
  const c = await readCaseRaw(caseId);
  if (c) {
    await notify(c.clientId, {
      type: "lawyer_interest",
      title: "עורך דין מעוניין בתיק שלך",
      body: `${lawyer.profile.name} הביע עניין בפנייה "${c.title || c.category}"`,
      caseId,
    });
  }
}

/** הלקוח בחר עורך דין + חילופי פרטי קשר + התראה לעורך הדין. */
export async function chooseLawyerDb(
  caseId: string,
  lawyerId: string,
  clientContact?: { name: string; phone: string; email: string },
): Promise<void> {
  await updateDoc(doc(fbDb(), "cases", caseId), {
    chosenLawyerId: lawyerId,
    status: "connected",
    ...(clientContact ? { clientContact } : {}),
  });
  const c = await readCaseRaw(caseId);
  if (c) {
    await notify(lawyerId, {
      type: "chosen",
      title: "לקוח בחר בך!",
      body: `נבחרת לטפל בפנייה "${c.title || c.category}" — פרטי הקשר זמינים בתיק`,
      caseId,
    });
  }
}

/* ---------- מדריך עורכי הדין (ציבורי למחוברים — משמש ל-fan-out ולכרטיסי עו"ד) ---------- */

export interface LawyerProfileDoc {
  name: string;
  specialties: string[];
  barYear?: string;
  university?: string;
  phone?: string;
  email?: string;
  createdAt: number;
}

export async function readLawyerProfile(
  uid: string,
): Promise<LawyerProfileDoc | null> {
  const snap = await getDoc(doc(fbDb(), "lawyerProfiles", uid));
  return snap.exists() ? (snap.data() as LawyerProfileDoc) : null;
}

export async function writeLawyerProfile(
  uid: string,
  p: Omit<LawyerProfileDoc, "createdAt">,
): Promise<void> {
  await setDoc(
    doc(fbDb(), "lawyerProfiles", uid),
    { ...p, createdAt: Date.now() },
    { merge: true },
  );
}

// קטגוריית הוולידציה → התמחויות רלוונטיות (מזהי ההתמחות של טופס ההצטרפות)
const CATEGORY_SPECS: Record<string, string[]> = {
  "נזיקין ותאונות": ["injury", "civil"],
  "רשלנות רפואית": ["medical", "injury"],
  "דיני עבודה": ["employment"],
  "ביטוח": ["insurance", "injury"],
  "צרכנות": ["consumer", "civil"],
  "מקרקעין": ["estate"],
};

/** תיק עבר ולידציה — הזמנה לכל עורכי הדין בתחום לצפות בו. */
export async function fanOutNewCase(
  caseId: string,
  title: string,
  category: string,
): Promise<number> {
  const specs = CATEGORY_SPECS[category];
  const col = collection(fbDb(), "lawyerProfiles");
  const q: Query = specs
    ? query(col, where("specialties", "array-contains-any", specs))
    : col;
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((d) =>
      notify(d.id, {
        type: "new_case",
        title: `תיק חדש בתחום ${category}`,
        body: `"${title}" ממתין לעורך דין — היו הראשונים להביע עניין`,
        caseId,
      }),
    ),
  );
  return snap.size;
}

/* ---------- notifications ---------- */

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  caseId?: string;
  read: boolean;
  createdAt: number;
}

export async function notify(
  userId: string,
  n: { type: string; title: string; body: string; caseId?: string },
): Promise<void> {
  await addDoc(collection(fbDb(), "notifications"), {
    userId,
    ...n,
    read: false,
    createdAt: Date.now(),
  });
}

export function watchNotifications(
  uid: string,
  cb: (items: AppNotification[]) => void,
): () => void {
  const q = query(collection(fbDb(), "notifications"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }))
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  }, () => cb([]));
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(fbDb(), "notifications", id), { read: true });
}
