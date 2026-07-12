import { motion } from "motion/react";
import sealUrl from "../assets/justask-seal.png";
import { cn } from "../lib/utils";

interface SealProps {
  size?: number;
  className?: string;
  float?: boolean;
  glow?: boolean;
}

export function Seal({ size = 96, className, float = true, glow = true }: SealProps) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.05 }}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-gold/25 blur-2xl"
          aria-hidden
        />
      )}
      <img
        src={sealUrl}
        alt="JustAsk"
        width={size}
        height={size}
        className={cn(
          "relative z-10 drop-shadow-[0_12px_24px_rgba(15,23,42,0.28)]",
          float && "animate-float",
        )}
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
}
