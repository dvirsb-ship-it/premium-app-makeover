import { describe, expect, it } from "vitest";
import {
  CATEGORY_SPECS,
  SPECIALTIES,
  SPEC_IDS,
  categoryMatchesSpecialties,
} from "./specialties";

/*
 * הבדיקות האלה קיימות בגלל באג אמיתי שדלף לפרודקשן: הסינון לפי תחום
 * פשוט לא קרה, וכל עורך דין קיבל כל תיק. אף אחד לא שם לב, כי המסך נראה
 * תקין לגמרי — פשוט עם יותר תיקים.
 *
 * זו ההבטחה שהלקוח מסמן עליה וי במסך ההסכמה. אם היא נשברת שוב, שיישבר
 * כאן ולא אצל עורך דין שמכבה התראות ולא חוזר.
 */

describe("טבלת התחומים", () => {
  it("כל קטגוריה ממופה לתחומים שקיימים ברשימה", () => {
    for (const [category, specs] of Object.entries(CATEGORY_SPECS)) {
      expect(specs.length, `${category} בלי תחומים`).toBeGreaterThan(0);
      for (const s of specs) {
        expect(SPEC_IDS, `${category} → ${s} אינו תחום קיים`).toContain(s);
      }
    }
  });

  it("כל תחום שמוצג בטופס ההצטרפות מקבל לפחות קטגוריה אחת", () => {
    // תחום בלי קטגוריה תואמת הוא מלכודת: עו״ד נרשם ולא מקבל אף פנייה
    const reachable = new Set(Object.values(CATEGORY_SPECS).flat());
    for (const s of SPECIALTIES) {
      expect(reachable, `${s.id} לא יקבל אף פנייה לעולם`).toContain(s.id);
    }
  });

  it("אין כפילויות ברשימת התחומים", () => {
    expect(new Set(SPEC_IDS).size).toBe(SPEC_IDS.length);
  });
});

describe("categoryMatchesSpecialties", () => {
  it("מתאים כשיש חפיפה", () => {
    expect(categoryMatchesSpecialties("רשלנות רפואית", ["medical"])).toBe(true);
    expect(categoryMatchesSpecialties("דיני עבודה", ["employment", "estate"])).toBe(true);
  });

  it("לא מתאים כשאין חפיפה — זה הלב של הבאג שהיה", () => {
    expect(categoryMatchesSpecialties("רשלנות רפואית", ["estate"])).toBe(false);
    expect(categoryMatchesSpecialties("מקרקעין", ["medical"])).toBe(false);
  });

  it("עו״ד בלי תחומים אינו מקבל הכל דרך הפונקציה הזו", () => {
    expect(categoryMatchesSpecialties("מקרקעין", [])).toBe(false);
  });

  it("קטגוריה שה-AI המציא נופלת לאזרחי כללי ולא לכולם", () => {
    // חשוב: fallback ל"כולם" היה מחזיר בדלת האחורית את הבאג המקורי
    expect(categoryMatchesSpecialties("קטגוריה שלא קיימת", ["civil"])).toBe(true);
    expect(categoryMatchesSpecialties("קטגוריה שלא קיימת", ["medical"])).toBe(false);
    expect(categoryMatchesSpecialties("קטגוריה שלא קיימת", ["estate"])).toBe(false);
  });

  it("״אחר״ מגיע לאזרחי כללי בלבד", () => {
    expect(categoryMatchesSpecialties("אחר", ["civil"])).toBe(true);
    expect(categoryMatchesSpecialties("אחר", ["employment"])).toBe(false);
  });
});
