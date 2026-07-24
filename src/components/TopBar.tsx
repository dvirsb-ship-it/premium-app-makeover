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
  inverse = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  className?: string;
  inverse?: boolean;
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
        "sticky top-0 z-30 flex items-center gap-3 border-b px-5 py-3 backdrop-blur-xl",
        inverse
          ? "border-white/10 bg-black/20 text-white"
          : "border-border bg-background/70 text-foreground",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.history.back())}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full border transition active:scale-95",
          inverse
            ? "border-white/15 bg-white/10 text-white"
            : "border-border bg-foreground/5 text-foreground",
        )}
        aria-label={t("backAria")}
      >
        <BackIcon className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className={cn("truncate text-base font-bold", inverse ? "text-white" : "text-foreground")}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn("truncate text-xs", inverse ? "text-white/70" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </motion.header>
  );
}
