import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Mobile-first app canvas. Every screen sits on a shared cinematic dark
 * backdrop so the liquid-glass surfaces read consistently across the app.
 */
export function AppShell({
  children,
  className,
  outerClassName,
  withNav = false,
  bare = false,
}: {
  children: ReactNode;
  className?: string;
  outerClassName?: string;
  withNav?: boolean;
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "dark relative min-h-screen w-full overflow-hidden bg-[#050915] text-foreground",
        outerClassName,
      )}
    >
      {/* cinematic gold aura from above */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(212,175,55,0.14),transparent_60%)]"
      />
      {/* cool blue depth from below */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_120%,rgba(56,89,168,0.16),transparent_55%)]"
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
