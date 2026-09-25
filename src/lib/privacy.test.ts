import { describe, expect, it } from "vitest";
import { scrubApplicantName, stripContactInfo } from "./privacy";

/*
 * שלב א של החשיפה המדורגת שולח לעורך הדין את שמות הצדדים לבדיקת ניגוד
 * עניינים — אבל הפונה עצמו הוא תמיד "הפונה" (סעיף 2.5). המנוע כותב
 * שמות "אם נאמרו", ולכן שם שהפונה אמר על עצמו חייב להיות מטוהר בשרת.
 */
describe("scrubApplicantName", () => {
  it("מחליף את השם המלא של הפונה ב'הפונה'", () => {
    expect(scrubApplicantName("דביר ביטון; חברת הביטוח הפניקס", "דביר ביטון")).toBe(
      "הפונה; חברת הביטוח הפניקס",
    );
  });

  it("מחליף גם שם פרטי לבד — והכפילות מכווצת", () => {
    expect(scrubApplicantName("דביר; סופרמרקט יוחננוף", "דביר ביטון")).toBe(
      "הפונה; סופרמרקט יוחננוף",
    );
    expect(scrubApplicantName("הפונה דביר; בעל הדירה", "דביר ביטון")).toBe(
      "הפונה; בעל הדירה",
    );
  });

  it("לא נוגע בשמות של צדדים אחרים שאינם שם הפונה", () => {
    expect(scrubApplicantName("הפונה; יוסי כהן בעל המוסך", "דביר ביטון")).toBe(
      "הפונה; יוסי כהן בעל המוסך",
    );
  });

  it("שם שהוא חלק ממילה אחרת לא נפגע (גבולות מילה בעברית)", () => {
    expect(scrubApplicantName("הפונה; חברת דבירה בע\"מ", "דביר ביטון")).toBe(
      "הפונה; חברת דבירה בע\"מ",
    );
  });

  it("בלי שם תצוגה — הטקסט חוזר כמו שהוא", () => {
    expect(scrubApplicantName("דביר; המעביד", "")).toBe("דביר; המעביד");
  });
});

describe("stripContactInfo", () => {
  it("מסיר טלפון, אימייל וקישור", () => {
    const out = stripContactInfo("תתקשרו 052-1234567 או a@b.com או https://x.co");
    expect(out).not.toContain("052");
    expect(out).not.toContain("@");
    expect(out).not.toContain("https");
  });
});
