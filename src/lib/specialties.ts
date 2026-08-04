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
 * מנרמל קטגוריה שהגיעה מה-AI לאחת מהקטגוריות שלנו.
 *
 * הרשימה שבפרומפט הייתה בקשה, לא חוזה — והמודל החזיר "נזיקין - נזקי
 * גוף" ו"נזקי גוף ורשלנות". קטגוריה שאינה בטבלה נופלת ל"אזרחי כללי",
 * כלומר תיק נזיקין נעשה בלתי נראה לעורכי דין שסימנו נזיקין ואף אחד
 * לא קיבל עליו התראה. זו ההבטחה המרכזית של המוצר, ולכן היא נאכפת
 * בקוד ולא רק בבקשה מנומסת למודל.
 *
 * ההתאמה: התאמה מדויקת → הכלה הדדית → חפיפת מילים. רק אם כל אלה
 * נכשלו — "אחר".
 */
export function normalizeCategory(raw: string | undefined | null): string {
  const input = (raw ?? "").trim();
  if (!input) return "אחר";
  if (input in CATEGORY_SPECS) return input;

  const known = Object.keys(CATEGORY_SPECS);
  const clean = (s: string) => s.replace(/[־\-–—,]/g, " ").replace(/\s+/g, " ").trim();
  const c = clean(input);

  const contained = known.find((k) => {
    const ck = clean(k);
    return ck === c || c.includes(ck) || ck.includes(c);
  });
  if (contained) return contained;

  /*
   * מילות מפתח לפי מהות ולא לפי דמיון מחרוזות: "נזקי גוף ורשלנות"
   * אינו חולק אף שורש עם "נזיקין ותאונות", ובכל זאת זה בדיוק אותו
   * תחום. הסדר חשוב — "רשלנות רפואית" נבדק לפני "נזיקין", אחרת תיק
   * רשלנות רפואית היה נבלע בנזיקין הכללי.
   */
  const BY_KEYWORD: [RegExp, string][] = [
    [/רפוא|רופא|בית.?חולים|מרפא/, "רשלנות רפואית"],
    [/תאונת.?דרכים|תעבור|רישיון נהיגה/, "תעבורה"],
    [/ביטוח|פוליס|מבטח/, "ביטוח"],
    [/נזק|נזיק|פגיע|חבל|רשלנ|תאונ/, "נזיקין ותאונות"],
    [/עבוד|מעסיק|פיטור|שכר|התפטר/, "דיני עבודה"],
    [/צרכנ|מוצר פגום/, "צרכנות"],
    [/משפח|גירוש|מזונות|משמורת/, "דיני משפחה"],
    [/ירוש|צווא|עיזבון/, "ירושה וצוואות"],
    [/מקרקע|דייר|שכיר|נדל/, "מקרקעין"],
    [/פליל|עביר|כתב אישום/, "פלילי"],
    [/מס |מיסי|מע.?מ|שומה/, "מיסים"],
    [/בנק|אשראי|הלווא/, "בנקאות ופיננסים"],
    [/הוצאה לפועל|חדלות|פשיטת רגל/, "הוצאה לפועל וחדלות פירעון"],
    [/צבא|מילואים|נכות מהצבא/, "צבאי וביטחוני"],
    [/הגיר|אשרה|ויזה|שהי/, "הגירה ואשרות"],
    [/קניין רוחני|פטנט|סימן מסחר|זכויות יוצרים/, "קניין רוחני"],
    [/תאגיד|חבר[הת]|מניות/, "תאגידים וחברות"],
    [/תכנון|בנייה|היתר/, "תכנון ובנייה"],
    [/מנהלי|חוקתי|עתיר/, "מנהלי וחוקתי"],
    [/חוז|מסחר|הסכם/, "מסחרי וחוזים"],
  ];
  for (const [re, cat] of BY_KEYWORD) {
    if (re.test(c)) return cat;
  }
  return "אחר";
}

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
