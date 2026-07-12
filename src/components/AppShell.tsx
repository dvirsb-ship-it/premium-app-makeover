import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Mobile-first app canvas. Centers content in a phone-width column and
 * reserves space for the bottom navigation when present.
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
    <div className={cn("relative min-h-screen w-full bg-background", outerClassName)}>
      {/* soft ambient gold aura */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(120%_100%_at_50%_0%,color-mix(in_oklab,var(--gold)_16%,transparent),transparent_70%)]"
      />
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col",
          withNav && "pb-24",
          !bare && "px-5",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
