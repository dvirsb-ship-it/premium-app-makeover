import { useLocation } from "@tanstack/react-router";
import { routeShowsNav } from "./nav-routes";
import { useAppStore } from "./store";

/**
 * האם להציג את תפריט הניווט התחתון במסך הנוכחי.
 *
 * ההחלטה נלקחת כאן ולא בכל מסך בנפרד. קודם כל מסך רינדר את התפריט
 * בעצמו, וכך מסך הבית של הלקוח שמר לו מקום (pb-28) בלי לרנדר אותו
 * בכלל — חור בתחתית המסך שבו הלקוח מתחיל את כל המסע.
 *
 * גם הריפוד וגם התפריט נגזרים מהפונקציה הזו, ולכן הם לא יכולים
 * להיפרד זה מזה.
 */
export function useShowsBottomNav(): boolean {
  const { pathname } = useLocation();
  const { role } = useAppStore();
  // בלי תפקיד אין למה לנווט — זה אורח שטרם בחר צד
  return role !== null && routeShowsNav(pathname);
}
