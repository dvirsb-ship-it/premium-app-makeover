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
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { fbDb, fbStorage } from "./firebase";
import { stripContactInfo } from "./privacy";
import type { Case, CaseOffer, CaseStatus, FeedCase, Lawyer, Role } from "./types";

export type { CaseOffer, ExpensesTerm, FeeModel } from "./types";

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
  /** הבסיס המשפטי מהוולידציה — מוצג לעורכי דין. */
  legalBasis?: string;
  /** בדחייה: ההמלצה מה כן לעשות — מוצגת ללקוח בדף התיק. */
  recommendation?: string;
  /** הצעות עו"ד שנשלחו עם הבעת העניין, לפי uid. */
  offers?: Record<string, CaseOffer>;
  /** תמונות שצורפו בקליטה — מקור ללקוח, גרסה מצונזרת לעורכי הדין. */
  images?: CaseImage[];
}

export interface CaseImage {
  id: string;
  /** נתיב המקור ב-Storage — קריא ללקוח, לאדמין ולעו"ד הנבחר בלבד (חוקי Storage). */
  origPath: string;
  /** נתיב הגרסה המצונזרת — קריא לכל משתמש מחובר. */
  censPath: string;
  /** כמה אזורים רגישים הוסתרו. */
  regions: number;
  at: number;
}

export const PLTD_MAX_PERCENT = 13;

/** קטגוריות שבהן הצעה באחוזים עשויה להיות כפופה לתקרה סטטוטורית. */
export function categoryHasStatutoryCap(category: string): boolean {
  return category === "נזיקין ותאונות" || category === "ביטוח";
}

function toCase(id: string, d: CaseDoc): Case {
  return {
    id,
    title: d.title || d.summary?.slice(0, 40) || "",
    category: d.category,
    summary: d.summary,
    createdAt: d.createdAt,
    status: d.status as CaseStatus,
    interested: d.interested ?? [],
    chosenLawyerId: d.chosenLawyerId,
    offers: d.offers,
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
  /*
   * שגיאה כאן היא לרוב דחיית הרשאות (התפקיד במסד אינו "lawyer"), ובלי דיווח
   * היא נראית בדיוק כמו "אין פניות" — עורך דין היה יושב מול פיד ריק לנצח
   * בלי לדעת שמשהו שבור.
   */
  onError?: (err: unknown) => void,
): () => void {
  const q = query(
    collection(fbDb(), "cases"),
    where("status", "in", ["matching", "has_interest"]),
  );
  // תיקים בני 30+ יום יוצאים מהפיד — פיד עם תיקים מתים שורף את אמון עורכי הדין
  const FEED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  return onSnapshot(q, (snap) => {
    const cutoff = Date.now() - FEED_MAX_AGE_MS;
    const docs = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as CaseDoc }))
      .filter((d) => d.data.createdAt > cutoff);
    docs.sort((a, b) => b.data.createdAt - a.data.createdAt);
    cb(docs.map((d) => toFeedCase(d.id, d.data, myUid)));
  }, (err) => {
    cb([]);
    onError?.(err);
  });
}

export interface NewCaseInput {
  clientId: string;
  description: string;
  incidentDate?: string;
  damageType?: "body" | "financial" | "both";
  hasDocumentation?: boolean;
  city?: string;
}

/** יצירת תיק חדש במצב ולידציה. מחזיר את מזהה התיק. */
export async function createCase(input: NewCaseInput): Promise<string> {
  const ref = await addDoc(collection(fbDb(), "cases"), {
    clientId: input.clientId,
    title: "",
    category: "",
    summary: "",
    // סינון טלפון/אימייל/קישורים — התיאור קריא לעו"ד ברמת המסד עוד לפני חיבור
    description: stripContactInfo(input.description),
    incidentDate: input.incidentDate ?? "",
    damageType: input.damageType ?? "body",
    hasDocumentation: input.hasDocumentation ?? false,
    status: "validating",
    createdAt: Date.now(),
    location: input.city ?? "",
    interested: [],
    interestedIds: [],
  } satisfies Omit<CaseDoc, "chosenLawyerId"> & object);
  return ref.id;
}

/**
 * העלאת תמונות התיק אחרי היצירה: מקור + גרסה מצונזרת לכל תמונה,
 * ורישום הנתיבים במסמך התיק. נכשלה תמונה — התיק ממשיך בלעדיה.
 */
export async function uploadCaseImages(
  caseId: string,
  images: { id: string; origBlob: Blob; censBlob: Blob; regionCount: number }[],
): Promise<CaseImage[]> {
  const meta = { contentType: "image/jpeg" };
  const uploaded: CaseImage[] = [];
  for (const img of images) {
    const origPath = `case-uploads/${caseId}/orig/${img.id}.jpg`;
    const censPath = `case-uploads/${caseId}/cens/${img.id}.jpg`;
    await uploadBytes(storageRef(fbStorage(), origPath), img.origBlob, meta);
    await uploadBytes(storageRef(fbStorage(), censPath), img.censBlob, meta);
    uploaded.push({ id: img.id, origPath, censPath, regions: img.regionCount, at: Date.now() });
  }
  if (uploaded.length) {
    await updateDoc(doc(fbDb(), "cases", caseId), { images: uploaded });
  }
  return uploaded;
}

/** URL הורדה לתמונה לפי נתיב — הפעולה נכשלת אם חוקי ה-Storage חוסמים. */
export function caseImageUrl(path: string): Promise<string> {
  return getDownloadURL(storageRef(fbStorage(), path));
}

export async function readCaseRaw(caseId: string) {
  const snap = await getDoc(doc(fbDb(), "cases", caseId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as CaseDoc) }) : null;
}

// תוצאת הוולידציה נכתבת בצד השרת (validateCaseFn, Admin SDK) — הלקוח לא נוגע בסטטוס.

/** עו"ד מביע עניין בתיק (אופציונלית עם הצעה) + התראה ללקוח. */
export async function expressInterestDb(
  caseId: string,
  lawyer: { uid: string; profile: Lawyer },
  offer?: Omit<CaseOffer, "at" | "fee">,
): Promise<void> {
  // סינון פרטי קשר מהתוכן החופשי — התקשורת עד החיבור עוברת דרך הפלטפורמה בלבד
  const clean = offer && {
    model: offer.model,
    amount: offer.amount,
    noWinNoFee: offer.noWinNoFee,
    expenses: offer.expenses,
    expensesEstimate: stripContactInfo(offer.expensesEstimate),
    duration: stripContactInfo(offer.duration),
    note: stripContactInfo(offer.note),
  };
  const hasOffer = !!clean && clean.amount > 0;
  await updateDoc(doc(fbDb(), "cases", caseId), {
    interestedIds: arrayUnion(lawyer.uid),
    interested: arrayUnion(lawyer.profile),
    status: "has_interest",
    ...(hasOffer
      ? { [`offers.${lawyer.uid}`]: { ...clean, at: Date.now() } }
      : {}),
  });
  // התראה מחוץ לאפליקציה ללקוח — השרת מאמת שהעו"ד באמת רשום כמתעניין
  try {
    const { notifyInterestFn } = await import("./ai/intake.functions");
    const { fbAuth } = await import("./firebase");
    const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
    await notifyInterestFn({ data: { caseId, idToken } });
  } catch {
    /* ההתראה היא תוספת — הבעת העניין כבר נרשמה */
  }

  // פרטי הקשר של העו"ד נכתבים לתת-אוסף שנחשף ללקוח רק אחרי בחירה
  try {
    const contact = await readOwnLawyerContact(lawyer.uid);
    if (contact) {
      await setDoc(doc(fbDb(), "cases", caseId, "contacts", lawyer.uid), contact);
    }
  } catch {
    /* לא חוסם את הבעת העניין */
  }
  const c = await readCaseRaw(caseId);
  if (c) {
    await notify(c.clientId, {
      type: "lawyer_interest",
      title: "עורך דין מעוניין בתיק שלך",
      body: hasOffer
        ? `${lawyer.profile.name} הביע עניין בפנייה "${c.title || c.category}" וצירף הצעה`
        : `${lawyer.profile.name} הביע עניין בפנייה "${c.title || c.category}"`,
      caseId,
    });
  }
}

/* ---------- ערעורי ולידציה (ולידציה כפולה ע"י עורכי הדין) ---------- */

export interface AppealDoc {
  id: string;
  caseId: string;
  caseTitle: string;
  lawyerId: string;
  lawyerName: string;
  reason: string;
  status: "open" | "accepted" | "dismissed";
  createdAt: number;
}

/** עו"ד מדווח שולידציה שגויה — נפתח ערעור לבדיקת האדמין. */
export async function submitAppeal(input: {
  caseId: string;
  caseTitle: string;
  lawyerId: string;
  lawyerName: string;
  reason: string;
}): Promise<void> {
  await addDoc(collection(fbDb(), "appeals"), {
    ...input,
    status: "open",
    createdAt: Date.now(),
  });
}

/** כל הערעורים — לאדמין, בזמן אמת (פתוחים ראשונים, חדשים ראשונים). */
export function watchAppeals(cb: (rows: AppealDoc[]) => void): () => void {
  return onSnapshot(
    collection(fbDb(), "appeals"),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppealDoc, "id">) }));
      rows.sort((a, b) =>
        (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1)
        || b.createdAt - a.createdAt,
      );
      cb(rows);
    },
    () => cb([]),
  );
}

/** הכרעת אדמין בערעור: קבלה מסירה את התיק מהפיד ומעדכנת את שני הצדדים. */
export async function resolveAppeal(
  appeal: AppealDoc,
  accepted: boolean,
): Promise<void> {
  await updateDoc(doc(fbDb(), "appeals", appeal.id), {
    status: accepted ? "accepted" : "dismissed",
    reviewedAt: Date.now(),
  });
  if (accepted) {
    const c = await readCaseRaw(appeal.caseId);
    await updateDoc(doc(fbDb(), "cases", appeal.caseId), { status: "rejected" });
    if (c) {
      await notify(c.clientId, {
        type: "case_reverted",
        title: "הפנייה שלך חזרה לבדיקה",
        body: "לאחר בדיקה נוספת נדרשים פרטים משלימים. אפשר לפתוח פנייה חדשה עם מידע נוסף — אנחנו כאן.",
        caseId: appeal.caseId,
      });
    }
  }
  await notify(appeal.lawyerId, {
    type: accepted ? "appeal_accepted" : "appeal_dismissed",
    title: accepted ? "הערעור שלך התקבל" : "הערעור נבדק",
    body: accepted
      ? `צדקת — התיק "${appeal.caseTitle}" הוסר מהפיד. תודה ששמרת על איכות המערכת.`
      : `בדקנו את "${appeal.caseTitle}" — הוולידציה נשארת בתוקף. תודה על הערנות.`,
    caseId: appeal.caseId,
  });
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
  city?: string;
  createdAt: number;
}

/** פרטי הקשר של עו"ד — אוסף נפרד שקריא רק לבעליו ולאדמין (מניעת עקיפה). */
export interface LawyerContactDoc {
  fullName: string;
  phone: string;
  email: string;
}

export async function writeLawyerContact(
  uid: string,
  c: LawyerContactDoc,
): Promise<void> {
  await setDoc(doc(fbDb(), "lawyerContacts", uid), c, { merge: true });
}

async function readOwnLawyerContact(uid: string): Promise<LawyerContactDoc | null> {
  const snap = await getDoc(doc(fbDb(), "lawyerContacts", uid));
  return snap.exists() ? (snap.data() as LawyerContactDoc) : null;
}

/** פרטי עו"ד על תיק — קריא ללקוח רק אחרי שבחר בו (נאכף בחוקים). */
export async function readCaseLawyerContact(
  caseId: string,
  lawyerUid: string,
): Promise<LawyerContactDoc | null> {
  const snap = await getDoc(doc(fbDb(), "cases", caseId, "contacts", lawyerUid));
  return snap.exists() ? (snap.data() as LawyerContactDoc) : null;
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

/** האם קטגוריית תיק רלוונטית להתמחויות של עו"ד ("אחר" פתוח לכולם). */
export function categoryMatchesSpecialties(
  category: string,
  specialties: string[],
): boolean {
  const specs = CATEGORY_SPECS[category];
  if (!specs) return true;
  return specialties.some((s) => specs.includes(s));
}

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

/* ---------- פניות תמיכה (המשרד הטכנולוגי) ---------- */

export interface SupportTicketDoc {
  id: string;
  userId: string;
  email: string;
  message: string;
  status: "open" | "handled";
  createdAt: number;
}

export async function submitSupportTicket(input: {
  userId: string;
  email: string;
  message: string;
}): Promise<void> {
  await addDoc(collection(fbDb(), "supportTickets"), {
    ...input,
    status: "open",
    createdAt: Date.now(),
  });
}

export function watchSupportTickets(
  cb: (rows: SupportTicketDoc[]) => void,
): () => void {
  return onSnapshot(
    collection(fbDb(), "supportTickets"),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SupportTicketDoc, "id">) }));
      rows.sort((a, b) =>
        (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1)
        || b.createdAt - a.createdAt,
      );
      cb(rows);
    },
    () => cb([]),
  );
}

export async function markTicketHandled(id: string): Promise<void> {
  await updateDoc(doc(fbDb(), "supportTickets", id), { status: "handled" });
}

/* ---------- מחיקת חשבון ---------- */

export interface DeletionRequestDoc {
  id: string;
  userId: string;
  email: string;
  reason: string;
  status: "open" | "done";
  createdAt: number;
}

/** בקשת מחיקה: מנתקת מיד את התיקים הפתוחים ופותחת בקשה לטיפול תוך 14 יום. */
export async function requestAccountDeletion(input: {
  userId: string;
  email: string;
  reason: string;
}): Promise<void> {
  await addDoc(collection(fbDb(), "deletionRequests"), {
    ...input,
    status: "open",
    createdAt: Date.now(),
  });
  // הסרה מיידית מהפיד: תיקים פעילים של המשתמש נסגרים
  try {
    const snap = await getDocs(
      query(collection(fbDb(), "cases"), where("clientId", "==", input.userId)),
    );
    await Promise.all(
      snap.docs
        .filter((d) => (d.data() as CaseDoc).status !== "connected")
        .map((d) => updateDoc(doc(fbDb(), "cases", d.id), { status: "rejected" })),
    );
  } catch {
    /* הבקשה נרשמה — הניקוי יושלם ידנית */
  }
}

export function watchDeletionRequests(
  cb: (rows: DeletionRequestDoc[]) => void,
): () => void {
  return onSnapshot(
    collection(fbDb(), "deletionRequests"),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeletionRequestDoc, "id">) }));
      rows.sort((a, b) =>
        (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.createdAt - a.createdAt,
      );
      cb(rows);
    },
    () => cb([]),
  );
}

export async function markDeletionDone(id: string): Promise<void> {
  await updateDoc(doc(fbDb(), "deletionRequests", id), { status: "done" });
}

/* ---------- יומן שגיאות שרת (נכתב מהשרת בלבד) ---------- */

export interface ServerErrorDoc {
  id: string;
  context: string;
  message: string;
  at: number;
  handled: boolean;
}

/** שגיאות שרת אחרונות — לאדמין. חדשות תחילה, עד 30. */
export function watchServerErrors(
  cb: (rows: ServerErrorDoc[]) => void,
): () => void {
  return onSnapshot(
    collection(fbDb(), "serverErrors"),
    (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ServerErrorDoc, "id">) }))
        .sort((a, b) => b.at - a.at)
        .slice(0, 30);
      cb(rows);
    },
    () => cb([]),
  );
}

/* ---------- תזכיר משפטי מלא + מדד תגובתיות ---------- */

/**
 * התזכיר המשפטי המלא של התיק — עבודת המשפטן שה-AI כתב.
 * נשמר בתת-אוסף כדי שנוכל להגביל אותו למנוי Pro בעתיד בלי מיגרציה.
 */
export async function readCaseMemo(caseId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(fbDb(), "cases", caseId, "memo", "full"));
    return snap.exists() ? ((snap.data().text as string) ?? null) : null;
  } catch {
    return null;
  }
}

export interface LawyerStats {
  responses: number;
  totalResponseMs: number;
}

/** מדד תגובתיות שהפלטפורמה מדדה בעצמה — נכתב בשרת בלבד. */
export async function readLawyerStats(uid: string): Promise<LawyerStats | null> {
  try {
    const snap = await getDoc(doc(fbDb(), "lawyerStats", uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      responses: Number(d.responses ?? 0),
      totalResponseMs: Number(d.totalResponseMs ?? 0),
    };
  } catch {
    return null;
  }
}

/** ניסוח זמן תגובה ממוצע בעברית קריאה. null כשאין עדיין נתונים. */
export function avgResponseLabel(stats: LawyerStats | null): string | null {
  if (!stats || stats.responses < 1) return null;
  const mins = Math.round(stats.totalResponseMs / stats.responses / 60000);
  if (mins < 60) return `${Math.max(1, mins)} דק׳`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} שעות`;
  return `${Math.round(hours / 24)} ימים`;
}

export async function markServerErrorHandled(id: string): Promise<void> {
  await updateDoc(doc(fbDb(), "serverErrors", id), { handled: true });
}

/** ארכיון כל התיקים — לאדמין בלבד, בזמן אמת. */
export interface AdminCaseRow {
  id: string;
  title: string;
  category: string;
  status: string;
  location: string;
  createdAt: number;
  interestedCount: number;
}

export function watchAllCasesAdmin(
  cb: (rows: AdminCaseRow[]) => void,
): () => void {
  return onSnapshot(
    collection(fbDb(), "cases"),
    (snap) => {
      cb(
        snap.docs
          .map((d) => {
            const c = d.data() as CaseDoc;
            return {
              id: d.id,
              title: c.title || c.description?.slice(0, 40) || d.id,
              category: c.category,
              status: c.status,
              location: c.location || "",
              createdAt: c.createdAt,
              interestedCount: c.interestedIds?.length ?? 0,
            };
          })
          .sort((a, b) => b.createdAt - a.createdAt),
      );
    },
    () => cb([]),
  );
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
