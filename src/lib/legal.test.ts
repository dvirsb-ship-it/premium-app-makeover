import { describe, expect, it } from "vitest";
import {
  isValidIsraeliId,
  limitationMonthsLeft,
  offerExceedsCap,
  categoryHasStatutoryCap,
  PLTD_MAX_PERCENT,
} from "./legal";

/* עוגן זמן קבוע — בדיקה שתלויה בשעון האמיתי נשברת מעצמה בשלב כלשהו */
const NOW = new Date("2026-07-31T00:00:00").getTime();

describe("limitationMonthsLeft", () => {
  it("נזיקין — 7 שנים מתאריך האירוע", () => {
    // אירוע לפני חצי שנה → נותרו כ-78 חודשים (7 שנים פחות חצי)
    expect(limitationMonthsLeft("2026-01-31", "נזיקין ותאונות", NOW)).toBe(78);
  });

  it("ביטוח — 3 שנים, לא 7", () => {
    const insurance = limitationMonthsLeft("2025-07-31", "ביטוח", NOW);
    const tort = limitationMonthsLeft("2025-07-31", "נזיקין ותאונות", NOW);
    expect(insurance).toBeLessThan(tort!);
    expect(insurance).toBe(24);
  });

  it("תיק שהתיישן מחזיר 0 ולא מספר שלילי", () => {
    expect(limitationMonthsLeft("2010-01-01", "נזיקין ותאונות", NOW)).toBe(0);
    expect(limitationMonthsLeft("2015-01-01", "ביטוח", NOW)).toBe(0);
  });

  it("שותק כשאין תאריך או שהוא לא בפורמט — עדיף כלום ממספר שגוי", () => {
    expect(limitationMonthsLeft(undefined, "נזיקין ותאונות", NOW)).toBeUndefined();
    expect(limitationMonthsLeft("", "נזיקין ותאונות", NOW)).toBeUndefined();
    expect(limitationMonthsLeft("לפני שנתיים", "נזיקין ותאונות", NOW)).toBeUndefined();
    expect(limitationMonthsLeft("31/07/2025", "נזיקין ותאונות", NOW)).toBeUndefined();
  });

  it("קטגוריה לא מוכרת מקבלת את ברירת המחדל של 7 שנים", () => {
    expect(limitationMonthsLeft("2026-01-31", "משהו אחר", NOW)).toBe(78);
  });

  it("מעגל כלפי מטה — מוטב להזהיר מוקדם מאשר מאוחר", () => {
    // החישוב בחודש ממוצע (30.44 יום) + floor, ולכן נוטה לדווח חסר.
    // בהתיישנות זה הכיוון הבטוח: אזהרה מוקדמת ולא איחור.
    const exact = limitationMonthsLeft("2026-07-31", "ביטוח", NOW)!;
    expect(exact).toBeLessThanOrEqual(36);
    expect(exact).toBeGreaterThanOrEqual(35);
  });

  it("התג בפיד מופיע רק מתחת ל-18 חודשים", () => {
    // הסף שמפעיל את תג האזהרה — אירוע לפני 6 שנים בנזיקין
    const left = limitationMonthsLeft("2020-07-31", "נזיקין ותאונות", NOW)!;
    expect(left).toBeLessThanOrEqual(18);
    expect(left).toBeGreaterThan(0);
  });
});

describe("תקרת שכר טרחה בפלת״ד", () => {
  it("התקרה היא 13%", () => {
    expect(PLTD_MAX_PERCENT).toBe(13);
  });

  it("חלה על נזיקין וביטוח בלבד", () => {
    expect(categoryHasStatutoryCap("נזיקין ותאונות")).toBe(true);
    expect(categoryHasStatutoryCap("ביטוח")).toBe(true);
    expect(categoryHasStatutoryCap("דיני עבודה")).toBe(false);
    expect(categoryHasStatutoryCap("מקרקעין")).toBe(false);
  });

  it("מזהה חריגה בהצעת אחוזים", () => {
    expect(offerExceedsCap("contingency", 20, "נזיקין ותאונות")).toBe(true);
    expect(offerExceedsCap("contingency", 13, "נזיקין ותאונות")).toBe(false);
    expect(offerExceedsCap("contingency", 12.5, "נזיקין ותאונות")).toBe(false);
  });

  it("תעריף שעתי וסכום קבוע אינם נמדדים מול אחוז מהפיצוי", () => {
    // 500₪ לשעה אינו "חריגה מ-13%" — זו יחידת מידה אחרת לגמרי
    expect(offerExceedsCap("hourly", 500, "נזיקין ותאונות")).toBe(false);
    expect(offerExceedsCap("fixed", 20000, "נזיקין ותאונות")).toBe(false);
  });

  it("לא מתריע בתחום שאין בו תקרה", () => {
    expect(offerExceedsCap("contingency", 30, "דיני עבודה")).toBe(false);
  });
});

describe("isValidIsraeliId", () => {
  it("מקבל ת״ז תקינה", () => {
    expect(isValidIsraeliId("000000018")).toBe(true);
    expect(isValidIsraeliId("123456782")).toBe(true);
  });

  it("משלים אפסים מובילים — ת״ז קצרה שהוקלדה בלי אפסים", () => {
    expect(isValidIsraeliId("18")).toBe(true);
  });

  it("דוחה ספרת ביקורת שגויה", () => {
    expect(isValidIsraeliId("123456789")).toBe(false);
    expect(isValidIsraeliId("000000019")).toBe(false);
  });

  it("דוחה קלט ארוך מדי או ריק", () => {
    expect(isValidIsraeliId("1234567890")).toBe(false);
    expect(isValidIsraeliId("")).toBe(false);
    expect(isValidIsraeliId("abc")).toBe(false);
  });
});
