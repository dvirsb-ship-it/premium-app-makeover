import { describe, expect, it } from "vitest";
import { timeAgo } from "./status";

/**
 * ניסוחי הזמן היחסי מופיעים במסך הבית, ברשימת התיקים ובהתראות —
 * שלושת המסכים הנצפים ביותר. עברית וערבית אינן מסתפקות במספר + שם
 * עצם: יש להן צורת יחיד וצורת זוגי, ומספר עירום לפני שם עצם ברבים
 * ("לפני 1 שעות") נקרא כמו תרגום מכונה.
 *
 * הבדיקות כאן מקבעות את הדקדוק, לא את הפורמט — מספר שהוצמד לשם עצם
 * שגוי הוא באג גלוי שאין דרך אחרת לתפוס.
 */

const H = 60 * 60 * 1000;
const D = 24 * H;
const ago = (ms: number) => Date.now() - ms;

describe("timeAgo — עברית", () => {
  it("פחות משעה — 'הרגע'", () => {
    expect(timeAgo(ago(20 * 60 * 1000), "he")).toBe("הרגע");
  });

  it("שעה אחת — יחיד, בלי המספר", () => {
    expect(timeAgo(ago(H), "he")).toBe("לפני שעה");
  });

  it("שעתיים — צורת הזוגי", () => {
    expect(timeAgo(ago(2 * H), "he")).toBe("לפני שעתיים");
  });

  it("שלוש שעות ומעלה — רבים עם מספר", () => {
    expect(timeAgo(ago(5 * H), "he")).toBe("לפני 5 שעות");
  });

  it("יום — 'אתמול'", () => {
    expect(timeAgo(ago(D + H), "he")).toBe("אתמול");
  });

  it("יומיים — צורת הזוגי", () => {
    expect(timeAgo(ago(2 * D), "he")).toBe("לפני יומיים");
  });

  it("שלושה ימים ומעלה — רבים עם מספר", () => {
    expect(timeAgo(ago(6 * D), "he")).toBe("לפני 6 ימים");
  });
});

describe("timeAgo — ערבית", () => {
  it("שעה אחת — יחיד", () => {
    expect(timeAgo(ago(H), "ar")).toBe("قبل ساعة");
  });

  it("שעתיים — צורת הזוגי", () => {
    expect(timeAgo(ago(2 * H), "ar")).toBe("قبل ساعتين");
  });

  it("3–10 שעות — רבים", () => {
    expect(timeAgo(ago(5 * H), "ar")).toBe("قبل 5 ساعات");
  });

  it("11 שעות ומעלה — יחיד אחרי המספר, כדין הערבית", () => {
    expect(timeAgo(ago(14 * H), "ar")).toBe("قبل 14 ساعة");
  });

  it("יומיים — צורת הזוגי", () => {
    expect(timeAgo(ago(2 * D), "ar")).toBe("قبل يومين");
  });
});

describe("timeAgo — שאר השפות", () => {
  /* בהן הניסוח מקוצר ולכן המספר אינו יוצר שגיאת דקדוק */
  it("אנגלית", () => {
    expect(timeAgo(ago(H), "en")).toBe("1h ago");
    expect(timeAgo(ago(3 * D), "en")).toBe("3d ago");
  });

  it("כל שפה מחזירה מחרוזת לא ריקה בכל טווח", () => {
    for (const lang of ["he", "en", "ru", "ar", "es", "fr"] as const) {
      for (const ms of [0, H, 2 * H, 9 * H, D, 2 * D, 30 * D]) {
        expect(timeAgo(ago(ms), lang).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("חותמת עתידית אינה מייצרת מספר שלילי", () => {
    expect(timeAgo(Date.now() + 5 * H, "he")).toBe("הרגע");
  });
});
