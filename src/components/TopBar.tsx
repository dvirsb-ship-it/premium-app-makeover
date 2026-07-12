import { useRouter } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Sticky top bar for inner screens. Back chevron points right (RTL forward =
 * back is to the right).
 */
export function TopBar({
  title,
  subtitle,
  right,
  onBack,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  className?: string;
}) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/85 px-5 py-3 backdrop-blur-xl",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.history.back())}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition active:scale-95"
        aria-label="חזרה"
      >
        <ChevronRight className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
