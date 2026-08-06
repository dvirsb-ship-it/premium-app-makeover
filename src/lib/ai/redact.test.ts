import { describe, expect, it } from "vitest";
import { isIsraeliId, redactForAi, REDACTED_EMAIL, REDACTED_ID, REDACTED_PHONE } from "./redact";

/*
 * שתי סכנות הפוכות, ושתיהן נבדקות כאן:
 *
 * הראשונה — שמזהה יעבור. זו הסיבה שהפונקציה נכתבה.
 * השנייה, והיא מסוכנת לא פחות — שהניקוי יהרוס טקסט תמים. תיאור מקרה
 * מלא במספרים שאינם מזהים: סכומי נזק, תאריכים, מספרי תיק ומספרי
 * חשבונית. אם הניקוי יאכל אותם, הבדיקה המשפטית תתבצע על עובדות
 * חסרות — כלומר "הגנת פרטיות" שמייצרת תשובה שגויה.
 */

describe("תעודת זהות — ספרת ביקורת", () => {
  it("מזהה תעודות תקינות", () => {
    /* מספרים בדויים שחושבו לעמוד בבדיקת הביקורת */
    expect(isIsraeliId("000000018")).toBe(true);
    expect(isIsraeliId("123456782")).toBe(true);
  });

  it("דוחה רצף ספרות שאינו תעודת זהות", () => {
    expect(isIsraeliId("123456789")).toBe(false);
    expect(isIsraeliId("111111111")).toBe(false);
  });
});

describe("מה שחייב להיעלם", () => {
  it("תעודת זהות בתוך משפט", () => {
    const out = redactForAi("שמי דוד, ת.ז. 123456782, ונפגעתי בעבודה");
    expect(out).toContain(REDACTED_ID);
    expect(out).not.toContain("123456782");
    /* העובדות סביב נשארות — זה כל העניין */
    expect(out).toContain("נפגעתי בעבודה");
  });

  it("טלפון נייד בכל הצורות", () => {
    for (const p of ["050-1234567", "0501234567", "050 123 4567", "+972501234567"]) {
      const out = redactForAi(`אפשר להשיג אותי ב-${p} בבוקר`);
      expect(out, p).toContain(REDACTED_PHONE);
      expect(out, p).not.toMatch(/\d{7}/);
    }
  });

  it("טלפון קווי", () => {
    expect(redactForAi("המשרד: 03-1234567")).toContain(REDACTED_PHONE);
  });

  it("כתובת מייל", () => {
    const out = redactForAi("שלחו לי ל-dvir.test@gmail.com תשובה");
    expect(out).toContain(REDACTED_EMAIL);
    expect(out).not.toContain("gmail.com");
  });

  it("כמה מזהים באותו טקסט", () => {
    const out = redactForAi("ת.ז. 123456782, טלפון 050-1234567, מייל a@b.co.il");
    expect(out).toContain(REDACTED_ID);
    expect(out).toContain(REDACTED_PHONE);
    expect(out).toContain(REDACTED_EMAIL);
  });
});

describe("מה שאסור שייפגע — העובדות שהבדיקה נשענת עליהן", () => {
  it("סכומי כסף", () => {
    const t = "הנזק הוערך ב-45000 ש״ח ושילמתי 1200 על הטיפול";
    expect(redactForAi(t)).toBe(t);
  });

  it("תאריכים ושנים", () => {
    const t = "האירוע קרה ב-15/03/2024, שלוש שנים אחרי 2021";
    expect(redactForAi(t)).toBe(t);
  });

  it("רצף תשע ספרות שאינו תעודת זהות", () => {
    const t = "מספר החשבונית הוא 123456789";
    expect(redactForAi(t)).toBe(t);
  });

  it("תיאור מקרה שלם בלי מזהים אינו משתנה כלל", () => {
    const t =
      "נפגעתי בתאונת דרכים ברחוב הרצל בתל אביב. הרכב שפגע בי נסע במהירות " +
      "ולא עצר ברמזור אדום. נגרם לי שבר ביד ימין ואושפזתי 3 ימים.";
    expect(redactForAi(t)).toBe(t);
  });

  it("טקסט ריק אינו מפיל", () => {
    expect(redactForAi("")).toBe("");
  });
});
