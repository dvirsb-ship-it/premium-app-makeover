import { describe, expect, it } from "vitest";
import {
  isValidIsraeliId,
  monthsSinceIncident,
  offerExceedsCap,
  categoryHasStatutoryCap,
  PLTD_MAX_PERCENT,
} from "./legal";

/* עוגן זמן קבוע — בדיקה שתלויה בשעון האמיתי נשברת מעצמה בשלב כלשהו */
const NOW = new Date("2026-07-31T00:00:00").getTime();

describe("monthsSinceIncident", () => {
  it("מחזיר את הזמן שעבר מאז האירוע", () => {
    // אירוע לפני חצי שנה
    expect(monthsSinceIncident("2026-01-31", NOW)).toBe(6);
    expect(monthsSinceIncident("2025-07-31", NOW)).toBe(12);
    // יום בחודש שטרם הגיע אינו נספר כחודש מלא
    expect(monthsSinceIncident("2026-01-30", NOW)).toBe(6);
    expect(monthsSinceIncident("2025-08-01", NOW)).toBe(11);
  });

  it("אינו תלוי בקטגוריה — זו עובדה ולא כלל משפטי", () => {
    // הפונקציה הקודמת קיבלה קטגוריה והחזירה 3 שנים לביטוח מול 7 לנזיקין.
    // גיל האירוע זהה לכולם; המסקנה המשפטית ממנו היא של עורך הדין.
    expect(monthsSinceIncident("2020-07-31", NOW)).toBe(72);
  });

  it("תאריך עתידי מחזיר 0 ולא מספר שלילי", () => {
    expect(monthsSinceIncident("2030-01-01", NOW)).toBe(0);
  });

  it("שותק כשאין תאריך או שהוא לא בפורמט — עדיף כלום ממספר שגוי", () => {
    expect(monthsSinceIncident(undefined, NOW)).toBeUndefined();
    expect(monthsSinceIncident("", NOW)).toBeUndefined();
    expect(monthsSinceIncident("לפני שנתיים", NOW)).toBeUndefined();
    expect(monthsSinceIncident("31/07/2025", NOW)).toBeUndefined();
  });

  it("סף התג בפיד — 48 חודשים ומעלה", () => {
    // ארבע שנים בדיוק = 48 בול, וזה מה שהחישוב הקלנדרי מבטיח
    expect(monthsSinceIncident("2022-07-31", NOW)).toBe(48);
    expect(monthsSinceIncident("2023-07-31", NOW)).toBe(36);
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
