import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * מה שהופך `role="dialog"` לדיאלוג אמיתי — WCAG 2.1.2 ו-2.4.3 (רמה A).
 *
 * לפני זה (17/8/2026) המודאלים שלנו היו מסומנים נכון ולא התנהגו נכון:
 * אפשר היה לסגור אותם רק בעכבר, הפוקוס נשאר על המסך שמאחור, וטאב
 * המשיך לטייל בין הכפתורים החבויים מתחת לשכבה. משתמש מקלדת נלכד.
 *
 * שלושה דברים:
 * 1. Escape סוגר.
 * 2. הפוקוס נכנס פנימה בפתיחה — וחוזר בדיוק למקום שממנו יצא בסגירה,
 *    אחרת מי שסגר מוצא את עצמו בראש העמוד בלי הקשר.
 * 3. טאב מסתובב בתוך הדיאלוג ולא בורח למה שמאחוריו.
 *
 * ה-callback נשמר ב-ref ולא ב-deps: קורא שמעביר חץ אנונימי (וכולם
 * מעבירים) היה מריץ את ה-effect מחדש בכל רינדור, וגוזל את הפוקוס
 * מהמשתמש בכל הקלדה.
 *
 * `enabled` קיים בשביל דיאלוג שנשאר מורכב כשהוא סגור — למשל כזה
 * שעטוף ב-AnimatePresence עם ‎{open && …}‎. בלעדיו ה-effect היה תופס
 * את הפוקוס ומקשיב ל-Escape גם כשאין מה לסגור.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  enabled = true,
) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const node = ref.current;

    // הפוקוס נכנס לפריט הראשון; אם אין — לדיאלוג עצמו, כדי שקורא מסך
    // יכריז עליו ולא ימשיך לקרוא את המסך שמאחור.
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    if (first) first.focus();
    else if (node) {
      node.setAttribute("tabindex", "-1");
      node.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      // מחוץ לדיאלוג לגמרי — מחזירים פנימה במקום לתת לטאב להימלט
      if (!node.contains(active)) {
        e.preventDefault();
        firstEl.focus();
        return;
      }
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // הדיאלוג נעלם מה-DOM לפני שהניקוי רץ, ולכן ההחזרה בטוחה
      restoreTo?.focus?.();
    };
  }, [enabled]);

  return ref;
}
