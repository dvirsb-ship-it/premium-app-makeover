import { motion } from "motion/react";
import { Scale } from "lucide-react";
import { cn } from "../lib/utils";

interface BrandMarkProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Primary JustAsk emblem — the gold scales badge used in the lawyer role card,
 * elevated into a glossy hero mark. Shared across brand moments so the logo
 * above "JustAsk" matches the in-app iconography.
 */
export function BrandMark({ size = 92, className, glow = true }: BrandMarkProps) {
  const iconSize = size * 0.46;
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 170, damping: 15, delay: 0.1 }}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-[28%] bg-gold/30 blur-2xl animate-pulse"
        />
      )}

      <div
        className="relative z-10 grid place-items-center overflow-hidden rounded-[28%] bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] shadow-[0_18px_40px_-12px_rgba(212,175,55,0.55)]"
        style={{ width: size, height: size }}
      >
        {/* top sheen */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]"
        />
        <Scale
          className="relative z-10 text-[#0F172A]"
          style={{ width: iconSize, height: iconSize }}
          strokeWidth={2}
        />
      </div>
    </motion.div>
  );
}
