import { describe, expect, it } from "vitest";
import { FREE_CONNECTIONS, foundingUntil, isFounding, trialState } from "./trial";

/*
 * מודל הניסיון נוגע בכסף ובהבטחה שכבר פורסמה, ולכן כל כלל כאן מקובע:
 * שינוי הוא החלטה עסקית, והוא חייב להיכשל בבדיקה קודם.
 */

const APPROVED = Date.parse("2026-08-04T00:00:00Z");
const MONTH = 30 * 24 * 3600_000;

describe("תקופת המייסדים", () => {
  it("חצי שנה מיום האישור — לא מיום ההרשמה", () => {
    const until = foundingUntil(APPROVED)!;
    // אוגוסט + 6 = פברואר של השנה הבאה
    expect(new Date(until).getFullYear()).toBe(2027);
    expect(new Date(until).getMonth()).toBe(1);
    expect(isFounding(APPROVED, APPROVED + 5 * MONTH)).toBe(true);
  });

  it("אחרי חצי שנה — כבר לא מייסד", () => {
    expect(isFounding(APPROVED, APPROVED + 7 * MONTH)).toBe(false);
  });

  it("בלי תאריך אישור אין תקופת מייסדים", () => {
    expect(isFounding(undefined)).toBe(false);
    expect(isFounding(0)).toBe(false);
    expect(foundingUntil(null)).toBe(null);
  });
});

describe("מכסת החיבורים", () => {
  it("מייסד אינו כפוף למכסה, גם עם המון חיבורים", () => {
    const s = trialState({ connections: 99, approvedAt: APPROVED, now: APPROVED + MONTH });
    expect(s.canExpressInterest).toBe(true);
    expect(s.exhausted).toBe(false);
  });

  it("מנוי בתשלום אינו כפוף למכסה", () => {
    const s = trialState({ connections: 99, subscribed: true });
    expect(s.canExpressInterest).toBe(true);
  });

  it("שלושת הראשונים חינם", () => {
    for (let n = 0; n < FREE_CONNECTIONS; n++) {
      const s = trialState({ connections: n });
      expect(s.canExpressInterest, `אחרי ${n} חיבורים`).toBe(true);
      expect(s.left).toBe(FREE_CONNECTIONS - n);
    }
  });

  it("אחרי השלישי — הקיר עולה", () => {
    const s = trialState({ connections: FREE_CONNECTIONS });
    expect(s.canExpressInterest).toBe(false);
    expect(s.exhausted).toBe(true);
    expect(s.left).toBe(0);
  });

  it("חריגה מעבר למכסה אינה מייצרת מספר שלילי", () => {
    expect(trialState({ connections: 10 }).left).toBe(0);
  });

  it("מונה חסר נחשב כאפס — עו״ד חדש מקבל את מלוא המכסה", () => {
    expect(trialState({}).left).toBe(FREE_CONNECTIONS);
  });
});
