import type { Role } from "./types";

/**
 * לאן הולכים ברגע שההתחברות הסתיימה.
 *
 * זה היה קודם שני מסלולים נפרדים, וזה מה שנשבר: מי שהתחבר בפופאפ נשלח
 * ל-/onboarding מתוך הפונקציה שקראה לגוגל, ומי שהתחבר בהפניה — כלומר כל
 * מי שנכנס מהטלפון — חזר לעמוד טעון מחדש, שבו אותה פונקציה כבר לא קיימת,
 * ונשלח הביתה. התוצאה: משתמש חדש לגמרי דילג על ההתחייבות ("המידע שאשתף
 * הוא אמיתי"), ולכן גם על לחיצת היד שמנגנת בסופה.
 *
 * לכן ההחלטה כאן נשענת רק על מצב המשתמש — תפקיד והאם כבר עבר את הפתיחה —
 * ולא על השאלה איך הוא הגיע. אותה תשובה בדיוק לשני המסלולים.
 */
export function postAuthRoute(state: {
  role: Role | null;
  onboarded: boolean;
}): "/" | "/lawyer" | "/onboarding" | "/lawyer-onboarding" {
  // ברירת המחדל היא לקוח — כך זה היה מאז ומעולם במסך ההתחברות
  const lawyer = state.role === "lawyer";
  if (!state.onboarded) return lawyer ? "/lawyer-onboarding" : "/onboarding";
  return lawyer ? "/lawyer" : "/";
}

/**
 * חשבונות שנוצרו לפני שהדגל קיים.
 *
 * הם לא סימנו onboardedAt בשום מקום, ובלי החריג הזה כולם היו נשלחים שוב
 * למסך התנאים — ועורך דין ותיק היה נזרק בחזרה לאשף האימות המלא. תאריך
 * היצירה מגיע מ-Firebase Auth עצמו, כך שאין צורך בקריאה נוספת.
 */
export const ONBOARDING_FLAG_SINCE = Date.parse("2026-08-04T00:00:00Z");

export function isOnboarded(profile: {
  onboardedAt?: unknown;
  accountCreatedAt?: string | null;
}): boolean {
  if (profile.onboardedAt) return true;
  const created = profile.accountCreatedAt
    ? Date.parse(profile.accountCreatedAt)
    : NaN;
  return Number.isFinite(created) && created < ONBOARDING_FLAG_SINCE;
}
