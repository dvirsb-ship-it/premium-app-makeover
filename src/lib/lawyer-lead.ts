/**
 * ליד של עורך דין מדף הנחיתה הציבורי.
 *
 * הדף סטטי והטופס פונה ל-API בשרת — בלי הרשמה ובלי אפליקציה, כי כל
 * צעד נוסף מפיל עורכי דין בדרך. המחיר של הקלות הזו הוא שכל האינטרנט
 * יכול לקרוא ל-API, ולכן הוולידציה כאן היא קו ההגנה, והיא טהורה כדי
 * שאפשר יהיה לבדוק אותה.
 */
import { SPEC_IDS } from "./specialties";

export interface LawyerLeadInput {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  specialty?: unknown;
  barNumber?: unknown;
  /** שדה דבש — מוסתר בטופס. בני אדם לא ממלאים אותו; בוטים כן. */
  website?: unknown;
}

export type LeadProblem = "bot" | "name" | "email" | "phone" | "specialty" | "barNumber";

/** "אחר" קיים בטופס בכוונה — תחום שחסר לנו הוא מידע שוק, לא שגיאה. */
export const LEAD_SPECIALTIES: readonly string[] = [...SPEC_IDS, "other"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * null = תקין. אחרת — הבעיה הראשונה שנמצאה.
 *
 * הכללים רחבים במתכוון: המטרה היא לעצור זבל ובוטים, לא להפיל עורך דין
 * אמיתי על פורמט. את האימות האמיתי (רישיון, סרטון) עושים אחר כך —
 * זה ליד, לא הרשמה.
 */
export function lawyerLeadProblem(d: LawyerLeadInput): LeadProblem | null {
  if (typeof d.website === "string" && d.website.trim() !== "") return "bot";

  const name = typeof d.fullName === "string" ? d.fullName.trim() : "";
  if (name.length < 2 || name.length > 80) return "name";

  const email = typeof d.email === "string" ? d.email.trim() : "";
  if (!EMAIL_RE.test(email) || email.length > 120) return "email";

  const phone = typeof d.phone === "string" ? d.phone.replace(/\D/g, "") : "";
  if (phone.length < 9 || phone.length > 13) return "phone";

  const spec = typeof d.specialty === "string" ? d.specialty : "";
  if (!LEAD_SPECIALTIES.includes(spec)) return "specialty";

  const bar = typeof d.barNumber === "string" ? d.barNumber.trim() : "";
  if (!/^\d{2,10}$/.test(bar)) return "barNumber";

  return null;
}

/** הנרמול שנשמר במאגר — אחרי שהוולידציה עברה. */
export function normalizeLead(d: LawyerLeadInput): {
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  barNumber: string;
} {
  return {
    fullName: String(d.fullName).trim(),
    email: String(d.email).trim().toLowerCase(),
    phone: String(d.phone).replace(/\D/g, ""),
    specialty: String(d.specialty),
    barNumber: String(d.barNumber).trim(),
  };
}
