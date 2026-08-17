import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useDialog } from "../lib/use-dialog";

/**
 * מסך ההסבר שלפני בקשת ההרשאה של המערכת.
 *
 * הסיבה היא לא נימוס — היא מכניקה: iOS ואנדרואיד נותנים **בקשה אחת**.
 * מי שלחץ "לא" על החלון של המערכת אינו יכול להישאל שוב לעולם; אפשר רק
 * לשלוח אותו להגדרות הטלפון, וזה כמעט אף אחד לא עושה.
 *
 * לכן ההסבר בא **לפני**. מי שאומר כאן "לא עכשיו" נשאר בר-שאילה — הבקשה
 * האמיתית מעולם לא נשרפה — ואפשר לחזור אליו בהזדמנות טובה יותר.
 *
 * הנוסח מדבר בהפסד קונקרטי ולא בתועלת מופשטת, כי זה מה שבאמת עומד על
 * הפרק: תיק שיושב שעתיים בלי מענה הולך למישהו אחר.
 */
export function PushPrimer({
  open,
  role,
  onAllow,
  onDismiss,
}: {
  open: boolean;
  role: "lawyer" | "client";
  /** ממשיך לבקשת ההרשאה האמיתית של המערכת. */
  onAllow: () => void;
  /** "לא עכשיו" — ההרשאה לא נשרפה, ואפשר לשאול שוב. */
  onDismiss: () => void;
}) {
  const t = useT();
  const dialogRef = useDialog<HTMLDivElement>(onDismiss, open);
  const titleKey: StringKey = role === "lawyer" ? "primerLawyerTitle" : "primerClientTitle";
  const bodyKey: StringKey = role === "lawyer" ? "primerLawyerBody" : "primerClientBody";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="primer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={onDismiss}
        >
          {/* role="dialog" על הלוח ולא על שכבת ההחשכה — ראה SubmittedModal */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="primer-title"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="liquid-glass w-full max-w-sm rounded-[28px] p-6 text-center"
          >
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t("primerLater")}
              className="ms-auto flex size-8 items-center justify-center rounded-full text-muted-foreground"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>

            <motion.span
              initial={{ scale: 0.7, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
              className="mx-auto grid size-16 place-items-center rounded-full bg-gold/15 ring-1 ring-gold/30"
            >
              <Bell className="size-7 text-gold" strokeWidth={2} aria-hidden />
            </motion.span>

            <h2 id="primer-title" className="mt-5 text-[19px] font-black text-foreground">
              {t(titleKey)}
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
              {t(bodyKey)}
            </p>

            <button
              type="button"
              onClick={onAllow}
              className="btn-gold mt-6 min-h-12 w-full rounded-2xl py-3.5 text-[15px] font-bold"
            >
              {t("primerAllow")}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-2 min-h-11 w-full py-2 text-[13px] font-semibold text-muted-foreground"
            >
              {t("primerLater")}
            </button>

            {/* אומרים מראש שהמערכת תשאל — כדי שהחלון הבא לא יפתיע */}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
              {t("primerNote")}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
