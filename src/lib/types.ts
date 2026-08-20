export type Role = "client" | "lawyer";

export type CaseStatus =
  | "validating"
  /** הסיכום העובדתי מוכן, והפונה טרם אישר אותו. אינו נחשף לאיש. */
  | "summary_ready"
  | "matching"
  | "has_interest"
  | "connected"
  /* התיק הושלם — עורך הדין סימן את אבן הדרך האחרונה */
  | "closed"
  /*
   * הפונה משך את הפנייה. נבדל מ-closed בכוונה: "הטיפול הסתיים" הוא
   * שקר על תיק שנמשך, ועורך דין שהשקיע זמן בהצעה ראוי לדעת מה באמת קרה.
   */
  | "withdrawn"
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
  /**
   * שפות השירות. ריק/חסר = עברית בלבד — גם ברירת המחדל של השוק וגם
   * הפירוש הבטוח לפרופילים שנשמרו לפני שהשדה הזה נוסף לצילום.
   */
  languages?: string[];
  /**
   * תמונה ו"על עצמי" — מצולמים לתוך התיק יחד עם שאר הפרופיל.
   *
   * הצילום הוא בכוונה: זה מה שהלקוח ראה **כשהוא בחר**. אם עורך הדין
   * יחליף תמונה מחר, ההצעה שהוצגה ללקוח לא משתנה למפרע.
   */
  photoUrl?: string;
  bio?: string;
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
  /** מתי הפונה משך את הפנייה — קובע כמה זמן היא נספרת במכסה. */
  withdrawnAt?: number;
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
  /**
   * הצהרת היעדר ניגוד עניינים, כפי שאושרה על התיק הזה (11/8/2026).
   *
   * נשמרת **עם ההצעה** ולא בפרופיל: ניגוד עניינים תלוי בצדדים של תיק
   * מסוים, ולכן אישור גורף היה חסר משמעות. הצהרה שאינה נשמרת אינה
   * הצהרה — ביום שבו יישאל "האם הוא בדק", התשובה חייבת להיות במסמך.
   *
   * אופציונלי: הצעות שקדמו לשדה נשארות כפי שהוגשו. חסר ≠ "לא בדק".
   */
  noConflict?: boolean;
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
  /** מד ההתאמה 0..100 — כללים גלויים בלבד (ראו lib/match.ts). */
  matchScore?: number;
  /** מפתחות i18n של הסיבות — מוצגים לעורך הדין כפי שהם. */
  matchReasons?: string[];
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
