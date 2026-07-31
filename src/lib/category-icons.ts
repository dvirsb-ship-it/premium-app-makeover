import {
  Bandage,
  Banknote,
  Building2,
  CarFront,
  Crown,
  FileSignature,
  Gavel,
  Globe,
  HardHat,
  KeyRound,
  Landmark,
  Lightbulb,
  Percent,
  Scale,
  ScrollText,
  ShieldCheck,
  Shield,
  ShoppingBag,
  Stethoscope,
  Users,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { SpecId } from "./specialties";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * סמל לכל תחום.
 *
 * קודם ישבה כאן תמונת סטוק לכל תיק — בניין כהה, זהה כמעט בכל הכרטיסים,
 * ובנוסף המפתחות היו שמות קטגוריה ישנים כך שרוב התיקים נפלו לתמונת
 * ברירת המחדל. סמל נושא מידע: עורך דין סורק פיד ויודע מיד מה כל תיק.
 *
 * הקובץ הזה client-only (מייבא lucide) — בכוונה נפרד מ-specialties.ts
 * שהשרת מייבא.
 */

export const SPEC_ICON: Record<SpecId, IconComponent> = {
  injury: Bandage,
  medical: Stethoscope,
  traffic: CarFront,
  insurance: ShieldCheck,
  employment: Building2,
  consumer: ShoppingBag,
  commercial: FileSignature,
  civil: Scale,
  estate: KeyRound,
  planning: HardHat,
  inheritance: ScrollText,
  family: Users,
  criminal: Gavel,
  military: Shield,
  corporate: Landmark,
  tax: Percent,
  banking: Banknote,
  enforcement: Crown,
  ip: Lightbulb,
  administrative: Landmark,
  immigration: Globe,
};

/** קטגוריית תיק (כפי שהוולידציה מחזירה) → סמל. */
const CATEGORY_ICON: Record<string, IconComponent> = {
  "נזיקין ותאונות": Bandage,
  "רשלנות רפואית": Stethoscope,
  "תעבורה": CarFront,
  "ביטוח": ShieldCheck,
  "דיני עבודה": Building2,
  "צרכנות": ShoppingBag,
  "מסחרי וחוזים": FileSignature,
  "מקרקעין": KeyRound,
  "תכנון ובנייה": HardHat,
  "ירושה וצוואות": ScrollText,
  "דיני משפחה": Users,
  "פלילי": Gavel,
  "צבאי וביטחוני": Shield,
  "תאגידים וחברות": Landmark,
  "מיסים": Percent,
  "בנקאות ופיננסים": Banknote,
  "הוצאה לפועל וחדלות פירעון": Crown,
  "קניין רוחני": Lightbulb,
  "מנהלי וחוקתי": Landmark,
  "הגירה ואשרות": Globe,
  "אחר": Scale,
};

/** תמיד מחזיר סמל — קטגוריה לא מוכרת מקבלת את המאזניים. */
export function categoryIcon(category: string): IconComponent {
  return CATEGORY_ICON[category] ?? Scale;
}
