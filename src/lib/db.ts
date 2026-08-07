/**
 * שכבת הנתונים של JustAsk — Firestore.
 * ממפה את מסמכי המסד לטיפוסי ה-UI הקיימים (Case, FeedCase) כך שהמסכים לא משתנים.
 * הצפנה באחסון + בידוד משתמשים נאכפים ע"י Firestore + Security Rules.
 */
import {
  deleteDoc,
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
  /** נחתם בסיום מסך הפתיחה — התנאים אושרו. חסר = עוד לא עבר. */
  onboardedAt?: Timestamp;
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

/**
 * התפקיד וסימון הפתיחה בקריאה אחת.
 *
 * שתי קריאות נפרדות לאותו מסמך בשנייה שאחרי ההתחברות הן בזבוז, ובעיקר
 * שתי הזדמנויות להיכשל ברשת של רגע הכניסה — בדיוק הרגע שבו מוכרעת
 * שאלת הניתוב.
 */
export async function readUserGate(
  uid: string,
): Promise<{ role: Role | null; onboardedAt: Timestamp | null }> {
  const snap = await getDoc(doc(fbDb(), "users", uid));
  const data = snap.exists() ? (snap.data() as UserDoc) : undefined;
  const role = data?.role;
  return {
    role: role === "client" || role === "lawyer" ? role : null,
    onboardedAt: data?.onboardedAt ?? null,
  };
}

/** חותם שהמשתמש אישר את התנאים. נכתב פעם אחת, בסיום מסך הפתיחה. */
export async function markUserOnboarded(uid: string): Promise<void> {
  await setDoc(
    doc(fbDb(), "users", uid),
    { onboardedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function writeUserRole(uid: string, role: Role | null): Promise<void> {
  await setDoc(doc(fbDb(), "users", uid), { role }, { merge: true });
}

/**
 * מנוי חי על התפקיד.
 *
 * readUserRole היא קריאה חד-פעמית, וכשהיא נכשלת — רשת איטית ברגע
 * ההתחברות — המשתמש נשאר בלי תפקיד עד לטעינה הבאה של האפליקציה. זה לא
 * תיאורטי: זה מה שקרה בהתחברות אמיתית, והתוצאה הייתה משתמש מחובר
 * שנחת על רשימת תיקים בלי שום דרך לנווט משם.
 */
export function watchUserRole(
  uid: string,
  cb: (role: Role) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    doc(fbDb(), "users", uid),
    (snap) => {
      const r = snap.exists() ? (snap.data().role as Role | undefined) : undefined;
      // תפקיד חסר במסמך אינו סיבה למחוק תפקיד שכבר ידוע לנו מהמטמון
      if (r === "client" || r === "lawyer") cb(r);
    },
    (err) => onError?.(err),
  );
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
  /** שפת הראיון של הלקוח. חסר = עברית (תיקים מלפני השדה). */
  clientLang?: string;
  /** מתי הפונה משך את הפנייה. */
  withdrawnAt?: number;
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
  /** הרגע שבו התיק נעשה זמין לעורכי דין (נכתב מהשרת בסיום הוולידציה). */
  validatedAt?: number;
  /** רשימת ההכנה שנגזרה מהראיון — מוצגת ללקוח. */
  clientChecklist?: string[];
  /**
   * כמה עורכי דין מאומתים בתחום קיבלו את התיק (נכתב מהשרת בסיום הוולידציה).
   * בלי המספר הזה "נעדכן אותך ברגע שמישהו יביע עניין" נאמר גם כשאין אף
   * עורך דין בתחום — הבטחה שאין מי שיקיים.
   */
  notifiedLawyers?: number;
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

/* הכללים המשפטיים חיים ב-legal.ts (טהור, נבדק) — כאן רק ייצוא-מחדש */
export { PLTD_MAX_PERCENT, categoryHasStatutoryCap, categoryForbidsContingency } from "./legal";

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
    notifiedLawyers: d.notifiedLawyers,
    withdrawnAt: d.withdrawnAt,
  };
}

/* ניסוח "לפני X" בכל שפה — ברזולוציית דקות, לפיד */
const AGO: Record<string, { m: (n: number) => string; h: (n: number) => string; d: (n: number) => string }> = {
  he: { m: (n) => `לפני ${n} דק׳`, h: (n) => `לפני ${n} שעות`, d: (n) => `לפני ${n} ימים` },
  en: { m: (n) => `${n}m ago`, h: (n) => `${n}h ago`, d: (n) => `${n}d ago` },
  ru: { m: (n) => `${n} мин назад`, h: (n) => `${n} ч назад`, d: (n) => `${n} дн. назад` },
  ar: { m: (n) => `قبل ${n} دقائق`, h: (n) => `قبل ${n} ساعات`, d: (n) => `قبل ${n} أيام` },
  es: { m: (n) => `hace ${n} min`, h: (n) => `hace ${n} h`, d: (n) => `hace ${n} días` },
  fr: { m: (n) => `il y a ${n} min`, h: (n) => `il y a ${n} h`, d: (n) => `il y a ${n} jours` },
};

function agoLabel(ms: number, lang: string = "he"): string {
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  const p = AGO[lang] ?? AGO.he;
  if (mins < 60) return p.m(mins);
  if (mins < 60 * 24) return p.h(Math.round(mins / 60));
  return p.d(Math.round(mins / (60 * 24)));
}

import { limitationMonthsLeft } from "./legal";

/* שפת הממשק — נקראת בזמן בניית הפיד; ברירת מחדל עברית כמו כל האפליקציה */
function docLang(): string {
  if (typeof document === "undefined") return "he";
  return document.documentElement.getAttribute("lang") || "he";
}

function toFeedCase(id: string, d: CaseDoc, myUid: string): FeedCase {
  return {
    limitationMonthsLeft: limitationMonthsLeft(d.incidentDate, d.category),
    id,
    title: d.title,
    category: d.category,
    summary: d.summary,
    location: d.location || "ישראל",
    postedAgo: agoLabel(d.createdAt, docLang()),
    urgency: d.damageType === "body" ? "דחוף" : "רגיל",
    interestedCount: d.interestedIds?.length ?? 0,
    expressed: (d.interestedIds ?? []).includes(myUid),
    clientLang: d.clientLang || "he",
  };
}

/**
 * סדר התיקים של הלקוח — לפי מה שדורש ממנו החלטה, לא לפי מתי הגיש.
 *
 * תיק שעורך דין הביע בו עניין ממתין *לו*: כל יום שהוא לא רואה אותו הוא
 * לקוח שממתין ועורך דין שממתין. תיק שנדחה כבר הוכרע ואין בו מה לעשות,
 * ולכן הוא יורד לתחתית. בתוך כל קבוצה — החדש קודם.
 */
function casePriority(c: Case): number {
  if (c.status === "has_interest") return 0; // דורש ממך בחירה
  if (c.status === "connected") return 1; // פעיל
  if (c.status === "closed") return 3; // הושלם
  if (c.status === "withdrawn") return 4; // נמשך ביוזמת הפונה
  if (c.status === "rejected") return 5; // הוכרע — לתחתית
  return 2; // בבדיקה / ממתין
}

/** תיקי הלקוח — בזמן אמת. */
export function watchMyCases(
  uid: string,
  cb: (cases: Case[]) => void,
  // כשל הרשאות נראה בדיוק כמו "אין תיקים" — הלקוח היה חושב שהתיק שלו נעלם
  onError?: (err: unknown) => void,
): () => void {
  // המיון בצד הלקוח — חוסך אינדקס מורכב (where + orderBy)
  const q = query(collection(fbDb(), "cases"), where("clientId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs
        .map((d) => toCase(d.id, d.data() as CaseDoc))
        .sort((a, b) => casePriority(a) - casePriority(b) || b.createdAt - a.createdAt),
    );
  }, (err) => {
    // לא cb([]) — "אין תיקים" הוא שקר כשהתיק קיים והקריאה נדחתה
    onError?.(err);
  });
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
  /*
   * תיקים בני 30+ יום יוצאים מהפיד — פיד עם תיקים מתים שורף את אמון
   * עורכי הדין.
   *
   * הסינון עבר לשרת, ולא בגלל התצוגה: הוא נראה זהה. עד היום המנוי הזה
   * הוריד *כל* תיק פתוח במערכת לכל עורך דין, וזרק את הישנים בדפדפן.
   * זה אומר שהעלות והתעבורה גדלות עם כל תיק שנוצר אי פעם, כפול מספר
   * עורכי הדין המחוברים — בדיוק התרחיש של "יצופו פתאום מלא אנשים".
   * החלון הוא כבר ההתנהגות הקיימת, ולכן התוצאה זהה בדיוק.
   */
  const FEED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const FEED_HARD_CAP = 1000;
  const q = query(
    collection(fbDb(), "cases"),
    where("status", "in", ["matching", "has_interest"]),
    where("createdAt", ">", Date.now() - FEED_MAX_AGE_MS),
    orderBy("createdAt", "desc"),
    // רשת ביטחון מול עלות, לא מדיניות מוצר. אם היא נתפסת — מדווחים.
    limit(FEED_HARD_CAP),
  );
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as CaseDoc }));
    if (docs.length >= FEED_HARD_CAP) {
      // שקט כאן היה אומר "זה כל מה שיש" על פיד חתוך
      console.warn(
        `[feed] תקרת ${FEED_HARD_CAP} תיקים נתפסה — יש תיקים שאינם מוצגים. ` +
          "זה הרגע לעבור לסינון תחום בשרת.",
      );
    }
    cb(docs.map((d) => toFeedCase(d.id, d.data, myUid)));
  }, (err) => {
    cb([]);
    onError?.(err);
  });
}

/** תיק פעיל של עורך הדין — אחרי שהלקוח בחר בו. */
export interface LawyerCase {
  id: string;
  title: string;
  category: string;
  summary: string;
  location: string;
  createdAt: number;
  clientName: string;
  /** התיק הושלם — יורד לתחתית הרשימה ומסומן אחרת. */
  closed: boolean;
}

/**
 * התיקים שעורך הדין נבחר לטפל בהם.
 *
 * עד עכשיו לא הייתה לזה שום רשימה: ברגע שהלקוח בחר, התיק יצא מהפיד
 * (הוא כבר לא ליד) והדרך היחידה להגיע אליו הייתה דרך ההתראה. עורך דין
 * עם חמישה לקוחות פעילים נשאר בלי מסך עבודה.
 */
export function watchLawyerCases(
  uid: string,
  cb: (rows: LawyerCase[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(collection(fbDb(), "cases"), where("chosenLawyerId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs
          .map((d) => {
            const c = d.data() as CaseDoc;
            return {
              id: d.id,
              title: c.title || c.summary?.slice(0, 40) || "",
              category: c.category,
              summary: c.summary,
              location: c.location || "",
              createdAt: c.createdAt,
              clientName: c.clientContact?.name ?? "",
              closed: c.status === "closed",
            };
          })
          .sort(
            (a, b) =>
              Number(a.closed) - Number(b.closed) || b.createdAt - a.createdAt,
          ),
      );
    },
    (err) => onError?.(err),
  );
}

export interface NewCaseInput {
  clientId: string;
  description: string;
  incidentDate?: string;
  damageType?: "body" | "financial" | "both";
  hasDocumentation?: boolean;
  city?: string;
  /** שפת הממשק שבה נערך הראיון. חסר = עברית (תיקים מלפני השדה). */
  clientLang?: string;
}

/** יצירת תיק חדש במצב ולידציה. מחזיר את מזהה התיק. */
export async function createCase(input: NewCaseInput): Promise<string> {
  const ref = await addDoc(collection(fbDb(), "cases"), {
    clientId: input.clientId,
    /*
     * השפה שבה הלקוח באמת סיפר את הסיפור — לא הצהרה שלו, אלא שפת
     * הממשק שבה עבר את הראיון. זה מה שעורך הדין צריך לדעת לפני שהוא
     * מתקשר: אין טעם לחבר דובר ערבית בלבד לעורך דין שאינו דובר ערבית.
     */
    clientLang: input.clientLang ?? "he",
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
    // Firestore דוחה undefined — האופציונליים נכנסים רק כשיש בהם ערך ממשי
    ...(offer.vat ? { vat: offer.vat } : {}),
    ...(offer.postSuitPercent ? { postSuitPercent: offer.postSuitPercent } : {}),
    ...(offer.judgmentPercent ? { judgmentPercent: offer.judgmentPercent } : {}),
    ...(offer.retainer ? { retainer: offer.retainer } : {}),
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
      titleKey: "notifInterestTitle",
      bodyKey: hasOffer ? "notifInterestBodyOffer" : "notifInterestBody",
      params: { name: lawyer.profile.name, title: c.title || c.category },
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
export function watchAppeals(
  cb: (rows: AppealDoc[]) => void,
  /*
   * שגיאה כאן היא לרוב דחיית הרשאות או נפילת רשת, והיא *אינה* "אין תוצאות".
   * עד עכשיו היא נבלעה ל-cb([]) — כלומר המסך הציג מצב ריק תקין בזמן שהוא
   * שבור. זה קרה ארבע פעמים נפרד בפרויקט הזה. הכשל מדווח, ולא ממציא נתון.
   */
  onError?: (err: unknown) => void,
): () => void {
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
    (err) => onError?.(err),
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
        titleKey: "notifRevertedTitle",
        bodyKey: "notifRevertedBody",
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
    titleKey: accepted ? "notifAppealAcceptedTitle" : "notifAppealDismissedTitle",
    bodyKey: accepted ? "notifAppealAcceptedBody" : "notifAppealDismissedBody",
    params: { title: appeal.caseTitle },
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
  /*
   * רישום החיבור למונה הניסיון של עורך הדין — בשרת, ולא חוסם.
   * כשל כאן לא אמור לפגוע בחיבור שכבר נוצר; המונה הוא נתון עסקי,
   * לא תנאי לחיבור בין אדם לעורך הדין שבחר.
   */
  try {
    const { recordConnectionFn } = await import("./ai/intake.functions");
    const { fbAuth } = await import("./firebase");
    const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
    await recordConnectionFn({ data: { caseId, idToken } });
  } catch {
    /* ignore */
  }

  const c = await readCaseRaw(caseId);
  if (c) {
    await notify(lawyerId, {
      type: "chosen",
      title: "לקוח בחר בך!",
      body: `נבחרת לטפל בפנייה "${c.title || c.category}" — פרטי הקשר זמינים בתיק`,
      titleKey: "notifChosenTitle",
      bodyKey: "notifChosenBody",
      params: { title: c.title || c.category },
      caseId,
    });

    /*
     * וגם למי שלא נבחר — כי שתיקה גרועה מ"לא".
     *
     * עורך דין שהביע עניין ושלח הצעה נשאר בלי שום אות: התיק פשוט קופא
     * אצלו, והוא לומד את התשובה מהיעדרה. מי שמגלה לבד שהפסיד מפסיק
     * להגיש הצעות — וההצעות הן כל המוצר.
     *
     * הנוסח עובדתי ולא מנחם-מזויף: נבחר אחר, זה לא אומר דבר על ההצעה,
     * הפיד ממשיך. כשל כאן לא מפיל את הבחירה — החיבור של הלקוח כבר
     * נוצר, וההודעות האלה הן נימוס, לא תנאי.
     */
    const interested = (c.interested as { id?: string }[] | undefined) ?? [];
    const others = interested
      .map((l) => l?.id)
      .filter((id): id is string => !!id && id !== lawyerId);
    await Promise.allSettled(
      others.map((id) =>
        notify(id, {
          type: "not_chosen",
          title: "הלקוח בחר הפעם עורך דין אחר",
          body: `הפנייה "${c.title || c.category}" נסגרה. זה לא אומר דבר על ההצעה שלך — ברוב הפניות נבחר אחד מתוך כמה טובים. הפיד שלך ממשיך להתעדכן.`,
          titleKey: "notifNotChosenTitle",
          bodyKey: "notifNotChosenBody",
          params: { title: c.title || c.category },
          caseId,
        }),
      ),
    );
  }
}

/* ---------- מדריך עורכי הדין (ציבורי למחוברים — משמש ל-fan-out ולכרטיסי עו"ד) ---------- */

export interface LawyerProfileDoc {
  name: string;
  specialties: string[];
  barYear?: string;
  university?: string;
  city?: string;
  /**
   * שפות שבהן עורך הדין נותן שירות. ריק/חסר = עברית בלבד — ברירת
   * המחדל של השוק, ולכן גם ברירת המחדל הבטוחה לפרופילים ישנים.
   */
  languages?: string[];
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

/**
 * הפרופיל המקצועי בזמן אמת.
 *
 * קודם זו הייתה קריאה חד-פעמית ב-useEffect: היא רצה בהתחברות — לפני
 * שהפרופיל בכלל נוצר — והחזירה null. ההרשמה כתבה את הפרופיל, אבל שום
 * דבר לא הפעיל את הקריאה מחדש, ולכן הפיד המשיך לחשוב שאין לעורך הדין
 * תחומים ולא סינן כלום. עורך דין שסימן נזיקין ראה תיקי דיני עבודה
 * בדיוק במסך הראשון שלו.
 */
export function watchLawyerProfile(
  uid: string,
  cb: (p: LawyerProfileDoc | null) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    doc(fbDb(), "lawyerProfiles", uid),
    (snap) => cb(snap.exists() ? (snap.data() as LawyerProfileDoc) : null),
    (err) => onError?.(err),
  );
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

/**
 * עדכון תחומי העיסוק — בלי לגעת בסטטוס האימות.
 *
 * **שני מסמכים, בכוונה.** התחומים נקראים משני מקומות שונים: הפיד קורא
 * מ-`lawyerProfiles`, ובורר ההתראות בשרת שואל את `verifications`. כתיבה
 * לאחד בלבד הייתה מפצלת אותם — עורך דין שמקבל התראה על תיק שאינו מופיע
 * לו בפיד, או ההפך. שתי הכתיבות כאן, במקום אחד, כדי שלא יהיה מסלול
 * שמעדכן חצי.
 *
 * **ולמה זו פונקציה נפרדת ולא הגשה מחדש:** המסלול היחיד לעדכון תחומים
 * היה טופס האימות המלא, שכותב `status: "pending"` — כלומר עורך דין
 * מאומת שהוסיף תחום **איבד את האימות** ויצא מהפיד עד לאישור חוזר.
 * והאפליקציה עצמה שולחת אותו לשם ("פניות בתחומים שלא סימנת").
 *
 * תחום עיסוק אינו טענת הסמכה ואינו דורש בדיקת מסמכים מחדש. חוקי הגישה
 * כבר מאפשרים את העדכון הזה: מותר לעדכן את רשומת האימות כל עוד `status`
 * אינו בין השדות שהשתנו.
 */
export async function updateLawyerSpecialties(
  uid: string,
  specialties: string[],
  languages?: string[],
): Promise<void> {
  const fields: Record<string, unknown> = { specialties };
  if (languages) fields.languages = languages;
  await Promise.all([
    setDoc(doc(fbDb(), "lawyerProfiles", uid), fields, { merge: true }),
    setDoc(doc(fbDb(), "verifications", uid), fields, { merge: true }),
  ]);
}

/*
 * מיפוי קטגוריה→התמחות חי ב-src/lib/specialties.ts, כי גם השרת צריך אותו
 * והוא אינו יכול לייבא קובץ שנוגע ב-firebase. הייצוא כאן נשמר כדי שקוראים
 * קיימים לא יישברו.
 *
 * הוסרה מכאן fanOutNewCase — היא סיננה לפי תחום כמו שצריך, אבל רצה
 * בדפדפן של הלקוח ואיש לא קרא לה מאז שההזמנה עברה לשרת. הגרסה החיה
 * היא adminApprovedLawyerIds(category) ב-ai/server-admin.ts.
 */
export { categoryMatchesSpecialties } from "./specialties";

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
  /*
   * שגיאה כאן היא לרוב דחיית הרשאות או נפילת רשת, והיא *אינה* "אין תוצאות".
   * עד עכשיו היא נבלעה ל-cb([]) — כלומר המסך הציג מצב ריק תקין בזמן שהוא
   * שבור. זה קרה ארבע פעמים נפרד בפרויקט הזה. הכשל מדווח, ולא ממציא נתון.
   */
  onError?: (err: unknown) => void,
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
    (err) => onError?.(err),
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
/** ימי הצינון — משוכפל מהשרת בכוונה, כדי שהלקוח לא ייבא קוד שרת. */
export const DELETION_GRACE_DAYS = 7;

/**
 * ביטול מחיקה מתוזמנת — נקרא בכל התחברות מוצלחת.
 *
 * ההתחברות *היא* הביטול: מי שחוזר ונכנס לחשבון מצהיר בכך שהוא רוצה
 * אותו. אין צורך במסך נפרד שמבקש ממנו לאשר שוב מה שהוא עשה בפועל.
 */
export async function cancelScheduledDeletion(uid: string): Promise<boolean> {
  try {
    const ref = doc(fbDb(), "deletionRequests", uid);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().status !== "scheduled") return false;
    await updateDoc(ref, { status: "cancelled", cancelledAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

/**
 * הסרת תיק שנתקע בבדיקה.
 *
 * תיק שלא הושלמה בדיקתו אין בו תוכן ואף עורך דין לא ראה אותו — ולכן
 * הסרה היא האמת, ולא סימון "נדחה" שמשמעותו 'לא נמצאה עילה'. החוקים
 * מתירים ללקוח למחוק רק תיק שלו שעדיין בבדיקה.
 */
/**
 * משיכת פנייה ע"י הפונה.
 *
 * לא מחיקה: התיק נשאר עם ההצעות ועם ההיסטוריה, ורק יורד מהפיד. עורך
 * דין שקרא תזכיר וכתב הצעה מדורגת השקיע עבודה אמיתית — היעלמות בשקט
 * אינה דרך להתייחס למי שגייסנו אישית, ולכן כל מי שהביע עניין מקבל
 * הודעה.
 *
 * מותרת רק מ-matching ומ-has_interest. תיק מחובר אינו נמשך: בשלב הזה
 * יש יחסי עו"ד-לקוח, וסיומם הוא ביניהם.
 */
export async function withdrawCase(caseId: string): Promise<void> {
  const c = await readCaseRaw(caseId);
  await updateDoc(doc(fbDb(), "cases", caseId), {
    status: "withdrawn",
    withdrawnAt: Date.now(),
  });
  // ההתראה אינה חוסמת — המשיכה עצמה כבר נרשמה
  const title = (c?.title as string) || (c?.category as string) || "";
  await Promise.all(
    (((c?.interestedIds as string[]) ?? [])).map((lid) =>
      notify(lid, {
        type: "case_withdrawn",
        title: "הפונה משך את הפנייה",
        body: `"${title}" כבר אינו פתוח. תודה על הזמן שהשקעת.`,
        titleKey: "notifWithdrawnTitle",
        bodyKey: "notifWithdrawnBody",
        params: { title },
        caseId,
      }).catch(() => undefined),
    ),
  );
}

export async function removeStuckCase(caseId: string): Promise<void> {
  await deleteDoc(doc(fbDb(), "cases", caseId));
}

export async function requestAccountDeletion(input: {
  userId: string;
  email: string;
  reason: string;
}): Promise<void> {
  /*
   * מזהה המסמך הוא ה-uid — כך שבקשה חוזרת מעדכנת ולא יוצרת שנייה,
   * וההתחברות יודעת בדיוק איזה מסמך לבטל בלי שאילתה.
   */
  const scheduledFor = Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
  await setDoc(doc(fbDb(), "deletionRequests", input.userId), {
    ...input,
    status: "scheduled",
    createdAt: Date.now(),
    scheduledFor,
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
  /*
   * שגיאה כאן היא לרוב דחיית הרשאות או נפילת רשת, והיא *אינה* "אין תוצאות".
   * עד עכשיו היא נבלעה ל-cb([]) — כלומר המסך הציג מצב ריק תקין בזמן שהוא
   * שבור. זה קרה ארבע פעמים נפרד בפרויקט הזה. הכשל מדווח, ולא ממציא נתון.
   */
  onError?: (err: unknown) => void,
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
    (err) => onError?.(err),
  );
}

/**
 * ביצוע מחיקה אמיתי: השרת מוחק את החשבון וכל הנגזר ממנו, ורק אז
 * הבקשה מסומנת כטופלה. קודם הכפתור רק סימן — והתקנון הבטיח מחיקה מלאה.
 */
export async function markDeletionDone(id: string, targetUid: string): Promise<void> {
  const { purgeAccountFn } = await import("./ai/intake.functions");
  const { fbAuth } = await import("./firebase");
  const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
  await purgeAccountFn({ data: { targetUid, idToken } });
  await updateDoc(doc(fbDb(), "deletionRequests", id), { status: "done" });
}

/**
 * הרצה יבשה של המחיקה — מחזירה בדיוק מה היה נמחק, בלי לגעת בכלום.
 * זו הדרך לאמת את הפעולה ההרסנית ביותר במערכת לפני שמריצים אותה באמת.
 */
export async function previewDeletion(
  targetUid: string,
): Promise<{ cases: number; paths: string[]; storage: string[] }> {
  const { purgeAccountFn } = await import("./ai/intake.functions");
  const { fbAuth } = await import("./firebase");
  const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
  return purgeAccountFn({ data: { targetUid, idToken, dryRun: true } });
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
  // "אין תקלות. הכול עובד" כשהמאזין עצמו נדחה זו בדיוק ההטעיה שהיומן בא למנוע
  onError?: (err: unknown) => void,
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
    (err) => {
      cb([]);
      onError?.(err);
    },
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
  /** דירוגי לקוחות שהצטברו — נכתבים בשרת בלבד (rateLawyerFn). */
  ratings: number;
  ratingSum: number;
  /** חיבורים שהתממשו — הבסיס למודל הניסיון. נכתב בשרת בלבד. */
  connections?: number;
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
      ratings: Number(d.ratings ?? 0),
      ratingSum: Number(d.ratingSum ?? 0),
      connections: Number(d.connections ?? 0),
    };
  } catch {
    return null;
  }
}

/*
 * ניסוח זמן תגובה ממוצע — בשפת הקורא. null כשאין עדיין נתונים.
 * הניסוחים יושבים באותה טבלה כמו agoLabel: אלה שני פנים של אותו נתון.
 */
const RESP_UNIT: Record<string, { m: (n: number) => string; h: (n: number) => string; d: (n: number) => string }> = {
  he: { m: (n) => `${n} דק׳`, h: (n) => `${n} שעות`, d: (n) => `${n} ימים` },
  en: { m: (n) => `${n}m`, h: (n) => `${n}h`, d: (n) => `${n}d` },
  ru: { m: (n) => `${n} мин`, h: (n) => `${n} ч`, d: (n) => `${n} дн.` },
  ar: { m: (n) => `${n} دقائق`, h: (n) => `${n} ساعات`, d: (n) => `${n} أيام` },
  es: { m: (n) => `${n} min`, h: (n) => `${n} h`, d: (n) => `${n} días` },
  fr: { m: (n) => `${n} min`, h: (n) => `${n} h`, d: (n) => `${n} jours` },
};

export function avgResponseLabel(stats: LawyerStats | null): string | null {
  if (!stats || stats.responses < 1) return null;
  const u = RESP_UNIT[docLang()] ?? RESP_UNIT.he;
  const mins = Math.round(stats.totalResponseMs / stats.responses / 60000);
  if (mins < 60) return u.m(Math.max(1, mins));
  const hours = Math.round(mins / 60);
  if (hours < 24) return u.h(hours);
  return u.d(Math.round(hours / 24));
}

/** ממוצע הדירוגים של עו"ד. null כשאין עדיין דירוגים — ואז לא מציגים כוכבים. */
export function avgRating(stats: LawyerStats | null): number | null {
  if (!stats || stats.ratings < 1) return null;
  return stats.ratingSum / stats.ratings;
}

/**
 * הדירוג שכבר ניתן על תיק, אם ניתן. משמש כדי לא לבקש מהלקוח לדרג פעמיים.
 * החוקים מרשים לו לקרוא רק את הדירוג שהוא עצמו נתן.
 */
export async function readMyRating(
  caseId: string,
): Promise<{ stars: number; note: string } | null> {
  try {
    const snap = await getDoc(doc(fbDb(), "ratings", caseId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { stars: Number(d.stars ?? 0), note: String(d.note ?? "") };
  } catch {
    return null;
  }
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
  /** הרגע שבו התיק נעשה זמין לעורכי דין — בסיס למדידת זמן להצעה ראשונה. */
  validatedAt?: number;
  /** חותמת ההצעה המוקדמת ביותר, אם הייתה. */
  firstOfferAt?: number;
}

/* ---------- ציר הזמן שאחרי החיבור ---------- */

/**
 * אבני הדרך שעורך הדין מסמן לאחר החיבור.
 * זה לא רק עדכון ללקוח: זה הרגע שבו הפלטפורמה יודעת אם החיבור **הבשיל** —
 * הנתון שעליו יתבסס החיוב פר-חיבור, ושעד היום לא היה קיים כלל.
 */
export type MilestoneKey = "met" | "demandSent" | "filed" | "closed";

export const MILESTONE_ORDER: MilestoneKey[] = ["met", "demandSent", "filed", "closed"];

export interface CaseMilestone {
  key: MilestoneKey;
  at: number;
  note?: string;
}

/** אבני הדרך של התיק — בזמן אמת, לשני הצדדים. */
export function watchMilestones(
  caseId: string,
  cb: (rows: CaseMilestone[]) => void,
  /*
   * שגיאה כאן היא לרוב דחיית הרשאות או נפילת רשת, והיא *אינה* "אין תוצאות".
   * עד עכשיו היא נבלעה ל-cb([]) — כלומר המסך הציג מצב ריק תקין בזמן שהוא
   * שבור. זה קרה ארבע פעמים נפרד בפרויקט הזה. הכשל מדווח, ולא ממציא נתון.
   */
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    collection(fbDb(), "cases", caseId, "milestones"),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as CaseMilestone) }));
      rows.sort(
        (a, b) => MILESTONE_ORDER.indexOf(a.key) - MILESTONE_ORDER.indexOf(b.key) || a.at - b.at,
      );
      cb(rows);
    },
    (err) => onError?.(err),
  );
}

/** עורך הדין הנבחר מסמן אבן דרך. מזהה המסמך הוא המפתח — סימון חוזר מעדכן. */
export async function markMilestone(
  caseId: string,
  key: MilestoneKey,
  note?: string,
): Promise<void> {
  await setDoc(doc(fbDb(), "cases", caseId, "milestones", key), {
    key,
    at: Date.now(),
    ...(note?.trim() ? { note: stripContactInfo(note.trim()) } : {}),
  });
  /*
   * אבן הדרך האחרונה סוגרת את התיק.
   *
   * קודם התיק נשאר "נוצר חיבור" לנצח: הוא המשיך לשבת ברשימת התיקים
   * הפעילים של עורך הדין, התערבב אצל הלקוח עם תיקים חיים, ונספר במשפך
   * כחיבור פעיל. אחרי עשרה לקוחות הרשימה הייתה מתמלאת בתיקים גמורים.
   */
  /*
   * ה-catch שהיה כאן בלע את הכשל, והתוצאה הייתה בדיוק מה שדווח: אבן
   * הדרך נשמרה ומוצגת כ"סומן", אבל התיק נשאר "נוצר חיבור" והמשיך לתפוס
   * מקום ברשימת התיקים הפעילים. מהמסך זה נראה כאילו הכל עבד.
   *
   * עכשיו הכשל עולה החוצה, והמסך אומר שהסגירה לא הושלמה.
   */
  if (key === "closed") {
    await updateDoc(doc(fbDb(), "cases", caseId), { status: "closed" });
  }

  // התראה ללקוח — זה כל הטעם: שהוא לא ישאל "מה קורה עם התיק שלי"
  const c = await readCaseRaw(caseId);
  if (c) {
    const customNote = note?.trim();
    await notify(c.clientId, {
      type: "case_milestone",
      title: MILESTONE_TITLES[key],
      body: customNote || MILESTONE_BODIES[key],
      titleKey: `notifMsTitle_${key}`,
      // הערה אישית של עורך הדין מוצגת כלשונה — מפתח רק לנוסח הקבוע
      ...(customNote ? {} : { bodyKey: `notifMsBody_${key}` }),
      caseId,
    });
  }
}

/**
 * סוגר תיק שאבן הדרך האחרונה שלו סומנה אך הסטטוס לא התעדכן.
 *
 * נדרש בגלל תיקים שנתקעו לפני שהכשל השקט תוקן: מסמך אבן הדרך "closed"
 * קיים, אבל הסטטוס נשאר "connected" והתיק ממשיך לתפוס מקום ברשימה
 * הפעילה. במקום לתקן ידנית במסד, המסך מרפא את עצמו בפתיחה הבאה.
 *
 * לעולם לא זורקת — זו פעולת תחזוקה, וכשל בה לא אמור להפריע לצפייה בתיק.
 */
export async function reconcileClosedCase(caseId: string): Promise<boolean> {
  try {
    const ms = await getDoc(doc(fbDb(), "cases", caseId, "milestones", "closed"));
    if (!ms.exists()) return false;
    const snap = await getDoc(doc(fbDb(), "cases", caseId));
    if (!snap.exists() || (snap.data() as CaseDoc).status === "closed") return false;
    await updateDoc(doc(fbDb(), "cases", caseId), { status: "closed" });
    return true;
  } catch {
    return false;
  }
}

const MILESTONE_TITLES: Record<MilestoneKey, string> = {
  met: "נפגשתם עם עורך הדין",
  demandSent: "נשלח מכתב דרישה",
  filed: "הוגשה תביעה",
  closed: "התיק הסתיים",
};

const MILESTONE_BODIES: Record<MilestoneKey, string> = {
  met: "עורך הדין סימן שהפגישה התקיימה.",
  demandSent: "מכתב הדרישה נשלח לצד שכנגד.",
  filed: "התביעה הוגשה לבית המשפט.",
  closed: "עורך הדין סימן שהטיפול בתיק הושלם.",
};

/* ---------- לוח המשפך — חדר הבקרה של האדמין ---------- */

export interface FunnelStats {
  created: number;
  rejected: number;
  passed: number;
  withInterest: number;
  connected: number;
  /** זמן חציוני מרגע שהתיק נעשה זמין ועד ההצעה הראשונה, בדקות. */
  medianFirstOfferMins: number | null;
  /** לפי קטגוריה: כמה אושרו וכמה מהם עדיין בלי אף התעניינות. */
  byCategory: { category: string; passed: number; noInterest: number }[];
}

/**
 * המשפך מחושב מהארכיון שכבר נטען — בלי שאילתות נוספות.
 * "אושרו ואפס התעניינות" הוא אות הכיול החשוב: אם בקטגוריה שלמה עורכי דין
 * לא נוגעים בתיקים, כנראה שומר הסף רחב מדי שם.
 */
/**
 * המשפך שלפני התיק — כמה אנשים בכלל התחילו, וכמה נשרו בדרך.
 *
 * לוח הבקרה ידע לספור תיקים, אבל תיק נוצר רק בסוף. מי שפתח את הצ'אט,
 * כתב שתי שורות ונטש היה בלתי נראה — וזה רוב האנשים בשלב השקה.
 * נספרים משתמשים ייחודיים ולא אירועים, כדי שרענון דף לא ינפח את המספר.
 */
export interface IntakeFunnel {
  opened: number;
  engaged: number;
  decided: number;
  submitted: number;
  notSuitable: number;
}

export function watchIntakeFunnel(
  cb: (f: IntakeFunnel) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    collection(fbDb(), "funnelEvents"),
    (snap) => {
      const uniq: Record<string, Set<string>> = {};
      for (const d of snap.docs) {
        const { uid, event } = d.data() as { uid: string; event: string };
        (uniq[event] ??= new Set()).add(uid);
      }
      const n = (e: string) => uniq[e]?.size ?? 0;
      cb({
        opened: n("intake_opened"),
        engaged: n("intake_first_message"),
        decided: n("intake_ready") + n("intake_not_suitable"),
        submitted: n("intake_submitted"),
        notSuitable: n("intake_not_suitable"),
      });
    },
    (err) => onError?.(err),
  );
}

export function computeFunnel(rows: AdminCaseRow[]): FunnelStats {
  const passedRows = rows.filter((r) => r.status !== "rejected" && r.status !== "validating");
  const offerGaps = rows
    .filter((r) => r.validatedAt && r.firstOfferAt && r.firstOfferAt > r.validatedAt)
    .map((r) => (r.firstOfferAt! - r.validatedAt!) / 60000)
    .sort((a, b) => a - b);

  const cats = new Map<string, { passed: number; noInterest: number }>();
  for (const r of passedRows) {
    const key = r.category || "אחר";
    const cur = cats.get(key) ?? { passed: 0, noInterest: 0 };
    cur.passed += 1;
    if (r.interestedCount === 0) cur.noInterest += 1;
    cats.set(key, cur);
  }

  return {
    created: rows.length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    passed: passedRows.length,
    withInterest: rows.filter((r) => r.interestedCount > 0).length,
    // תיק שהסתיים הוא חיבור שהבשיל, לא חיבור שנעלם
    connected: rows.filter((r) => r.status === "connected" || r.status === "closed").length,
    medianFirstOfferMins: offerGaps.length
      ? Math.round(offerGaps[Math.floor(offerGaps.length / 2)])
      : null,
    byCategory: [...cats.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.noInterest - a.noInterest || b.passed - a.passed),
  };
}

export function watchAllCasesAdmin(
  cb: (rows: AdminCaseRow[]) => void,
  /*
   * שגיאה כאן היא לרוב דחיית הרשאות או נפילת רשת, והיא *אינה* "אין תוצאות".
   * עד עכשיו היא נבלעה ל-cb([]) — כלומר המסך הציג מצב ריק תקין בזמן שהוא
   * שבור. זה קרה ארבע פעמים נפרד בפרויקט הזה. הכשל מדווח, ולא ממציא נתון.
   */
  onError?: (err: unknown) => void,
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
              validatedAt: c.validatedAt,
              firstOfferAt: Object.values(c.offers ?? {})
                .map((o) => o.at)
                .filter((n) => typeof n === "number")
                .sort((a, b) => a - b)[0],
            };
          })
          .sort((a, b) => b.createdAt - a.createdAt),
      );
    },
    (err) => onError?.(err),
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
  /**
   * מפתחות תרגום — הפעמון מתורגם לשפת הקורא בזמן קריאה. הכותרת
   * והגוף בעברית נשארים כתובים לצידם: התראות ישנות, ומסוף אחורה.
   */
  titleKey?: string;
  bodyKey?: string;
  params?: Record<string, string>;
}

export async function notify(
  userId: string,
  n: {
    type: string;
    title: string;
    body: string;
    caseId?: string;
    titleKey?: string;
    bodyKey?: string;
    params?: Record<string, string>;
  },
): Promise<void> {
  // Firestore דוחה undefined — האופציונליים נכנסים רק כשקיימים
  const { titleKey, bodyKey, params, ...core } = n;
  await addDoc(collection(fbDb(), "notifications"), {
    userId,
    ...core,
    ...(titleKey ? { messageKey: titleKey, titleKey } : {}),
    ...(bodyKey ? { bodyKey } : {}),
    ...(params && Object.keys(params).length ? { params } : {}),
    read: false,
    createdAt: Date.now(),
  });
}

export function watchNotifications(
  uid: string,
  cb: (items: AppNotification[]) => void,
  /*
   * שגיאה כאן היא לרוב דחיית הרשאות או נפילת רשת, והיא *אינה* "אין תוצאות".
   * עד עכשיו היא נבלעה ל-cb([]) — כלומר המסך הציג מצב ריק תקין בזמן שהוא
   * שבור. זה קרה ארבע פעמים נפרד בפרויקט הזה. הכשל מדווח, ולא ממציא נתון.
   */
  onError?: (err: unknown) => void,
): () => void {
  const q = query(collection(fbDb(), "notifications"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }))
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  }, (err) => onError?.(err));
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(fbDb(), "notifications", id), { read: true });
}
