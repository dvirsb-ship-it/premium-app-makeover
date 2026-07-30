/**
 * מקור האמת היחיד לתחומי ההתמחות ולמיפוי קטגוריית תיק → תחום.
 *
 * הקובץ הזה טהור בכוונה — אין בו firebase ואין בו React — כי גם הדפדפן
 * (טופס ההצטרפות, סינון הפיד) וגם השרת (הזמנת עורכי הדין אחרי ולידציה)
 * חייבים להסכים על אותה טבלה. כשהיו שתי טבלאות, הפיצוץ בשרת פשוט לא סינן.
 *
 * הרשימה מכסה *רק* תחומים שה-AI באמת יודע לזהות ולסווג. תחום שאין לו
 * קטגוריה תואמת בוולידציה הוא מלכודת: עורך הדין נרשם, בוחר אותו, ולא
 * מקבל אף פנייה — לנצח.
 */
import type { StringKey } from "./i18n";

export type SpecId =
  | "injury"
  | "medical"
  | "employment"
  | "insurance"
  | "consumer"
  | "estate"
  | "civil";

export const SPECIALTIES: { id: SpecId; labelKey: StringKey }[] = [
  { id: "injury", labelKey: "specInjury" },
  { id: "medical", labelKey: "specMedical" },
  { id: "employment", labelKey: "specEmployment" },
  { id: "insurance", labelKey: "specInsurance" },
  { id: "consumer", labelKey: "specConsumer" },
  { id: "estate", labelKey: "specEstate" },
  { id: "civil", labelKey: "specCivil" },
];

export const SPEC_IDS: SpecId[] = SPECIALTIES.map((s) => s.id);

/**
 * הקטגוריות שהוולידציה מחזירה → התמחויות שרואות אותן.
 * המפתחות חייבים להיות זהים מילה במילה לרשימה שבפרומפט הוולידציה
 * (intake.functions.ts), אחרת הקטגוריה תיפול ל-fallback ותישלח לכולם.
 */
export const CATEGORY_SPECS: Record<string, SpecId[]> = {
  "נזיקין ותאונות": ["injury", "civil"],
  "רשלנות רפואית": ["medical", "injury"],
  "דיני עבודה": ["employment", "civil"],
  "ביטוח": ["insurance", "injury"],
  "צרכנות": ["consumer", "civil"],
  "מקרקעין": ["estate", "civil"],
  "אחר": ["civil"],
};

/**
 * האם קטגוריית תיק רלוונטית לעורך דין.
 *
 * קטגוריה שאינה בטבלה (ה-AI המציא ניסוח חדש) נופלת ל"אזרחי כללי" ולא
 * לכולם: מוטב שתיק חריג יגיע לעורכי הדין הרחבים מאשר שיציף עורך דין
 * שרשום רק לרשלנות רפואית — זה בדיוק מה שגורם לכיבוי התראות.
 */
export function categoryMatchesSpecialties(
  category: string,
  specialties: readonly string[],
): boolean {
  const specs = CATEGORY_SPECS[category] ?? ["civil"];
  return specialties.some((s) => (specs as string[]).includes(s));
}
