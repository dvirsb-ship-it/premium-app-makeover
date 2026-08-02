import type { ReactNode } from "react";
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
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-background text-foreground",
        outerClassName,
      )}
    >
      {/* soft gold aura from above */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(212,175,55,0.12),transparent_60%)]"
      />
      {/* cool depth from below */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_120%,rgba(56,89,168,0.12),transparent_55%)]"
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
