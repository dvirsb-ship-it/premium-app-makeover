import {
  Building2,
  KeyRound,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/* סמל אחד מותאם ושאר lucide — טיפוס משותף רחב דיו לשניהם */
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
import type { SpecId } from "./specialties";
import { BrokenBone } from "../components/icons";

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

export const SPEC_ICON: Record<SpecId, IconComponent> = {
  injury: BrokenBone,
  medical: Stethoscope,
  employment: Building2, // מקום עבודה
  insurance: ShieldCheck,
  consumer: ShoppingBag,
  estate: KeyRound, // מפתח, לא בית — כדי לא להתנגש בדיני עבודה
  civil: Scale,
};

/** קטגוריית תיק (כפי שהוולידציה מחזירה) → סמל. */
const CATEGORY_ICON: Record<string, IconComponent> = {
  "נזיקין ותאונות": BrokenBone,
  "רשלנות רפואית": Stethoscope,
  "דיני עבודה": Building2,
  "ביטוח": ShieldCheck,
  "צרכנות": ShoppingBag,
  "מקרקעין": KeyRound,
  "אחר": Scale,
};

/** תמיד מחזיר סמל — קטגוריה לא מוכרת מקבלת את המאזניים. */
export function categoryIcon(category: string): IconComponent {
  return CATEGORY_ICON[category] ?? Scale;
}
