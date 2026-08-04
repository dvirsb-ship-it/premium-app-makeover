import { describe, expect, it } from "vitest";
import { CATEGORY_SPECS, categoryMatchesSpecialties, normalizeCategory } from "./specialties";

/*
 * הבאג שדביר תפס: המודל החזיר "נזיקין - נזקי גוף" ו"נזקי גוף ורשלנות",
 * שאינן קטגוריות שלנו. קטגוריה לא מוכרת נופלת ל"אזרחי כללי", ולכן תיק
 * נזיקין נעשה בלתי נראה לעורך דין שסימן נזיקין — ואף אחד לא קיבל עליו
 * התראה. זו ההבטחה המרכזית של המוצר.
 */

describe("נרמול קטגוריה שהמציא ה-AI", () => {
  it("הקטגוריות שהמודל באמת החזיר מגיעות לנזיקין", () => {
    for (const invented of [
      "נזיקין - נזקי גוף",
      "נזקי גוף ורשלנות",
      "נזיקין – נזקי גוף",
    ]) {
      const fixed = normalizeCategory(invented);
      expect(fixed in CATEGORY_SPECS, `${invented} → ${fixed}`).toBe(true);
      expect(
        categoryMatchesSpecialties(fixed, ["injury"]),
        `${invented} → ${fixed} חייב להגיע לעו״ד נזיקין`,
      ).toBe(true);
    }
  });

  it("קטגוריה תקינה נשארת כפי שהיא", () => {
    for (const k of Object.keys(CATEGORY_SPECS)) {
      expect(normalizeCategory(k)).toBe(k);
    }
  });

  it("ריק או חסר נופל ל'אחר' ולא מפיל את החישוב", () => {
    expect(normalizeCategory("")).toBe("אחר");
    expect(normalizeCategory(undefined)).toBe("אחר");
    expect(normalizeCategory(null)).toBe("אחר");
  });

  it("כל פלט הוא תמיד קטגוריה מוכרת", () => {
    for (const junk of ["דבר מה מומצא", "???", "Personal Injury", "רשלנות רפואית קשה"]) {
      expect(normalizeCategory(junk) in CATEGORY_SPECS, junk).toBe(true);
    }
  });

  it("רשלנות רפואית מזוהה נכון ולא נבלעת בנזיקין", () => {
    expect(normalizeCategory("רשלנות רפואית")).toBe("רשלנות רפואית");
  });
});
