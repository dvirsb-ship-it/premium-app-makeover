/**
 * מקור האמת היחיד לתחומי ההתמחות ולמיפוי קטגוריית תיק → תחום.
 *
 * הקובץ הזה טהור בכוונה — אין בו firebase ואין בו React — כי גם הדפדפן
 * (טופס ההצטרפות, סינון הפיד) וגם השרת (הזמנת עורכי הדין אחרי ולידציה)
 * חייבים להסכים על אותה טבלה. כשהיו שתי טבלאות, הפיצוץ בשרת פשוט לא סינן.
 *
 * ⚠️ כלל הברזל: **כל תחום כאן חייב קטגוריה תואמת בפרומפט הוולידציה**
 * (intake.functions.ts) ובגבולות צ'אט הקליטה (intake-prompt.ts). תחום
 * בלי קטגוריה הוא מלכודת: עורך הדין נרשם, עובר אימות, ולא מקבל אף
 * פנייה — לנצח. זה בדיוק מה שקרה כשהיו כאן 17 תחומים ו-7 קטגוריות.
 */
import type { StringKey } from "./i18n";

export type SpecId =
  | "injury"
  | "medical"
  | "employment"
  | "insurance"
  | "consumer"
  | "estate"
  | "planning"
  | "family"
  | "inheritance"
  | "criminal"
  | "traffic"
  | "commercial"
  | "corporate"
  | "tax"
  | "banking"
  | "enforcement"
  | "ip"
  | "immigration"
  | "administrative"
  | "military"
  | "civil";

/**
 * מקובצים לפי משפחה, כי 21 שבבים ברצף אחד הם קיר.
 * הסדר הוא סדר התצוגה בטופס ההצטרפות.
 */
export const SPEC_GROUPS: { titleKey: StringKey; ids: SpecId[] }[] = [
  { titleKey: "specGroupInjury", ids: ["injury", "medical", "traffic", "insurance"] },
  { titleKey: "specGroupCivil", ids: ["employment", "consumer", "commercial", "civil"] },
  { titleKey: "specGroupProperty", ids: ["estate", "planning", "inheritance"] },
  { titleKey: "specGroupFamily", ids: ["family"] },
  { titleKey: "specGroupCriminal", ids: ["criminal", "military"] },
  { titleKey: "specGroupBusiness", ids: ["corporate", "tax", "banking", "enforcement", "ip"] },
  { titleKey: "specGroupPublic", ids: ["administrative", "immigration"] },
];

export const SPECIALTIES: { id: SpecId; labelKey: StringKey }[] = [
  { id: "injury", labelKey: "specInjury" },
  { id: "medical", labelKey: "specMedical" },
  { id: "traffic", labelKey: "specTraffic" },
  { id: "insurance", labelKey: "specInsurance" },
  { id: "employment", labelKey: "specEmployment" },
  { id: "consumer", labelKey: "specConsumer" },
  { id: "commercial", labelKey: "specCommercial" },
  { id: "civil", labelKey: "specCivil" },
  { id: "estate", labelKey: "specEstate" },
  { id: "planning", labelKey: "specPlanning" },
  { id: "inheritance", labelKey: "specInheritance" },
  { id: "family", labelKey: "specFamily" },
  { id: "criminal", labelKey: "specCriminal" },
  { id: "military", labelKey: "specMilitary" },
  { id: "corporate", labelKey: "specCorporate" },
  { id: "tax", labelKey: "specTax" },
  { id: "banking", labelKey: "specBanking" },
  { id: "enforcement", labelKey: "specEnforcement" },
  { id: "ip", labelKey: "specIp" },
  { id: "administrative", labelKey: "specAdministrative" },
  { id: "immigration", labelKey: "specImmigration" },
];

export const SPEC_IDS: SpecId[] = SPECIALTIES.map((s) => s.id);

/**
 * הקטגוריות שהוולידציה מחזירה → התמחויות שרואות אותן.
 *
 * המפתחות חייבים להיות זהים מילה במילה לרשימה שבפרומפט הוולידציה.
 * תחום שני ברשימה הוא הרחבה מכוונת: תיק רשלנות רפואית רלוונטי גם
 * לעורך דין נזיקין, ותיק תכנון ובנייה גם לעורך דין מקרקעין.
 */
export const CATEGORY_SPECS: Record<string, SpecId[]> = {
  "נזיקין ותאונות": ["injury", "civil"],
  "רשלנות רפואית": ["medical", "injury"],
  "תעבורה": ["traffic", "criminal", "injury"],
  "ביטוח": ["insurance", "injury"],
  "דיני עבודה": ["employment", "civil"],
  "צרכנות": ["consumer", "civil"],
  "מסחרי וחוזים": ["commercial", "civil"],
  "מקרקעין": ["estate", "civil"],
  "תכנון ובנייה": ["planning", "estate", "administrative"],
  "ירושה וצוואות": ["inheritance", "family", "civil"],
  "דיני משפחה": ["family", "civil"],
  "פלילי": ["criminal"],
  "צבאי וביטחוני": ["military", "administrative"],
  "תאגידים וחברות": ["corporate", "commercial"],
  "מיסים": ["tax", "administrative"],
  "בנקאות ופיננסים": ["banking", "commercial", "civil"],
  "הוצאה לפועל וחדלות פירעון": ["enforcement", "civil"],
  "קניין רוחני": ["ip", "commercial"],
  "מנהלי וחוקתי": ["administrative", "civil"],
  "הגירה ואשרות": ["immigration", "administrative"],
  "אחר": ["civil"],
};

/** כל שמות הקטגוריות — לשימוש בפרומפט, כדי שלא תיווצר סטייה בין השניים. */
export const VALIDATION_CATEGORIES = Object.keys(CATEGORY_SPECS);

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
