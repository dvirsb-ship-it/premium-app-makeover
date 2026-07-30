import type { User } from "firebase/auth";

/**
 * שתי רמות הרשאה, ובכוונה:
 *
 * - **אדמין-על** (justask.adv) — החשבון התפעולי. הוא מאשר עורכי דין, מכריע
 *   בערעורים ומסמן טיפול. כל פעולה שמשנה משהו עבור משתמש אחר עוברת דרכו.
 * - **אדמין צופה** (dvirsb) — רואה את כל המשרד, אבל אינו פועל. זה חשבון
 *   הבדיקות כלקוח, וטעות של קליק בזמן בדיקה לא אמורה לאשר עורך דין אמיתי.
 *
 * הרשימות כאן חייבות להתאים ל-isAdmin()/isSuperAdmin() בחוקי Firestore ו-Storage.
 */
export const SUPER_ADMIN_EMAILS = ["justask.adv@gmail.com"];

export const ADMIN_EMAILS = ["dvirsb@gmail.com", ...SUPER_ADMIN_EMAILS];

/** גישת צפייה למשרד הטכנולוגי. */
export function isAdminUser(user: User | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}

/** הרשאה לפעול — אישור עו"ד, הכרעה בערעור, סימון טיפול. */
export function isSuperAdmin(user: User | null): boolean {
  return !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
}
