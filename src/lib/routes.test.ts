import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * הבדיקות האלה קיימות בגלל באג שדווח ממשתמשת אמיתית: היא נכנסה
 * ל"התיקים שלי", לחצה "שיתוף מקרה חדש" — והוחזרה למסך הבית בלי שפתחה
 * מקרה. שני הכפתורים שם הצביעו ל-/onboarding, שהוא מסך אישור התנאים
 * מההרשמה וסופו navigate("/"). היעד הנכון הוא /intake-tips.
 *
 * הקישור לא היה שבור — הוא היה מוביל למקום הלא נכון. לכן יש כאן שתי
 * רשתות ביטחון שונות: אחת שתופסת יעד שאינו קיים, ואחת שתופסת נקודות
 * כניסה לאותה פעולה שהתפצלו זו מזו.
 */

const ROUTES_DIR = join(process.cwd(), "src", "routes");
const SRC_DIR = join(process.cwd(), "src");

/** המסלולים האמיתיים, לפי שמות הקבצים של הראוטר. */
function realRoutes(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith(".tsx") && !f.startsWith("__"))
    .map((f) => f.slice(0, -4))
    .map((b) => (b === "index" ? "/" : `/${b.replace(/\./g, "/")}`));
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(e.name) && !e.name.includes("routeTree")) out.push(p);
  }
  return out;
}

/** כל יעד ניווט שנכתב בקוד — גם to="..." וגם to: "...". */
function navTargets(): { file: string; line: number; target: string }[] {
  const found: { file: string; line: number; target: string }[] = [];
  for (const file of sourceFiles(SRC_DIR)) {
    const src = readFileSync(file, "utf8");
    const re = /(?:to=|to:\s*)"(\/[^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      found.push({
        file: file.replace(process.cwd() + "/", ""),
        line: src.slice(0, m.index).split("\n").length,
        target: m[1],
      });
    }
  }
  return found;
}

function resolves(target: string, routes: string[]): boolean {
  if (routes.includes(target)) return true;
  // מסלול עם פרמטר, למשל /case/$caseId
  return routes.some(
    (r) =>
      r.includes("$") &&
      new RegExp(`^${r.replace(/\$[A-Za-z]+/g, "[^/]+")}$`).test(target),
  );
}

describe("יעדי ניווט", () => {
  it("כל יעד בקוד מצביע למסלול קיים", () => {
    const routes = realRoutes();
    const broken = navTargets().filter((t) => !resolves(t.target, routes));
    expect(
      broken.map((b) => `${b.file}:${b.line} → ${b.target}`),
      "יעדים שאינם קיימים",
    ).toEqual([]);
  });

  it("נמצאו יעדים לבדוק בכלל", () => {
    // שומר מפני regex ששבר את עצמו ומדווח "הכול תקין" על רשימה ריקה
    expect(navTargets().length).toBeGreaterThan(30);
  });
});

describe("פתיחת מקרה חדש", () => {
  /*
   * ללקוח יש כמה דרכים להתחיל מקרה: הכפתור במסך הבית, ה"+" בכותרת
   * "התיקים שלי", וה-CTA במצב הריק. כולן חייבות להוביל לאותו מקום —
   * הפיצול ביניהן הוא הבאג עצמו.
   */
  it("שתי נקודות הכניסה במסך התיקים מובילות ל-/intake-tips", () => {
    // נספר מתוך היעדים שחולצו, ולא מטקסט הקובץ — אחרת גם הערה נספרת
    const inCases = navTargets().filter((t) => t.file.endsWith("routes/cases.tsx"));
    const toTips = inCases.filter((t) => t.target === "/intake-tips");
    expect(toTips.length, "ה״+״ בכותרת וה-CTA במצב הריק").toBe(2);
  });

  it("אף מסך אינו שולח לפתיחת מקרה דרך מסך אישור התנאים", () => {
    /*
     * /onboarding הוא מסך אישור התנאים, וסופו navigate("/"). מותר להגיע
     * אליו משני מקומות בלבד: סיום ההרשמה (שם היעד מגיע מ-postAuthRoute,
     * לא ממחרוזת קבועה) והשער במסך הבית, שמחזיר לשם מחובר שטרם אישר —
     * זו אכיפה של המסך, לא מסלול לפתיחת מקרה. כל הפניה אחרת היא הבאג
     * שדווח: לקוח שנשלח לפתוח מקרה דרך מסך התנאים.
     */
    const refs = navTargets().filter(
      (t) => t.target === "/onboarding" && !t.file.endsWith("routes/index.tsx"),
    );
    expect(
      refs.map((r) => `${r.file}:${r.line}`),
      "יעד קבוע ל-/onboarding מוציא את הלקוח מהמסלול",
    ).toEqual([]);
  });
});
