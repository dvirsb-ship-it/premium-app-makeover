import { describe, expect, it } from "vitest";
import { MAX_OPEN_CASES as LIMIT, OPEN_CASE_LIMIT_ENABLED } from "./limits";

/*
 * תקרת התיקים הפתוחים.
 *
 * הפער שדביר זיהה: התקרה היומית (15 ולידציות) הגנה על העלות שלנו ולא
 * על תשומת הלב של עורכי הדין — אדם אחד יכול היה לפתוח 15 תיקים ביום
 * ולהציף את הפיד. המספר כאן הוא החלטת מוצר, ולכן הוא מקובע.
 */

const MAX_OPEN_CASES = 3;
const OPEN = ["validating", "matching", "has_interest"];

/** משכפל את תנאי החסימה בשרת (validateCaseFn). */
const blocked = (openCount: number) => openCount > MAX_OPEN_CASES;

describe("תקרת תיקים פתוחים", () => {
  it("שלושה פתוחים עדיין עוברים — נדיב לאדם אמיתי", () => {
    for (let n = 1; n <= MAX_OPEN_CASES; n++) {
      expect(blocked(n), `${n} פתוחים`).toBe(false);
    }
  });

  it("הרביעי נעצר", () => {
    expect(blocked(MAX_OPEN_CASES + 1)).toBe(true);
  });

  it("תיק מחובר או סגור אינו נספר — הוא לא מתחרה על הפיד", () => {
    expect(OPEN).not.toContain("connected");
    expect(OPEN).not.toContain("closed");
    expect(OPEN).not.toContain("rejected");
  });

  it("הסטטוסים שכן נספרים הם בדיוק אלה שמופיעים בפיד או בדרך אליו", () => {
    expect(OPEN).toEqual(["validating", "matching", "has_interest"]);
  });
});

/*
 * המתג עצמו.
 *
 * הבדיקה הזו אינה נכשלת כשהמכסה כבויה — היא מתעדת. מטרתה שמי שיפתח
 * את הקובץ יראה במפורש שהשער סגור בכוונה ומתי מחזירים אותו, במקום
 * לגלות בהשקה שאין מכסה. השער מנוהל ב-LAUNCH-CHECKLIST.md.
 */
describe("מתג המכסה", () => {
  it("הערך עצמו נשאר 3 — הכיבוי אינו שינוי מדיניות", () => {
    expect(LIMIT).toBe(3);
  });

  it("מתועד: המכסה כבויה בתקופת הבדיקות", () => {
    // כשמדליקים לפני ההשקה — לשנות את הציפייה כאן ל-true.
    expect(OPEN_CASE_LIMIT_ENABLED).toBe(false);
  });
});
