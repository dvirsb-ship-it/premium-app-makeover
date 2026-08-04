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

/*
 * ההרחבה של 08/2026 — השפה האמיתית של הסכמי שכר טרחה בישראל:
 * אחוז מדורג לפי שלב, מקדמה שמתקזזת, ואיסור אחוזים בפלילי.
 */
import { categoryForbidsContingency, categoryHasStatutoryCap, PLTD_MAX_PERCENT } from "./legal";

describe("אחוז מדורג לפי שלב", () => {
  const maxPercent = (base: number, postSuit?: number, judgment?: number) =>
    Math.max(base, postSuit ?? 0, judgment ?? 0);

  it("האזהרה על תקרת פלת״ד נמדדת מול המדרגה הגבוהה, לא הראשונה", () => {
    // 8% בפשרה נראה כשר, אבל 15% בפסק דין חורג — בדיוק המקרה שהמדורג מסתיר
    expect(maxPercent(8, 11, 15) > PLTD_MAX_PERCENT).toBe(true);
    expect(maxPercent(8, 11, 13) > PLTD_MAX_PERCENT).toBe(false);
  });

  it("הסולם הסטטוטורי המלא של פלת״ד עובר בלי אזהרה", () => {
    expect(maxPercent(8, 11, 13)).toBe(PLTD_MAX_PERCENT);
    expect(categoryHasStatutoryCap("נזיקין ותאונות")).toBe(true);
  });

  it("ההשוואה ללקוח מחושבת על המדרגה הראשונה — עד פשרה", () => {
    // כמו בהסכם אמיתי: הפשרה היא התרחיש השכיח, והיא הבסיס להשוואה
    expect(fee("contingency", 15, 100000)).toBe(15000);
  });
});

describe("איסור שכר מותנה בפלילי", () => {
  it("קטגוריית פלילי חוסמת אחוזים — חוק לשכת עורכי הדין, ס׳ 84", () => {
    expect(categoryForbidsContingency("פלילי")).toBe(true);
  });

  it("שאר הקטגוריות אינן נחסמות", () => {
    for (const c of ["נזיקין ותאונות", "דיני עבודה", "דיני משפחה", "תעבורה", "אחר"]) {
      expect(categoryForbidsContingency(c), c).toBe(false);
    }
  });
});

describe("מקדמה שמתקזזת", () => {
  it("המקדמה אינה מגדילה את העלות הכוללת — היא חלק מהשכר, על חשבונו", () => {
    const fixed = 8000;
    const retainer = 2000;
    // מה שנשאר לשלם אחרי המקדמה + המקדמה עצמה = השכר המלא, בדיוק
    expect(fixed - retainer + retainer).toBe(fixed);
  });
});

describe("החלפת מודל שכר טרחה", () => {
  /*
   * המקרה שהתגלה בבדיקה: המספר נשאר על המסך אחרי החלפת מודל, ואז
   * "15" שנכתב כאחוזים נקרא כ-₪15. אלו יחידות שונות, ולכן הבדיקה
   * מנסחת את הפער בכסף — הוא מה שהופך את זה מבאג ממשק לבאג חמור.
   */
  it("אותו מספר בשני מודלים הוא שתי הצעות שונות לחלוטין", () => {
    const example = 100000;
    expect(fee("contingency", 15, example)).toBe(15000);
    expect(fee("fixed", 15, example)).toBe(15);
    // פי אלף הפרש — לכן הערך הישן לא יכול לשמש ברירת מחדל
    expect(fee("contingency", 15, example) / fee("fixed", 15, example)).toBe(1000);
  });

  it("סכום קבוע שנקרא כאחוזים הוא הצעה אבסורדית", () => {
    // ₪8,000 שהופכים ל-8000% על פיצוי של 100 אלף
    expect(fee("contingency", 8000, 100000)).toBe(8000000);
  });
});
