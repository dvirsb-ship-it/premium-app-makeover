import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { StringKey } from "../lib/i18n";
import { useT } from "../lib/i18n";

/**
 * אישור הקליטה — מוצג *מעל* האפליקציה ולא כמסך נפרד.
 * הלקוח רואה את הבית שלו מבעד לשכבה, כך שברור לו לאן הוא חוזר,
 * והסגירה היא פעולה שלו (X או הכפתור) ולא ניווט שנכפה עליו.
 */
export function SubmittedModal({
  onClose,
  onViewCase,
}: {
  onClose: () => void;
  onViewCase?: () => void;
}) {
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={t("submittedTitle")}
      className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/55 px-5 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        /* אטום בכוונה: זו הודעה, לא רקע. הזכוכית שייכת למשטח שמאחוריה. */
        className="relative w-full max-w-sm rounded-[32px] border border-border bg-card p-7 text-center shadow-[0_32px_80px_-20px_rgba(15,23,42,0.55)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeAria")}
          className="absolute end-4 top-4 grid size-8 place-items-center rounded-full text-muted-foreground transition active:scale-90"
        >
          <X className="size-4.5" />
        </button>

        <div className="relative mx-auto grid place-items-center">
          {/* ניצוצות זהב — רגע קטן של חגיגה, פעם אחת */}
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute size-1.5 rounded-full bg-gold"
              initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i / 8) * Math.PI * 2) * 62,
                y: Math.sin((i / 8) * Math.PI * 2) * 62,
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
            />
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="grid size-20 place-items-center rounded-full bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] shadow-[0_18px_44px_-14px_rgba(212,175,55,0.6)]"
          >
            <Check className="size-10 text-[#0F172A]" strokeWidth={2.6} />
          </motion.div>
        </div>

        <h2 className="mt-6 text-xl font-black leading-snug text-foreground">
          {t("submittedTitle")}
        </h2>
        {/* מה שכבר קרה — כמשימות שהושלמו, לא כפסקה */}
        <ul className="mt-5 space-y-3 text-start">
          {(["submittedStep1", "submittedStep2", "submittedStep3"] as StringKey[]).map((k) => (
            <li key={k} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold">
                <Check className="size-3 text-[#0F172A]" strokeWidth={3.5} />
              </span>
              <span className="text-[13.5px] leading-relaxed text-foreground/90">{t(k)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[13px] font-semibold text-gold">{t("submittedGoodLuck")}</p>

        <div className="mt-7 space-y-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-gold w-full rounded-2xl py-3.5 text-[15px] font-bold"
          >
            {t("submittedToHome")}
          </button>
          {onViewCase && (
            <button
              type="button"
              onClick={onViewCase}
              className="w-full py-2 text-[13px] font-semibold text-muted-foreground"
            >
              {t("viewStatus")}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
