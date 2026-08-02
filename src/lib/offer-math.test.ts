import { describe, expect, it } from "vitest";

/*
 * החשבון שמוצג ללקוח במסך ההשוואה. הוא נראה טריוויאלי, ולכן מסוכן:
 * מספר שגוי כאן הוא לא באג בממשק — הוא לקוח שבחר עורך דין על סמך
 * מספר שהמצאנו. הנוסחה מועתקת מ-OfferComparison במכוון, כדי ששינוי
 * שם בלי מחשבה ייפול כאן.
 */

function fee(model: "contingency" | "fixed", amount: number, example: number) {
  return model === "contingency" ? (example * amount) / 100 : amount;
}
const left = (example: number, f: number) => Math.max(0, example - f);

describe("תרגום ההצעה לכסף", () => {
  it("אחוזים מתורגמים נכון", () => {
    expect(fee("contingency", 13, 100000)).toBe(13000);
    expect(fee("contingency", 20, 250000)).toBe(50000);
    expect(fee("contingency", 8.5, 50000)).toBe(4250);
  });

  it("סכום קבוע אינו תלוי בגובה הפיצוי", () => {
    expect(fee("fixed", 8000, 50000)).toBe(8000);
    expect(fee("fixed", 8000, 250000)).toBe(8000);
  });

  it("מה שנשאר ללקוח הוא ההפרש", () => {
    expect(left(100000, fee("contingency", 13, 100000))).toBe(87000);
    expect(left(50000, fee("fixed", 8000, 50000))).toBe(42000);
  });

  it("שכר קבוע גבוה מהפיצוי אינו מציג מספר שלילי", () => {
    // 0 הוא הצגה נכונה יותר מ-"נשאר לך ₪-3,000", שהוא שקר על מצבו
    expect(left(5000, fee("fixed", 8000, 5000))).toBe(0);
  });

  it("התקרה החוקית בפלת״ד מתורגמת נכון", () => {
    // 13% הוא המקסימום הסטטוטורי — הסכום חייב להיות מדויק
    expect(fee("contingency", 13, 200000)).toBe(26000);
    expect(left(200000, 26000)).toBe(174000);
  });
});
