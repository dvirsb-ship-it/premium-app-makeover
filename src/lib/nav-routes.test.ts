import { describe, expect, it } from "vitest";
import { FOCUSED_ROUTES, isTabActive, routeShowsNav, showsBottomNav } from "./nav-routes";

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

describe("showsBottomNav — מסך בחירת התפקיד", () => {
  /*
   * הפער שדביר מצא: התחברות עם חשבון שאין לו עדיין תפקיד הציגה את מסך
   * "לקוח או עורך דין?" — ומתחתיו תפריט עם "התיקים שלי" ו"פרופיל".
   * מי שטרם בחר תפקיד אינו לקוח ואינו עורך דין, ושתי הלשוניות מובילות
   * למסכים שאין לו.
   *
   * המסך יושב על "/" ולכן אי אפשר להוסיף אותו ל-FOCUSED_ROUTES —
   * אותו נתיב הוא גם מסך הבית של הלקוח, ששם התפריט חייב להופיע.
   */
  it("אין תפריט לפני שנבחר תפקיד", () => {
    expect(showsBottomNav({ pathname: "/", role: null, signedIn: true })).toBe(false);
  });

  it("גם למי שאינו מחובר כלל", () => {
    expect(showsBottomNav({ pathname: "/", role: null, signedIn: false })).toBe(false);
  });

  it("אבל מסך הבית של הלקוח — אותו נתיב בדיוק — כן מקבל תפריט", () => {
    expect(showsBottomNav({ pathname: "/", role: "client", signedIn: true })).toBe(true);
  });

  it("וגם עורך דין על אותו נתיב", () => {
    expect(showsBottomNav({ pathname: "/", role: "lawyer", signedIn: true })).toBe(true);
  });
});

describe("showsBottomNav — מה שכבר עבד וחייב להישאר", () => {
  it("מחובר בלי תפקיד שנשלף עדיין מקבל תפריט בשאר המסכים", () => {
    // הרגרסיה הקודמת: כשל בשליפת התפקיד השאיר משתמש בלי שום דרך לנווט
    expect(showsBottomNav({ pathname: "/cases", role: null, signedIn: true })).toBe(true);
    expect(showsBottomNav({ pathname: "/notifications", role: null, signedIn: true })).toBe(true);
  });

  it("מסלול ממוקד לא מקבל תפריט בשום מצב", () => {
    for (const role of ["client", "lawyer", null] as const) {
      expect(showsBottomNav({ pathname: "/intake", role, signedIn: true })).toBe(false);
      expect(showsBottomNav({ pathname: "/auth", role, signedIn: true })).toBe(false);
    }
  });

  it("מי שאינו מחובר ואין לו תפקיד לא מקבל תפריט", () => {
    expect(showsBottomNav({ pathname: "/cases", role: null, signedIn: false })).toBe(false);
  });

  it("תפקיד מהמטמון מספיק — מונע הבהוב עד ש-Firebase מסיים", () => {
    expect(showsBottomNav({ pathname: "/cases", role: "lawyer", signedIn: false })).toBe(true);
  });
});

/*
 * הבאג שדביר ראה: במסך "התיקים שלי" של עורך הדין הופיעו שתי לשוניות
 * במקום שלוש — "פניות" נעלמה.
 *
 * הסיבה: "/lawyer-cases".startsWith("/lawyer") הוא true, ולכן שתי
 * לשוניות סומנו פעילות. שתיהן רינדרו את אותו layoutId של framer-motion,
 * שמניח יחידוּת, ואחת מהן נבלעה. אותה מלכודת תחילית שכבר נתפסה
 * ב-routeShowsNav בין /intake ל-/intake-summary.
 *
 * התנאי החזק כאן הוא "בדיוק אחת" — הוא זה שתופס את הבליעה.
 */

const LAWYER_TABS = ["/lawyer", "/lawyer-cases", "/profile"] as const;
const CLIENT_TABS = ["/", "/cases", "/profile"] as const;

function activeCount(pathname: string, tabs: readonly string[]) {
  return tabs.filter((t) => isTabActive(pathname, t)).length;
}

describe("isTabActive — הלשונית הפעילה", () => {
  it("״התיקים שלי״ אינו מדליק גם את ״פניות״ — הבאג עצמו", () => {
    expect(isTabActive("/lawyer-cases", "/lawyer")).toBe(false);
    expect(isTabActive("/lawyer-cases", "/lawyer-cases")).toBe(true);
  });

  it("בכל מסך של עורך הדין פעילה בדיוק לשונית אחת", () => {
    for (const p of ["/lawyer", "/lawyer-cases", "/lawyer-case/abc", "/profile", "/settings/notifications"]) {
      expect(activeCount(p, LAWYER_TABS), `${p} — צריך בדיוק אחת`).toBe(1);
    }
  });

  it("בכל מסך של הלקוח פעילה בדיוק לשונית אחת", () => {
    for (const p of ["/", "/cases", "/case/abc", "/profile", "/settings/notifications"]) {
      expect(activeCount(p, CLIENT_TABS), `${p} — צריך בדיוק אחת`).toBe(1);
    }
  });

  it("מסך פרטי תיק מדליק את הלשונית שממנה הגיעו", () => {
    expect(isTabActive("/lawyer-case/abc", "/lawyer-cases")).toBe(true);
    expect(isTabActive("/case/abc", "/cases")).toBe(true);
    // ולא את האחרות
    expect(isTabActive("/lawyer-case/abc", "/lawyer")).toBe(false);
    expect(isTabActive("/case/abc", "/")).toBe(false);
  });

  it("הגדרות שייכות לפרופיל", () => {
    expect(isTabActive("/settings/notifications", "/profile")).toBe(true);
  });

  it("הבית של הלקוח נדלק רק על הנתיב עצמו", () => {
    expect(isTabActive("/", "/")).toBe(true);
    expect(isTabActive("/cases", "/")).toBe(false);
    expect(isTabActive("/profile", "/")).toBe(false);
  });
});
