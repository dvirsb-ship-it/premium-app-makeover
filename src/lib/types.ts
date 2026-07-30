export type Role = "client" | "lawyer";

export type CaseStatus =
  | "validating"
  | "matching"
  | "has_interest"
  | "connected"
  | "rejected";

export interface Lawyer {
  id: string;
  name: string;
  firm: string;
  specialty: string;
  rating: number;
  reviews: number;
  years: number;
  initials: string;
  blurb: string;
}

export interface ChatMessage {
  id: string;
  from: "assistant" | "user";
  text: string;
  /** תמונות שצורפו להודעה — כתובות blob מקומיות לתצוגה בלבד. */
  images?: string[];
  /** תיאור התמונות עבור ה-AI. נשלח אליו כטקסט ואינו מוצג למשתמש. */
  aiNote?: string;
}

export interface Case {
  id: string;
  title: string;
  category: string;
  summary: string;
  createdAt: number;
  status: CaseStatus;
  interested: Lawyer[];
  chosenLawyerId?: string;
  /** הצעות שצירפו עורכי דין להבעת העניין, לפי מזהה עו"ד. */
  offers?: Record<string, CaseOffer>;
  /** כמה עורכי דין מאומתים בתחום קיבלו את התיק. undefined = תיק ישן. */
  notifiedLawyers?: number;
}

/** מודל שכר הטרחה. בנזקי גוף בישראל אחוזים מהפיצוי הם הנפוץ ביותר. */
export type FeeModel = "contingency" | "hourly" | "fixed";

/** מי נושא בהוצאות הנלוות — אגרות, חוות דעת מומחה, שמאי. */
export type ExpensesTerm = "included" | "advanced" | "client";

export interface CaseOffer {
  model: FeeModel;
  /** אחוז מהפיצוי / תעריף שעתי / סכום קבוע — לפי המודל */
  amount: number;
  /** התחייבות שאין תשלום אם התיק לא זוכה */
  noWinNoFee: boolean;
  expenses: ExpensesTerm;
  /** הערכת ההוצאות הנלוות — הפער שבו לקוחות נכווים */
  expensesEstimate: string;
  duration: string;
  note: string;
  at: number;
  /** הצעות מהגרסה החופשית הישנה — נשמרות לתצוגה בלבד */
  fee?: string;
}

export interface FeedCase {
  id: string;
  title: string;
  category: string;
  summary: string;
  location: string;
  postedAgo: string;
  urgency: "רגיל" | "דחוף";
  interestedCount: number;
  expressed?: boolean;
  /** התאמה לעו"ד הצופה — לפי קרבה והתמחות. */
  match?: "high" | "medium";
  /**
   * חודשים שנותרו עד ההתיישנות. undefined כשאין תאריך אירוע תקין.
   * זה הנתון שגורם לעורך דין לקפוץ על תיק — וה-AI כבר חישב אותו.
   */
  limitationMonthsLeft?: number;
}
