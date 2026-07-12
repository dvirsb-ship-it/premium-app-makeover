import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface GlassLogoProps {
  size?: number;
  className?: string;
  pulse?: boolean;
}

export function GlassLogo({ size = 112, className, pulse = true }: GlassLogoProps) {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* ambient gold glow */}
      {pulse && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-gold/20 blur-2xl animate-pulse"
        />
      )}

      {/* outer glass disc */}
      <div
        className="relative z-10 grid place-items-center overflow-hidden rounded-full border border-gold/30 bg-gradient-to-br from-gold/30 via-gold/10 to-transparent shadow-2xl backdrop-blur-md"
        style={{ width: size * 0.85, height: size * 0.85 }}
      >
        {/* subtle texture / sheen */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)]"
        />

        {/* inner gold ring */}
        <div
          className="grid place-items-center rounded-full border-2 border-gold/70 shadow-[inset_0_0_20px_rgba(212,175,55,0.35)]"
          style={{ width: size * 0.52, height: size * 0.52 }}
        >
          <span
            className="font-black tracking-tighter text-gold"
            style={{ fontSize: size * 0.22, lineHeight: 1 }}
          >
            JA
          </span>
        </div>
      </div>
    </motion.div>
  );
}
