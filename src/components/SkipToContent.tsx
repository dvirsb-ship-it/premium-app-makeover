import { useT } from "../lib/i18n";

/**
 * "דלג לתוכן" — WCAG 2.4.1 (Bypass Blocks), רמה A.
 *
 * מי שמנווט במקלדת או בקורא מסך נוחת בראש העמוד ועובר בטאב על כל
 * הניווט לפני שהוא מגיע לתוכן. בכל מסך מחדש. הקישור הזה הוא הדרך
 * לדלג — הוא הפריט הראשון בסדר הטאב, נסתר עד שהוא מקבל פוקוס, ואז
 * מופיע.
 *
 * לא sr-only בלבד: מי שרואה ומנווט במקלדת חייב לראות לאן הפוקוס הגיע,
 * אחרת הקישור קופץ אותו למקום שהוא לא יודע שקיים.
 *
 * ‎tabIndex={-1}‎ על היעד ב-__root הוא מה שמאפשר ל-<main> לקבל פוקוס
 * בפועל; בלעדיו הדפדפן גולל אבל משאיר את הפוקוס מאחור, והמקלדת
 * ממשיכה מהניווט — כלומר הדילוג לא באמת קרה.
 */
export function SkipToContent() {
  const t = useT();
  return (
    <a
      href="#main-content"
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById("main-content");
        if (!el) return;
        el.focus();
        el.scrollIntoView({ block: "start" });
      }}
      className="skip-link"
    >
      {t("skipToContent")}
    </a>
  );
}
