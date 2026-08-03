import { useLocation } from "@tanstack/react-router";
import { showsBottomNav } from "./nav-routes";
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
 *
 * הכלל עצמו יושב ב-nav-routes כפונקציה טהורה — הלוגיקה הזו כבר נשברה
 * פעמיים במציאות, וקל יותר לבדוק תנאי מאשר hook.
 */
export function useShowsBottomNav(): boolean {
  const { pathname } = useLocation();
  const { role, user } = useAppStore();
  return showsBottomNav({ pathname, role, signedIn: !!user });
}
