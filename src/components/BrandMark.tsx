import { motion } from "motion/react";
import { Scale } from "lucide-react";
import { cn } from "../lib/utils";

interface BrandMarkProps {
  size?: number;
  className?: string;
  glow?: boolean;
  /**
   * `gold` — האמבלמה המלאה, ברירת המחדל בכל האפליקציה.
   * `glass` — זכוכית שקופה עם מאזניים לבנים, לרקעים צילומיים כהים.
   */
  variant?: "gold" | "glass";
}

/**
 * הסמל של JustAsk.
 *
 * שני וריאנטים, ולא בטעות: הזהב המלא עובד על משטחי האפליקציה, אבל על
 * צילום כהה ועשיר — כמו דלתות העץ במסך הפתיחה — הוא נקרא כמדבקה
 * שהודבקה מלמעלה. הזכוכית לוקחת את הצבע של מה שמאחוריה, ולכן יושבת
 * בתוך הסצנה במקום עליה.
 */
export function BrandMark({
  size = 92,
  className,
  glow = true,
  variant = "gold",
}: BrandMarkProps) {
  const iconSize = size * 0.46;
  const glass = variant === "glass";

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
          /* גם בזכוכית ההילה נשארת זהובה — היא מה שקושר את הסמל למותג */
          className={cn(
            "absolute inset-0 animate-pulse rounded-[28%] blur-2xl",
            glass ? "bg-gold/20" : "bg-gold/30",
          )}
        />
      )}

      <div
        className={cn(
          "relative z-10 grid place-items-center overflow-hidden rounded-[28%]",
          glass
            ? "border border-white/25 bg-white/10 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)] backdrop-blur-md"
            : "bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] shadow-[0_18px_40px_-12px_rgba(212,175,55,0.55)]",
        )}
        style={{ width: size, height: size }}
      >
        {/* ברק עליון — בזכוכית הוא מה שנותן את תחושת המשטח */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 h-1/2",
            glass
              ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent)]"
              : "bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]",
          )}
        />
        <Scale
          className={cn("relative z-10", glass ? "text-white" : "text-[#0F172A]")}
          style={{
            width: iconSize,
            height: iconSize,
            /* צל רך מפריד את הלבן מאזור בהיר שעלול לעבור מאחורי הזכוכית */
            filter: glass ? "drop-shadow(0 2px 6px rgba(0,0,0,0.45))" : undefined,
          }}
          strokeWidth={2}
        />
      </div>
    </motion.div>
  );
}
