import {
  Bone,
  Building2,
  KeyRound,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { SpecId } from "./specialties";

/**
 * סמל לכל תחום.
 *
 * קודם ישבה כאן תמונת סטוק לכל תיק — בניין כהה, זהה כמעט בכל הכרטיסים,
 * ובנוסף המפתחות היו שמות קטגוריה ישנים ("נזיקין", "נזיקין ותאונות דרכים")
 * כך שרוב התיקים נפלו לתמונת ברירת המחדל. התוצאה: כל הפיד נראה אותו דבר,
 * והתמונה לא נשאה שום מידע.
 *
 * סמל נושא מידע: עורך דין סורק פיד ויודע מיד מה כל תיק, בלי לקרוא.
 *
 * הקובץ הזה client-only (מייבא lucide) — בכוונה נפרד מ-specialties.ts
 * שהשרת מייבא.
 */

export const SPEC_ICON: Record<SpecId, LucideIcon> = {
  injury: Bone, // עצם שבורה
  medical: Stethoscope,
  employment: Building2, // מקום עבודה
  insurance: ShieldCheck,
  consumer: ShoppingBag,
  estate: KeyRound, // מפתח, לא בית — כדי לא להתנגש בדיני עבודה
  civil: Scale,
};

/** קטגוריית תיק (כפי שהוולידציה מחזירה) → סמל. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  "נזיקין ותאונות": Bone,
  "רשלנות רפואית": Stethoscope,
  "דיני עבודה": Building2,
  "ביטוח": ShieldCheck,
  "צרכנות": ShoppingBag,
  "מקרקעין": KeyRound,
  "אחר": Scale,
};

/** תמיד מחזיר סמל — קטגוריה לא מוכרת מקבלת את המאזניים. */
export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICON[category] ?? Scale;
}
