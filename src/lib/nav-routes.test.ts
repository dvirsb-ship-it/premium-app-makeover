import { describe, expect, it } from "vitest";
import { FOCUSED_ROUTES, routeShowsNav } from "./nav-routes";

/*
 * הבדיקות האלה קיימות בגלל פער אמיתי שהתגלה בשימוש: תפריט הניווט ליווה
 * את עורך הדין לאורך כל הדרך, ובצד הלקוח נעלם דווקא במסך פרטי התיק —
 * המסך שבו הלקוח יושב הכי הרבה. הסיבה הייתה שכל מסך הוסיף את התפריט
 * בעצמו, ולכן אפשר היה פשוט לשכוח.
 *
 * הכלל כאן הוא יישור הקו. אם מישהו יוסיף חריג לצד אחד בלבד, זה ייפול כאן.
 */

describe("routeShowsNav", () => {
  it("מסכי האפליקציה של שני הצדדים מקבלים תפריט", () => {
    for (const p of [
      "/",
      "/cases",
      "/case/abc123",
      "/notifications",
      "/profile",
      "/lawyer",
      "/lawyer-cases",
      "/lawyer-case/abc123",
      "/lawyer-profile/xyz",
      "/lawyer-subscription",
      "/settings/notifications",
    ]) {
      expect(routeShowsNav(p), `${p} אמור לקבל תפריט`).toBe(true);
    }
  });

  it("מסלולים ממוקדים אינם מקבלים תפריט", () => {
    for (const p of [
      "/welcome",
      "/auth",
      "/onboarding",
      "/lawyer-onboarding",
      "/intake",
      "/intake-tips",
      "/validating",
      "/admin/verifications",
    ]) {
      expect(routeShowsNav(p), `${p} לא אמור לקבל תפריט`).toBe(false);
    }
  });

  it("מסכי פרטי התיק מיושרים בין הלקוח לעורך הדין", () => {
    // זה הפער המקורי בדיוק: אצל עו״ד היה תפריט ואצל הלקוח לא
    expect(routeShowsNav("/case/1")).toBe(routeShowsNav("/lawyer-case/1"));
    expect(routeShowsNav("/case/1")).toBe(true);
  });

  it("״intake״ אינו חוסם מסלול שרק מתחיל באותן אותיות", () => {
    // /intake חוסם את /intake ואת /intake/..., לא כל מה שמתחיל ב-"intake"
    expect(routeShowsNav("/intake")).toBe(false);
    expect(routeShowsNav("/intake/step-2")).toBe(false);
    expect(routeShowsNav("/intake-summary")).toBe(true);
  });

  it("כל מסלול ממוקד מתחיל בלוכסן ואין כפילויות", () => {
    for (const p of FOCUSED_ROUTES) expect(p.startsWith("/")).toBe(true);
    expect(new Set(FOCUSED_ROUTES).size).toBe(FOCUSED_ROUTES.length);
  });
});
