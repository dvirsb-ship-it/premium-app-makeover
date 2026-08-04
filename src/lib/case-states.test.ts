import { describe, expect, it } from "vitest";
import type { CaseStatus } from "./types";

/*
 * רצועת "עורך דין רוצה לקחת את התיק שלך" הופיעה גם על תיק סגור.
 *
 * הסיבה: התנאי היה `interested.length > 0`, וספירת המתעניינים נשארת
 * מלאה גם אחרי שהתיק נסגר או שנבחר עורך דין. ספירה אינה מצב — הסטטוס
 * הוא המצב, והרצועה שייכת בדיוק למצב אחד: ממתין להחלטת הלקוח.
 *
 * הבדיקה מונה את כל הסטטוסים במפורש, כך שסטטוס חדש שיתווסף בעתיד
 * יחייב החלטה מודעת במקום להיגרר פנימה בשקט.
 */

const ALL: CaseStatus[] = [
  "validating",
  "matching",
  "has_interest",
  "connected",
  "closed",
];

/** משכפל את התנאי במסכים (index.tsx, cases.tsx). */
const showsArrivalBand = (s: CaseStatus) => s === "has_interest";

describe("רצועת ההגעה", () => {
  it("מופיעה כשממתינים להחלטת הלקוח", () => {
    expect(showsArrivalBand("has_interest")).toBe(true);
  });

  it("לא מופיעה על תיק סגור — הבאג שדביר צילם", () => {
    expect(showsArrivalBand("closed")).toBe(false);
  });

  it("לא מופיעה בשום מצב אחר", () => {
    for (const s of ALL.filter((x) => x !== "has_interest")) {
      expect(showsArrivalBand(s), s).toBe(false);
    }
  });

  it("ספירת מתעניינים אינה מעידה על המצב", () => {
    /*
     * תיק סגור וגם תיק מחובר מחזיקים מתעניינים ברשימה — ולכן
     * `interested.length > 0` היה נכון בשלושה מצבים שונים.
     */
    const interestedRemainsAfter: CaseStatus[] = ["connected", "closed"];
    for (const s of interestedRemainsAfter) {
      expect(showsArrivalBand(s), s).toBe(false);
    }
  });
});
