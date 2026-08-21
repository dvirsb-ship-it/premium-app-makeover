/**
 * היכן תפריט הניווט התחתון מוצג.
 *
 * עד עכשיו כל מסך הוסיף `<BottomNav />` בעצמו, ולכן הוא פשוט נשכח:
 * בצד עורך הדין הוא ליווה אותו לאורך הדרך, ובצד הלקוח הוא נעלם בדיוק
 * במסך שבו הלקוח יושב הכי הרבה — פרטי התיק. אותו הבדל היה גם במסך
 * ההתראות, בשני הצדדים.
 *
 * לכן ההחלטה יושבת כאן, במקום אחד, וברירת המחדל היא **להציג**. מסך
 * חדש מקבל תפריט אלא אם נכתב כאן במפורש שלא — ולא להפך.
 */

/**
 * מסלולים ממוקדים: שיחה עם המנוע, אימות מסמכים, הרשמה, מסכי טרום־כניסה
 * וכלי האדמין. בהם תפריט הוא הזמנה לצאת באמצע תהליך, ולא ניווט.
 * הרשימה זהה לשני הצדדים — זה מה שהופך אותה ליישור קו ולא לחריגים.
 */
export const FOCUSED_ROUTES = [
  "/welcome",
  "/auth",
  /* דף ציבורי למי שאינו מחובר — אין לו למה לנווט */
  "/lawyers",
  "/onboarding",
  "/lawyer-onboarding",
  "/intake",
  "/intake-tips",
  "/validating",
  /*
   * אישור הסיכום ובחירת עורך הדין — לב הזרימה. התפריט כיסה כאן את פס
   * האישור הקבוע (z-40 מעל z-30) והכפתור פשוט לא נראה — נמצא בבדיקה
   * המשותפת על מכשיר אמיתי, 21/8/2026.
   */
  "/summary",
  "/choose",
  "/admin",
] as const;

/** האם המסלול הזה הוא חלק מהאפליקציה עצמה (ולא מסלול ממוקד). */
export function routeShowsNav(pathname: string): boolean {
  return !FOCUSED_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * מסכי המשך ששייכים ללשונית אך אינם מתחילים בנתיב שלה.
 *
 * בלעדיהם מסך פרטי תיק לא מדליק שום לשונית, והמשתמש מאבד את תחושת
 * המיקום בדיוק במסך שהוא נכנס אליו הכי הרבה.
 */
const TAB_ALIASES: Record<string, readonly string[]> = {
  "/lawyer-cases": ["/lawyer-case"],
  "/cases": ["/case"],
  "/profile": ["/settings"],
};

/** האם הנתיב שייך לנתיב־בסיס — לפי גבול מקטע, לא לפי תחילית טקסטואלית. */
function underPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * האם הלשונית הזו פעילה במסלול הנוכחי.
 *
 * הבדיקה היא על **גבול מקטע** ולא על תחילית מחרוזת, וזה לא ניואנס:
 * `"/lawyer-cases".startsWith("/lawyer")` הוא true, ולכן במסך "התיקים
 * שלי" גם "פניות" וגם "התיקים שלי" סומנו פעילות. שתיהן רינדרו את אותו
 * layoutId של framer-motion, שמניח יחידוּת — והתוצאה הייתה שלשונית
 * שלמה נעלמה מהתפריט.
 */
export function isTabActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (underPath(pathname, to)) return true;
  return (TAB_ALIASES[to] ?? []).some((alias) => underPath(pathname, alias));
}

/**
 * ההחלטה המלאה — מסלול, תפקיד ומצב התחברות יחד.
 *
 * טהורה בכוונה: זו הלוגיקה שנשברה כבר פעמיים במציאות, ובדיקה של hook
 * דורשת רינדור. כאן אפשר לנסח כל מצב כתנאי.
 */
export function showsBottomNav(state: {
  pathname: string;
  /** null = טרם נבחר תפקיד, או שהשליפה מהשרת נכשלה. */
  role: "client" | "lawyer" | null;
  signedIn: boolean;
}): boolean {
  /*
   * מסך בחירת התפקיד יושב על "/" ולא על מסלול משלו, ולכן אינו יכול
   * להיכנס ל-FOCUSED_ROUTES: אותו נתיב משמש גם את מסך הבית של הלקוח,
   * ששם התפריט חייב להופיע. ההבחנה היא בתפקיד — כל עוד לא נבחר, המסך
   * היחיד שמוצג שם הוא הבחירה עצמה, ואין לאן לנווט ממנה.
   */
  if (state.pathname === "/" && state.role === null) return false;
  return (state.signedIn || state.role !== null) && routeShowsNav(state.pathname);
}
