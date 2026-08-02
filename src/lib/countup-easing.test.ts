import { describe, expect, it } from "vitest";

/*
 * ה-easing של המספרים הרצים. הועתק מ-CountUp במכוון: אם מישהו יחליף
 * אותו בליניארי בלי לחשוב, ההרגשה תשתנה לגמרי — מספר שרץ ליניארית
 * נראה כמו טיימר, לא כמו הישג שנחשף.
 */
const ease = (p: number) => 1 - Math.pow(1 - p, 4);

describe("ריצת המספרים", () => {
  it("מתחיל באפס ומסיים בערך המלא", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("עושה את רוב הדרך מוקדם — זה ה״סלואו מושן״ בסוף", () => {
    // בחצי הזמן כבר עברנו 93% מהדרך, ומכאן זה נבלם ארוכות
    expect(ease(0.5)).toBeGreaterThan(0.9);
    expect(ease(0.8)).toBeGreaterThan(0.99);
  });

  it("מונוטוני — מספר לעולם לא יורד באמצע הריצה", () => {
    for (let p = 0; p < 1; p += 0.05) {
      expect(ease(p + 0.05)).toBeGreaterThanOrEqual(ease(p));
    }
  });

  it("100 אחוז מגיע בדיוק ל-100 ולא ל-99", () => {
    // עיגול של ערך ביניים גבוה חייב לנחות על הערך המלא
    expect(Math.round(100 * ease(1))).toBe(100);
    expect(Math.round(21 * ease(1))).toBe(21);
    expect(Math.round(6 * ease(1))).toBe(6);
  });
});
