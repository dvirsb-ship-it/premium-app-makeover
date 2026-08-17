import { useState } from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { fbAuth } from "../lib/firebase";
import { rateLawyerFn } from "../lib/ai/intake.functions";
import { useT } from "../lib/i18n";

/**
 * הבקשה לדרג — מופיעה פעם אחת, אחרי שעורך הדין סימן שהתיק הסתיים.
 *
 * זו החוליה שהייתה חסרה: בלי דירוג, "לקוחות מרוצים" ו"דירוג ממוצע" היו
 * מספרים שאין להם מקור, ודירוג עורך דין נשאר 0 לתמיד. שאלה אחת, ללא
 * חובה, וניתן לדלג — לקוח שסיים תיק לא חייב לנו שום דבר.
 */
export function RateLawyerCard({
  caseId,
  onDone,
}: {
  caseId: string;
  onDone: () => void;
}) {
  const t = useT();
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (stars < 1 || busy) return;
    setBusy(true);
    try {
      const idToken = await fbAuth().currentUser?.getIdToken();
      if (!idToken) throw new Error("no token");
      await rateLawyerFn({ data: { caseId, stars, note: note.trim(), idToken } });
      toast.success(t("rateThanks"));
      onDone();
    } catch {
      toast.error(t("actionFailedRetry"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 rounded-3xl border border-gold/30 bg-gold/[0.06] p-5"
    >
      <h3 className="text-[15px] font-bold text-foreground">{t("rateTitle")}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        {t("rateSub")}
      </p>

      <div className="mt-4 flex justify-center gap-2" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            aria-label={`${n}`}
            aria-pressed={stars === n}
            className="p-1 transition active:scale-90"
          >
            <Star
              className={
                n <= stars
                  ? "size-8 fill-gold text-gold"
                  : "size-8 text-muted-foreground/40"
              }
              strokeWidth={1.6}
            />
          </button>
        ))}
      </div>

      {stars > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("ratePlaceholder")}
            aria-label={t("rateNoteAria")}
            maxLength={500}
            rows={3}
            className="mt-4 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-[13.5px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="btn-gold mt-3 w-full rounded-2xl py-3 text-[14px] font-bold disabled:opacity-60"
          >
            {t("rateSubmit")}
          </button>
        </motion.div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-2 w-full py-2 text-[12.5px] font-semibold text-muted-foreground"
      >
        {t("rateLater")}
      </button>
    </motion.section>
  );
}
