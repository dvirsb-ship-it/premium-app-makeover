import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";
import { useShowsBottomNav } from "../lib/use-bottom-nav";

/**
 * Mobile-first app canvas. Follows the global theme (light "studio white" or
 * the cinematic dark theme) via design tokens so every screen has a matching
 * white and dark version.
 *
 * הריפוד התחתון נגזר מאותה החלטה שמרנדרת את התפריט עצמו, ולא מ-prop
 * שכל מסך מעביר בעצמו — כך אי אפשר לשמור מקום לתפריט שלא קיים, וזה
 * בדיוק מה שקרה במסך הבית של הלקוח.
 */
export function AppShell({
  children,
  className,
  outerClassName,
  bare = false,
}: {
  children: ReactNode;
  className?: string;
  outerClassName?: string;
  bare?: boolean;
}) {
  const withNav = useShowsBottomNav();
  return (
    <div
      /*
       * `overflow-clip` ולא `overflow-hidden` (10/8/2026).
       *
       * `hidden` הופך את האלמנט למכל־גלילה, וכל `position: sticky` שבתוכו
       * מאבד את נקודת הייחוס שלו ופשוט נגלל החוצה. נמדד בדפדפן: כותרת
       * דביקה נעה מ-0 ל-‎-812 בגלילה של 700 פיקסלים. זה השבית בשקט את
       * `TopBar` ב-17 מסכים ואת כל פסי־הפעולה התחתונים — כולם נכתבו כדי
       * להידבק, ואף אחד מהם לא נדבק מעולם.
       *
       * `clip` חותך בדיוק אותו דבר אך **אינו** יוצר מכל־גלילה, ולכן sticky
       * ממשיך להתייחס לחלון. נמדד: נשאר על 0.
       *
       * `--nav-inset` נולד מכאן: ברגע ש-sticky חי, פס־פעולה תחתון נצמד
       * לתחתית החלון — כלומר *מתחת* לתפריט הניווט שהוא `fixed bottom-0`.
       * המשתנה נותן לפסים האלה להיעצר מעל התפריט, ומגיע ממקום אחד כדי
       * שגובה התפריט לא יישכפל בשישה קבצים.
       */
      style={{ "--nav-inset": withNav ? "5.5rem" : "0px" } as CSSProperties}
      className={cn(
        "relative min-h-screen w-full overflow-clip bg-background text-foreground",
        outerClassName,
      )}
    >
      {/*
        * ההילות — במצב כהה בלבד (10/8/2026). שם הן אווירה; על נייר לבן
        * הן שטיפה כחלחלה-קרם שהופכת את הדף ל"תכלת אפרפר" — בדיוק מה
        * שדביר ביקש להוריד. הנייר נשאר נייר.
        */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 hidden bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(212,175,55,0.12),transparent_60%)] dark:block"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 hidden bg-[radial-gradient(110%_70%_at_50%_120%,rgba(56,89,168,0.12),transparent_55%)] dark:block"
      />
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col",
          withNav && "pb-28",
          !bare && "px-5",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
