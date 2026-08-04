import { describe, expect, it } from "vitest";
import { isOnboarded, postAuthRoute } from "./post-auth-route";

/*
 * הבאג שהוליד את הקובץ: משתמש חדש שהתחבר מהטלפון (מסלול ההפניה) נשלח
 * ישר הביתה ודילג על מסך ההתחייבות ועל לחיצת היד. הבדיקות כאן מקבעות
 * שההחלטה תלויה רק במצב המשתמש — לא במסלול ההתחברות.
 */

describe("postAuthRoute", () => {
  it("משתמש חדש הולך לתנאים — לקוח ומי שעוד בלי תפקיד", () => {
    expect(postAuthRoute({ role: "client", onboarded: false })).toBe("/onboarding");
    expect(postAuthRoute({ role: null, onboarded: false })).toBe("/onboarding");
  });

  it("עורך דין חדש הולך לאשף האימות", () => {
    expect(postAuthRoute({ role: "lawyer", onboarded: false })).toBe(
      "/lawyer-onboarding",
    );
  });

  it("מי שכבר אישר — ישר הביתה, לפי תפקיד", () => {
    expect(postAuthRoute({ role: "client", onboarded: true })).toBe("/");
    expect(postAuthRoute({ role: null, onboarded: true })).toBe("/");
    expect(postAuthRoute({ role: "lawyer", onboarded: true })).toBe("/lawyer");
  });
});

describe("isOnboarded", () => {
  it("חותמת שרת קובעת, בלי קשר לגיל החשבון", () => {
    expect(
      isOnboarded({ onboardedAt: { seconds: 1 }, accountCreatedAt: "2026-08-04T10:00:00Z" }),
    ).toBe(true);
  });

  it("חשבון ותיק מלפני הדגל פטור — לא שולחים אותו שוב לתנאים", () => {
    expect(isOnboarded({ accountCreatedAt: "2026-07-01T00:00:00Z" })).toBe(true);
  });

  it("חשבון חדש בלי חותמת — חייב לעבור את המסך", () => {
    expect(isOnboarded({ accountCreatedAt: "2026-08-05T00:00:00Z" })).toBe(false);
  });

  it("בלי שום מידע — לא מוותרים על ההתחייבות", () => {
    expect(isOnboarded({})).toBe(false);
    expect(isOnboarded({ accountCreatedAt: null })).toBe(false);
    expect(isOnboarded({ accountCreatedAt: "לא תאריך" })).toBe(false);
  });
});
