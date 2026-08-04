import { CATEGORY_SPECS } from "./specialties";

/**
 * מד ההתאמה — הציון שעורך דין רואה על כל תיק בפיד.
 *
 * העיקרון שקובע כאן הכל: כל נקודה ניתנת להסבר במשפט אחד. ההבטחה
 * המרכזית לעורכי הדין היא שהתשלום לעולם אינו קונה מיקום — והדרך
 * היחידה להוכיח את זה היא דירוג שאפשר לקרוא. לכן אין כאן משקולות
 * נלמדות ואין קופסה שחורה: שלושה כללים, משקלים קבועים, ורשימת
 * סיבות שמוצגת למשתמש כפי שהיא.
 *
 * המשקלים:
 *   התמחות  — עד 45: התחום הראשי של התיק הוא שלך (45), או תחום משיק (30).
 *   שפה     — עד 35: אתם דוברים את שפת הלקוח. בלעדיה אין שיחה, ולכן
 *              היא שווה יותר מקרבה גיאוגרפית.
 *   קרבה    — עד 20: אותה עיר.
 *
 * הקובץ טהור בכוונה — בלי firebase ובלי React — כדי שהכללים האלה
 * יהיו ניתנים לבדיקה כלשונם.
 */

export interface MatchInput {
  /** קטגוריית התיק כפי שסווגה בוולידציה. */
  category: string;
  /** שפת הראיון של הלקוח. חסר = עברית. */
  clientLang?: string;
  /** עיר הלקוח. */
  location?: string;
}

export interface LawyerMatchProfile {
  specialties: string[];
  /** שפות שירות. ריק/חסר = עברית בלבד. */
  languages?: string[];
  city?: string;
}

/** מפתחות i18n — התצוגה מתרגמת; הלוגיקה לא מחזיקה עברית. */
export type MatchReason =
  | "reasonSpecPrimary"
  | "reasonSpecSecondary"
  | "reasonLangMatch"
  | "reasonLangGap"
  | "reasonCityMatch";

export interface MatchResult {
  /** 0..100 */
  score: number;
  reasons: MatchReason[];
  /** שפת הלקוח אינה בשפות השירות — מוצג כאזהרה ומוריד בדירוג. */
  langMismatch: boolean;
}

export const MATCH_WEIGHTS = {
  specPrimary: 45,
  specSecondary: 30,
  language: 35,
  city: 20,
} as const;

export function matchScore(
  c: MatchInput,
  lawyer: LawyerMatchProfile,
): MatchResult {
  const reasons: MatchReason[] = [];
  let score = 0;

  /*
   * התמחות: הרשימה ב-CATEGORY_SPECS מסודרת — הראשון הוא התחום
   * הטבעי של הקטגוריה, והשאר משיקים. עו"ד בלי התמחויות רואה הכל
   * (זה הכלל הקיים בפיד) — וניקוד ההתמחות אצלו הוא ניקוד משני,
   * כדי שלא יראה 100% על הכל בלי שום בידול.
   */
  const specs = CATEGORY_SPECS[c.category] ?? ["civil"];
  if (lawyer.specialties.length === 0) {
    score += MATCH_WEIGHTS.specSecondary;
  } else if (lawyer.specialties.includes(specs[0])) {
    score += MATCH_WEIGHTS.specPrimary;
    reasons.push("reasonSpecPrimary");
  } else if (specs.some((s) => lawyer.specialties.includes(s))) {
    score += MATCH_WEIGHTS.specSecondary;
    reasons.push("reasonSpecSecondary");
  }

  const myLangs = lawyer.languages?.length ? lawyer.languages : ["he"];
  const clientLang = c.clientLang || "he";
  const langMismatch = !myLangs.includes(clientLang);
  if (!langMismatch) {
    score += MATCH_WEIGHTS.language;
    /*
     * "דוברים את שפת הלקוח" כסיבה מוצגת רק כשזה באמת מידע — כלומר
     * כשהשפה אינה עברית. עברית-אצל-דוברי-עברית היא ברירת המחדל של
     * המדינה, לא הישג של הפרופיל.
     */
    if (clientLang !== "he") reasons.push("reasonLangMatch");
  } else {
    reasons.push("reasonLangGap");
  }

  const myCity = (lawyer.city ?? "").trim();
  const caseCity = (c.location ?? "").trim();
  if (myCity && caseCity && myCity === caseCity) {
    score += MATCH_WEIGHTS.city;
    reasons.push("reasonCityMatch");
  }

  return { score, reasons, langMismatch };
}

/** סף התצוגה: מאיזה ציון התג נצבע כ"גבוה". */
export const MATCH_HIGH = 80;
export const MATCH_MEDIUM = 50;

export function matchTone(score: number): "high" | "medium" | "low" {
  if (score >= MATCH_HIGH) return "high";
  if (score >= MATCH_MEDIUM) return "medium";
  return "low";
}
