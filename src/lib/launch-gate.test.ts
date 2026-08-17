import { describe, it, expect } from "vitest";
import { LAWYER_RATINGS_VISIBLE, MAX_OPEN_CASES, OPEN_CASE_LIMIT_ENABLED } from "./limits";

/*
 * שער ההשקה — הופך את LAUNCH-CHECKLIST.md ממסמך למנגנון (17/8/2026).
 *
 * הצ'ק-ליסט פותח במשפט "הרשימה הזו קיימת כי 'נזכור' הוא לא מנגנון",
 * והוא צודק — אבל גם הוא עצמו מסמך שצריך לזכור לפתוח. הקובץ הזה סוגר
 * את הפער: ביום רגיל הוא רק מתעד את המצב, וברגע שמריצים
 *
 *     LAUNCH=1 bun run test
 *
 * הוא נכשל על כל דגל שאינו במצב ההשקה שלו. מי שמשלח לייצור בלי לעבור
 * את השער חייב **לכבות אותו במפורש**, וזו פעולה מודעת — להבדיל משכחה.
 *
 * למה לא פשוט לדרוש שהדגלים יהיו דלוקים תמיד: הם כבויים מסיבה טובה.
 * המכסה חוסמת את דביר מלבדוק ומלצלם מסכים לחנויות, והדירוגים ממתינים
 * לחוות דעת. הבדיקה לא מתווכחת עם ההחלטה — היא רק לא נותנת לה לשרוד
 * את ההשקה בהיסח הדעת.
 */

const LAUNCHING = process.env.LAUNCH === "1";

type Flag = {
  name: string;
  actual: boolean;
  /** מה חייב להיות ברגע שיש לקוחות אמיתיים */
  atLaunch: boolean;
  why: string;
};

const FLAGS: Flag[] = [
  {
    name: "OPEN_CASE_LIMIT_ENABLED",
    actual: OPEN_CASE_LIMIT_ENABLED,
    atLaunch: true,
    why: "בלי המכסה אדם אחד יכול לפתוח תיקים ללא הגבלה ולשרוף לעורכי הדין את תשומת הלב",
  },
  {
    name: "LAWYER_RATINGS_VISIBLE",
    actual: LAWYER_RATINGS_VISIBLE,
    atLaunch: false,
    why: "דירוג השוואתי של עורכי דין ע\"י גוף מסחרי ממתין לחוות דעת אתית — אסור שיידלק מעצמו",
  },
];

describe("שער ההשקה", () => {
  it("המכסה עצמה נשארת שפויה גם כשהשער פתוח", () => {
    // אם מישהו יאפס את המכסה, הדלקת הדגל לא תגן על כלום
    expect(MAX_OPEN_CASES).toBeGreaterThan(0);
    expect(MAX_OPEN_CASES).toBeLessThanOrEqual(10);
  });

  for (const f of FLAGS) {
    it(`${f.name} — ${f.actual} (בהשקה: ${f.atLaunch})`, () => {
      if (!LAUNCHING) {
        // יום רגיל: רק מתעדים. הבדיקה קיימת כדי שהערך יופיע בפלט.
        expect(typeof f.actual).toBe("boolean");
        return;
      }
      expect(
        f.actual,
        `\n\n  ⛔ ${f.name} הוא ${f.actual}, ובהשקה הוא חייב להיות ${f.atLaunch}.\n` +
          `     ${f.why}\n` +
          `     ראו LAUNCH-CHECKLIST.md.\n`,
      ).toBe(f.atLaunch);
    });
  }
});
