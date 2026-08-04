import { describe, expect, it } from "vitest";
import {
  CATEGORY_SPECS,
  SPECIALTIES,
  SPEC_GROUPS,
  SPEC_IDS,
  VALIDATION_CATEGORIES,
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

  it("כל תחום מופיע בדיוק בקבוצה אחת בטופס ההצטרפות", () => {
    // תחום שלא בקבוצה פשוט לא יוצג — עו״ד לא יוכל לבחור בו
    const grouped = SPEC_GROUPS.flatMap((g) => g.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...SPEC_IDS].sort());
  });

  it("רשימת הקטגוריות לפרומפט זהה למפתחות הטבלה", () => {
    // הפרומפט נבנה מהרשימה הזו; סטייה כאן היא הבאג המקורי בדיוק
    expect(VALIDATION_CATEGORIES).toEqual(Object.keys(CATEGORY_SPECS));
    expect(VALIDATION_CATEGORIES.length).toBeGreaterThan(15);
  });

  it("לכל תחום מקצועי יש לפחות קטגוריה אחת שמגיעה אליו", () => {
    for (const s of SPECIALTIES) {
      const cats = Object.entries(CATEGORY_SPECS)
        .filter(([, ids]) => (ids as string[]).includes(s.id))
        .map(([c]) => c);
      expect(cats.length, `${s.id} — אין קטגוריה שמגיעה אליו`).toBeGreaterThan(0);
    }
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

  it("תיק פלילי מגיע לעו״ד פלילי ולא לעו״ד נזיקין", () => {
    expect(categoryMatchesSpecialties("פלילי", ["criminal"])).toBe(true);
    expect(categoryMatchesSpecialties("פלילי", ["injury"])).toBe(false);
    expect(categoryMatchesSpecialties("פלילי", ["family"])).toBe(false);
  });

  it("תיק משפחה אינו מגיע לעו״ד פלילי", () => {
    expect(categoryMatchesSpecialties("דיני משפחה", ["family"])).toBe(true);
    expect(categoryMatchesSpecialties("דיני משפחה", ["criminal"])).toBe(false);
  });

  it("תעבורה מגיעה גם לפלילי וגם לנזיקין — הרחבה מכוונת", () => {
    expect(categoryMatchesSpecialties("תעבורה", ["traffic"])).toBe(true);
    expect(categoryMatchesSpecialties("תעבורה", ["criminal"])).toBe(true);
    expect(categoryMatchesSpecialties("תעבורה", ["injury"])).toBe(true);
    expect(categoryMatchesSpecialties("תעבורה", ["estate"])).toBe(false);
  });
});

/*
 * התאמת שפה (08/2026): לקוח שניהל את הראיון בערבית צריך להגיע קודם
 * לעורכי דין שסימנו ערבית. הדירוג עצמו חי ב-store; כאן מקובע החוזה
 * ההתנהגותי — סימון ולא חסימה, ועברית כברירת מחדל דו-צדדית.
 */
describe("התאמת שפה", () => {
  const mismatch = (clientLang: string | undefined, lawyerLangs: string[] | undefined) => {
    const langs = lawyerLangs?.length ? lawyerLangs : ["he"];
    return !langs.includes(clientLang || "he");
  };

  it("עורך דין בלי שפות = עברית; תיק בלי שפה = עברית", () => {
    expect(mismatch(undefined, undefined)).toBe(false);
    expect(mismatch("he", [])).toBe(false);
  });

  it("לקוח דובר ערבית אצל עו\"ד שסימן ערבית — התאמה", () => {
    expect(mismatch("ar", ["he", "ar"])).toBe(false);
  });

  it("לקוח דובר רוסית אצל עו\"ד עברית-בלבד — פער, לא חסימה", () => {
    expect(mismatch("ru", ["he"])).toBe(true);
  });

  it("תיק ישן (בלי שפה) אצל עו\"ד שסימן רק ערבית — פער", () => {
    // דווקא המקרה ההפוך: עו\"ד שלא סימן עברית לא יקבל תיקים בעברית כהתאמה
    expect(mismatch(undefined, ["ar"])).toBe(true);
  });
});
