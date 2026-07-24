import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Cinematic empty state — glass icon halo, gold ring, staggered fade-in.
 * Use anywhere a list, feed, or panel might have zero content.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-auto flex max-w-xs flex-col items-center px-6 py-12 text-center ${className ?? ""}`}
    >
      <div className="relative mb-5">
        <div
          aria-hidden
          className="absolute inset-0 -m-6 rounded-full bg-gold/10 blur-2xl"
        />
        <div className="liquid-glass relative grid size-20 place-items-center rounded-3xl ring-1 ring-gold/25">
          <Icon className="size-9 text-gold" strokeWidth={1.6} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
