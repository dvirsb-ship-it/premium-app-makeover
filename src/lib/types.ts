export type Role = "client" | "lawyer";

export type CaseStatus =
  | "validating"
  | "matching"
  | "has_interest"
  | "connected"
  /* התיק הושלם — עורך הדין סימן את אבן הדרך האחרונה */
  | "closed"
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
  /*
   * מה שבאמת ידוע על עורך הדין, מתוך הפרופיל שהוא עצמו מילא באימות.
   * specialty/firm/blurb היו מקודדים כמחרוזת ריקה — ולכן דף הפרופיל
   * הציג כותרות בלי תוכן. אלה השדות שיש להם מקור.
   */
  specialties?: string[];
  city?: string;
  university?: string;
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
  /**
   * אחוז מדורג לפי שלב — כך השוק באמת עובד בנזקי גוף: אחוז נמוך בפשרה
   * מוקדמת, גבוה יותר משהוגשה תביעה, והגבוה ביותר בפסק דין (בפלת"ד:
   * 8/11/13 בתקרה שבדין). כשהם קיימים, amount הוא המדרגה הראשונה —
   * "עד פשרה לפני הגשת תביעה".
   */
  postSuitPercent?: number;
  judgmentPercent?: number;
  /**
   * מקדמה בש"ח שמתקזזת משכר הטרחה — מקובלת בשעתי ובגלובלי. לא קיימת
   * באחוזים: שם ההבטחה היא "לא זכית — לא שילמת".
   */
  retainer?: number;
  /**
   * מע"מ. השפה של השוק היא "+ מע"מ", ולכן זו ברירת המחדל בטופס; הצעות
   * ישנות בלי השדה מוצגות כפי שהוצעו — לא ננסח מחדש הצעה בדיעבד.
   */
  vat?: "plus" | "included";
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
  /** השפה שבה הלקוח ניהל את הראיון. חסר = עברית. */
  clientLang?: string;
  /**
   * הלקוח מדבר שפה שעורך הדין הצופה לא סימן שהוא נותן בה שירות.
   * סימון בלבד — לא חסימה: עורך דין עשוי להיעזר במתרגם או בקולגה.
   */
  langMismatch?: boolean;
  /**
   * חודשים שנותרו עד ההתיישנות. undefined כשאין תאריך אירוע תקין.
   * זה הנתון שגורם לעורך דין לקפוץ על תיק — וה-AI כבר חישב אותו.
   */
  limitationMonthsLeft?: number;
}
