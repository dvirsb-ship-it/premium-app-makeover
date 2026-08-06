import { describe, expect, it } from "vitest";
import {
  MATCH_WEIGHTS,
  isWarningReason,
  matchScore,
  matchTone,
  strongestReason,
} from "./match";

/*
 * מד ההתאמה הוא הבטחה: "התשלום לעולם לא קונה מיקום" אפשרית להוכחה רק
 * אם הכללים קבועים ושקופים. הבדיקות כאן מקבעות את הכללים עצמם — שינוי
 * משקל הוא החלטת מוצר, והוא חייב להישבר כאן קודם.
 */

const CASE_RU = { category: "נזיקין ותאונות", clientLang: "ru", location: "חיפה" };

describe("מד ההתאמה", () => {
  it("התאמה מלאה: תחום ראשי + שפה + עיר = 100", () => {
    const m = matchScore(CASE_RU, {
      specialties: ["injury"],
      languages: ["he", "ru"],
      city: "חיפה",
    });
    expect(m.score).toBe(100);
    expect(m.langMismatch).toBe(false);
    expect(m.reasons).toEqual([
      "reasonSpecPrimary",
      "reasonLangMatch",
      "reasonCityMatch",
    ]);
  });

  it("פער שפה מוריד את כל משקל השפה ומסמן", () => {
    const m = matchScore(CASE_RU, {
      specialties: ["injury"],
      languages: ["he"],
      city: "חיפה",
    });
    expect(m.score).toBe(MATCH_WEIGHTS.specPrimary + MATCH_WEIGHTS.city);
    expect(m.langMismatch).toBe(true);
    expect(m.reasons).toContain("reasonLangGap");
  });

  it("תחום משיק שווה פחות מתחום ראשי", () => {
    // "נזיקין ותאונות" → ראשי injury, משיק civil
    const primary = matchScore(CASE_RU, { specialties: ["injury"], languages: ["ru"] });
    const secondary = matchScore(CASE_RU, { specialties: ["civil"], languages: ["ru"] });
    expect(primary.score - secondary.score).toBe(
      MATCH_WEIGHTS.specPrimary - MATCH_WEIGHTS.specSecondary,
    );
    expect(secondary.reasons).toContain("reasonSpecSecondary");
  });

  it("עברית אצל דוברי עברית אינה 'סיבה' — היא ברירת המחדל", () => {
    const m = matchScore(
      { category: "דיני עבודה", location: "" },
      { specialties: ["employment"] },
    );
    expect(m.langMismatch).toBe(false);
    expect(m.reasons).not.toContain("reasonLangMatch");
  });

  it("עו\"ד בלי התמחויות אינו מקבל 100 על הכל", () => {
    const m = matchScore(CASE_RU, { specialties: [], languages: ["ru"], city: "חיפה" });
    expect(m.score).toBeLessThan(100);
  });

  it("שפה שווה יותר מקרבה — בלעדיה אין שיחה", () => {
    expect(MATCH_WEIGHTS.language).toBeGreaterThan(MATCH_WEIGHTS.city);
  });

  it("קטגוריה לא מוכרת נופלת לאזרחי-כללי ולא מפילה את החישוב", () => {
    const m = matchScore(
      { category: "קטגוריה שהומצאה", clientLang: "he" },
      { specialties: ["civil"] },
    );
    expect(m.score).toBeGreaterThan(0);
    expect(m.reasons).toContain("reasonSpecPrimary");
  });

  it("הטונים מכוילים לספים", () => {
    expect(matchTone(100)).toBe("high");
    expect(matchTone(80)).toBe("high");
    expect(matchTone(65)).toBe("medium");
    expect(matchTone(30)).toBe("low");
  });
});

describe("הסיבה שמוצגת על הכרטיס", () => {
  it("התחום המרכזי גובר על כל השאר", () => {
    expect(
      strongestReason(["reasonCityMatch", "reasonSpecPrimary", "reasonLangMatch"]),
    ).toBe("reasonSpecPrimary");
  });

  it("שפה גוברת על תחום משיק — בלי שיחה אין תיק", () => {
    expect(strongestReason(["reasonSpecSecondary", "reasonLangMatch"])).toBe(
      "reasonLangMatch",
    );
  });

  it("עיר נבחרת רק כשאין חזק ממנה", () => {
    expect(strongestReason(["reasonCityMatch"])).toBe("reasonCityMatch");
  });

  it("אזהרת שפה נבחרת רק כשאין שום סיבה חיובית", () => {
    expect(strongestReason(["reasonLangGap"])).toBe("reasonLangGap");
    /* יש התאמת תחום — האזהרה לא תופסת את מקום הסיבה */
    expect(strongestReason(["reasonLangGap", "reasonSpecPrimary"])).toBe(
      "reasonSpecPrimary",
    );
  });

  it("בלי סיבות — אין מה להציג, ולא תג ריק", () => {
    expect(strongestReason([])).toBeNull();
  });

  it("אזהרה מסומנת כאזהרה, התאמה לא", () => {
    expect(isWarningReason("reasonLangGap")).toBe(true);
    expect(isWarningReason("reasonSpecPrimary")).toBe(false);
  });

  it("הסדר נגזר מהמשקלים ולא מרשימה נפרדת", () => {
    /* אם מישהו ישנה משקל, הבחירה חייבת לזוז איתו */
    const byWeight = (["reasonSpecPrimary", "reasonLangMatch", "reasonSpecSecondary", "reasonCityMatch"] as const);
    expect(strongestReason(byWeight)).toBe("reasonSpecPrimary");
    expect(MATCH_WEIGHTS.specPrimary).toBeGreaterThan(MATCH_WEIGHTS.language);
    expect(MATCH_WEIGHTS.language).toBeGreaterThan(MATCH_WEIGHTS.specSecondary);
  });
});
