import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck } from "lucide-react";
import { useT } from "../lib/i18n";

/**
 * רגע החיבור — האוברליי החגיגי (25/8/2026).
 *
 * נולד בבדיקה המשותפת: דביר בחר עורך דין, והמסך רק החליף שורת סטטוס
 * לירוק. הרגע הכי גדול של הפונה — הרגע שכל האפליקציה בנויה סביבו —
 * עבר בלי שום טקס, ופרטי הקשר חיכו בתחתית שצריך לנחש לגלול אליה.
 *
 * מופיע רק ברגע הבחירה עצמו (לא בכניסות הבאות לתיק), ולכן חי על
 * callback מהפעולה ולא על סטטוס התיק.
 */
export function ConnectionCelebration({
  name,
  onClose,
  onView,
}: {
  /** שם עורך הדין שנבחר; null = סגור */
  name: string | null;
  onClose: () => void;
  /** "לפרטי הקשר" — סוגר וגולל לפאנל החיבור */
  onView: () => void;
}) {
  const t = useT();

  useEffect(() => {
    if (name === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name, onClose]);

  return (
    <AnimatePresence>
      {name !== null && (
        <motion.div
          key="celebrate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t("celebrateTitle").replace("{name}", name)}
        >
          {/* המסך מתכהה — הרגע הזה לבדו על הבמה */}
          <button
            type="button"
            aria-label={t("celebrateLater")}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/55 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="good-halo relative w-full max-w-sm"
          >
          <div className="liquid-glass glass-raised glass-good rounded-[28px] p-6 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-success text-success-foreground shadow-lg shadow-success/35">
              <BadgeCheck className="size-8" strokeWidth={2.25} aria-hidden />
            </span>
            <h2 className="mt-4 text-[19px] font-black leading-snug text-foreground">
              {t("celebrateTitle").replace("{name}", name)}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {t("celebrateBody")}
            </p>
            {/* הכפתור זהב בכוונה: ירוק מבשר, זהב מפעיל — גם ברגע הזה */}
            <button
              type="button"
              onClick={onView}
              className="btn-gold mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl text-[14px] font-bold"
            >
              {t("celebrateCta")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-2xl py-2.5 text-[13px] font-semibold text-muted-foreground"
            >
              {t("celebrateLater")}
            </button>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
