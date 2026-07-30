import { motion } from "motion/react";
import { useT } from "../lib/i18n";
import type { CaseOffer, FeeModel, Lawyer } from "../lib/types";

/**
 * השוואת ההצעות — הדבר שהופך את מד שכר הטרחה ממידע לכוח מיקוח.
 *
 * ללקוח אין דרך לדעת אם 20% זה סביר, כי אין לו על מה להשוות; זו בדיוק
 * האסימטריה שהפלטפורמה נועדה לסגור. כאן הוא רואה את כל ההצעות על אותו
 * ציר, כל אחת עם ראשי התיבות של בעליה.
 *
 * במפורש *לא* ממיין לפי מחיר ולא מכתיר "הכי זול". הזול ביותר אינו הנכון
 * ביותר, והמלצה כזו הייתה הופכת את המדד לרשימת מחירים.
 */

const MODEL_LABEL: Record<FeeModel, "feeContingency" | "feeHourly" | "feeFixed"> = {
  contingency: "feeContingency",
  hourly: "feeHourly",
  fixed: "feeFixed",
};

function format(model: FeeModel, amount: number) {
  return model === "contingency"
    ? `${amount}%`
    : `₪${amount.toLocaleString("he-IL")}`;
}

export function OfferComparison({
  interested,
  offers,
}: {
  interested: Lawyer[];
  offers?: Record<string, CaseOffer>;
}) {
  const t = useT();
  if (!offers) return null;

  const withOffer = interested
    .map((l) => ({ lawyer: l, offer: offers[l.id] }))
    .filter((x): x is { lawyer: Lawyer; offer: CaseOffer } => !!x.offer && x.offer.amount > 0);

  if (withOffer.length === 0) return null;

  const byModel = new Map<FeeModel, { lawyer: Lawyer; offer: CaseOffer }[]>();
  for (const x of withOffer) {
    const list = byModel.get(x.offer.model) ?? [];
    list.push(x);
    byModel.set(x.offer.model, list);
  }

  const noOffer = interested.length - withOffer.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-5 rounded-3xl border border-border bg-card p-5"
    >
      <h3 className="text-[15px] font-bold text-foreground">{t("compareHeader")}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        {withOffer.length === 1 ? t("compareOnlyOne") : t("compareSub")}
      </p>

      <div className="mt-4 space-y-5">
        {[...byModel.entries()].map(([model, rows]) => {
          const amounts = rows.map((r) => r.offer.amount);
          const min = Math.min(...amounts);
          const max = Math.max(...amounts);
          const span = max - min;
          return (
            <div key={model}>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold">
                  {t(MODEL_LABEL[model])}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground" dir="ltr">
                  {span > 0 ? `${format(model, min)} – ${format(model, max)}` : format(model, min)}
                </span>
              </div>

              {/* הציר — כל נקודה היא הצעה אחת, לפי מיקומה בטווח */}
              <div className="relative mt-6 h-1.5 rounded-full bg-muted" dir="ltr">
                {rows.map(({ lawyer, offer }) => {
                  const pct = span > 0 ? ((offer.amount - min) / span) * 100 : 50;
                  return (
                    <div
                      key={lawyer.id}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pct}%` }}
                    >
                      <span
                        className="chip-gold grid size-6 place-items-center rounded-full text-[9px] font-black"
                        title={`${lawyer.name} · ${format(model, offer.amount)}`}
                      >
                        {lawyer.initials}
                      </span>
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-foreground">
                        {format(model, offer.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {noOffer > 0 && (
        <p className="mt-5 border-t border-border pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
          {noOffer} · {t("compareNoOffers")}
        </p>
      )}
    </motion.section>
  );
}
