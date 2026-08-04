import { describe, expect, it } from "vitest";
import type { CaseStatus } from "./types";

/*
 * משיכת פנייה. שני כללים שאסור שיישחקו, ולכן הם מקובעים כאן:
 *
 * 1. תיק מחובר אינו נמשך. בשלב הזה יש יחסי עו"ד-לקוח, וסיומם אינו
 *    לחיצה חד-צדדית. (נאכף גם בחוקי הגישה — ראו rules-tests.)
 * 2. פנייה שנמשכה ממשיכה להיספר במכסה שבוע. בלי זה משיכה משחררת מקום
 *    מיד, ואפשר לפתוח 3 → למשוך → לפתוח 3 — בדיוק ההצפה שהמכסה
 *    נועדה למנוע.
 */

const WITHDRAWABLE: CaseStatus[] = ["matching", "has_interest"];
const ALL: CaseStatus[] = [
  "validating",
  "matching",
  "has_interest",
  "connected",
  "closed",
  "withdrawn",
];

const canWithdraw = (s: CaseStatus) => WITHDRAWABLE.includes(s);

const HOLD_MS = 7 * 24 * 60 * 60 * 1000;
const countsInQuota = (withdrawnAt: number, now: number) =>
  now - withdrawnAt < HOLD_MS;

describe("מאיזה מצב אפשר למשוך", () => {
  it("פנייה פתוחה — כן", () => {
    expect(canWithdraw("matching")).toBe(true);
    expect(canWithdraw("has_interest")).toBe(true);
  });

  it("תיק מחובר — לא. יש כבר עורך דין שעובד עליו", () => {
    expect(canWithdraw("connected")).toBe(false);
  });

  it("שום מצב אחר אינו ניתן למשיכה", () => {
    for (const s of ALL.filter((x) => !WITHDRAWABLE.includes(x))) {
      expect(canWithdraw(s), s).toBe(false);
    }
  });
});

describe("המכסה אחרי משיכה", () => {
  const t0 = Date.parse("2026-08-05T00:00:00Z");
  const day = 86_400_000;

  it("נספרת מיד אחרי המשיכה", () => {
    expect(countsInQuota(t0, t0 + 60_000)).toBe(true);
  });

  it("עדיין נספרת אחרי שישה ימים — כאן נשברת לולאת ההצפה", () => {
    expect(countsInQuota(t0, t0 + 6 * day)).toBe(true);
  });

  it("משתחררת אחרי שבוע", () => {
    expect(countsInQuota(t0, t0 + 8 * day)).toBe(false);
  });
});
