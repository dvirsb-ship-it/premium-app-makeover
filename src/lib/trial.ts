/**
 * מודל הניסיון: שלושת החיבורים הראשונים חינם, ואז מנוי.
 *
 * שלושה עקרונות שקבעו את הצורה, וכל אחד מהם נבחר מול חלופה:
 *
 * 1. סופרים *חיבורים* ולא הצעות. הצעה אינה עולה לאיש, והלקוח מרוויח
 *    מכל הצעה נוספת שהוא יכול להשוות — הגבלת הצעות הייתה פוגעת דווקא
 *    בו. חיבור הוא ערך שהתממש: לקוח בחר.
 *
 * 2. הניסיון נמדד בערך ולא בזמן. "14 יום" מתפוגג אצל מי שנרשם בשבוע
 *    עמוס ולא בדק כלום; שלושה לקוחות אומרים שהוא כבר יודע מניסיון
 *    שהמערכת עובדת בשבילו. זה הרגע הנכון לבקש תשלום.
 *
 * 3. הקיר עולה לפני לקיחת לקוח, לעולם לא אחרי. תיקים שכבר נפתחו
 *    ממשיכים לעבוד במלואם — אין מצב שבו תיק חי של אדם מוחזק כבן
 *    ערובה עד שעורך דין ישלם.
 */

export const FREE_CONNECTIONS = 3;

/**
 * חצי שנה ללא תשלום מיום אישור האימות — ההבטחה שניתנה בקמפיין הגיוס
 * ("חצי השנה ללא תשלום נספרת מיום האישור — לא מהיום").
 *
 * הנגזרת מתאריך האישור ולא משדה נפרד: אין דרך ששדה יישכח או ייכתב
 * שגוי, וההבטחה מתקיימת לכל מי שאושר, אוטומטית.
 */
export const FOUNDING_MONTHS = 6;

export function foundingUntil(approvedAt?: number | null): number | null {
  if (!approvedAt || !Number.isFinite(approvedAt) || approvedAt <= 0) return null;
  const d = new Date(approvedAt);
  d.setMonth(d.getMonth() + FOUNDING_MONTHS);
  return d.getTime();
}

export function isFounding(approvedAt?: number | null, now = Date.now()): boolean {
  const until = foundingUntil(approvedAt);
  return until !== null && now < until;
}

export interface TrialState {
  /** חיבורים שנוצלו מתוך המכסה. */
  used: number;
  /** כמה נותרו לפני שהקיר עולה. */
  left: number;
  /** רשאי להביע עניין בתיקים חדשים. */
  canExpressInterest: boolean;
  /** הגיע בדיוק לקצה — מציגים את מסך ההצטרפות. */
  exhausted: boolean;
}

export interface TrialInput {
  connections?: number;
  /** מנוי בתשלום פעיל. */
  subscribed?: boolean;
  /** מתי אושר האימות — ממנו נגזרת תקופת המייסדים. */
  approvedAt?: number | null;
  /** מוזרק לבדיקות. */
  now?: number;
}

export function trialState(input: TrialInput): TrialState {
  const now = input.now ?? Date.now();
  // מנוי בתשלום או תקופת המייסדים — אין מכסה, ואין מונה שמציק
  if (input.subscribed || isFounding(input.approvedAt, now)) {
    return { used: 0, left: Infinity, canExpressInterest: true, exhausted: false };
  }
  const used = Math.max(0, Math.floor(input.connections ?? 0));
  const left = Math.max(0, FREE_CONNECTIONS - used);
  return {
    used,
    left,
    canExpressInterest: left > 0,
    exhausted: left === 0,
  };
}
