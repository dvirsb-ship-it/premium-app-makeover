import { describe, expect, it } from "vitest";
import { UNDERTAKING_VERSION } from "./verification-queue";
import { strings } from "./i18n";

/**
 * ההתחייבות המקצועית של עורך הדין.
 *
 * הבדיקות כאן אינן על עיצוב אלא על **הוכחה**: ביום שבו נצטרך להראות
 * שעורך דין התחייב, נסתמך על הנוסח ועל הגרסה. שתי תקלות שקטות אפשריות —
 * סעיף שנעלם מהנוסח, וגרסה שלא הועלתה אחרי שהנוסח שונה — ושתיהן לא
 * ייראו כשגיאה בזמן ריצה.
 */
describe("ההתחייבות המקצועית", () => {
  const keys = [
    "undertake1",
    "undertake2",
    "undertake3",
    "undertake4",
    "undertake5",
    "undertake6",
  ] as const;

  it("כל שש הנקודות קיימות בעברית ובאנגלית", () => {
    for (const k of keys) {
      expect(strings[k], `חסר: ${k}`).toBeTruthy();
      expect(strings[k].he.length).toBeGreaterThan(30);
      expect(strings[k].en.length).toBeGreaterThan(30);
    }
  });

  /*
   * הנקודות הקריטיות נבדקות לפי **תוכן** ולא לפי קיום: סעיף שהוחלף
   * בטעות בנוסח כללי יעבור בדיקת קיום ויפיל את כל ההסתמכות עליו.
   */
  it("הסודיות חלה גם על תיקים שעורך הדין לא נבחר בהם", () => {
    expect(strings.undertake2.he).toMatch(/לא אבחר|לא אעשה בה שימוש/);
  });

  it("איסור יצירת קשר מחוץ לפלטפורמה לפני בחירה", () => {
    expect(strings.undertake3.he).toMatch(/מחוץ לפלטפורמה/);
    expect(strings.undertake3.he).toMatch(/לפני שבחר/);
  });

  it("ניגוד עניינים נבדק לפני הבעת עניין", () => {
    expect(strings.undertake4.he).toMatch(/ניגוד עניינים/);
  });

  it("שכר הטרחה כפוף לכללי הלשכה, כולל האיסור בפלילי", () => {
    expect(strings.undertake5.he).toMatch(/לשכת עורכי הדין/);
    expect(strings.undertake5.he).toMatch(/פלילי/);
  });

  it("הגרסה היא מספר חיובי — היא מה שמבדיל חתימה ישנה מחדשה", () => {
    expect(UNDERTAKING_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(UNDERTAKING_VERSION)).toBe(true);
  });
});
