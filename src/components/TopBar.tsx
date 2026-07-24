import { useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

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
  const { dir } = useSettings();
  const t = useT();
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/70 px-5 py-3 backdrop-blur-xl",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.history.back())}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-foreground/5 text-foreground transition active:scale-95"
        aria-label={t("backAria")}
      >
        <BackIcon className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </motion.header>
  );
}
