import { motion } from "motion/react";
import { useState } from "react";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";
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

/**
 * הציר משווה את המדרגה הראשונה (עד פשרה) — היא המשותפת לכל ההצעות.
 * הצעה מדורגת מסומנת בטווח כדי שהלקוח יידע שהמספר אינו כל הסיפור.
 */
function rangeSuffix(offer: CaseOffer): string {
  if (offer.model !== "contingency") return "";
  const top = Math.max(offer.postSuitPercent ?? 0, offer.judgmentPercent ?? 0);
  return top > offer.amount ? `–${top}%` : "";
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
                        {rangeSuffix(offer)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <WhatItMeans rows={withOffer} />

      {noOffer > 0 && (
        <p className="mt-5 border-t border-border pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
          {noOffer} · {t("compareNoOffers")}
        </p>
      )}
    </motion.section>
  );
}

/** סכומי דוגמה — עגולים בכוונה, כדי שייקראו כהמחשה ולא כתחזית. */
const EXAMPLES = [50000, 100000, 250000] as const;

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

/**
 * "מה זה אומר בכסף".
 *
 * אחוז מפיצוי הוא מספר שאין ללקוח דרך להעריך: הוא אינו יודע מה הפיצוי,
 * ובוודאי אינו יכול להשוות 13% מול ₪500 לשעה מול סכום קבוע. שלוש
 * ההצעות נמדדות ביחידות שונות, וכך הבחירה נעשית לפי מי שנשמע נחמד יותר.
 *
 * כאן הלקוח בוחר סכום דוגמה, וכל הצעה מתורגמת לאותה יחידה: כמה שכר
 * הטרחה, וכמה נשאר אצלו. זו אריתמטיקה על מספר שהוא בחר — לא הערכה של
 * שווי התיק, ואנחנו אומרים את זה במפורש. תיק שווה אנחנו לא יודעים
 * להעריך, ולא נעמיד פנים שכן.
 */
function WhatItMeans({
  rows,
}: {
  rows: { lawyer: Lawyer; offer: CaseOffer }[];
}) {
  const t = useT();
  const [example, setExample] = useState<number>(EXAMPLES[1]);

  // שכר שעתי אינו ניתן לתרגום בלי היקף שעות — לא נמציא אחד
  const priceable = rows.filter((r) => r.offer.model !== "hourly");
  const hourly = rows.filter((r) => r.offer.model === "hourly");
  if (priceable.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="text-[13px] font-bold text-foreground">{t("meansTitle")}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
        {t("meansSub")}
      </p>

      <div className="mt-3 flex gap-1.5" role="group" aria-label={t("meansTitle")}>
        {EXAMPLES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setExample(v)}
            aria-pressed={example === v}
            className={cn(
              "min-h-11 flex-1 rounded-2xl px-2 py-2 text-[12.5px] font-bold transition",
              example === v
                ? "chip-gold"
                : "border border-border text-muted-foreground",
            )}
          >
            {shekel(v)}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {priceable.map(({ lawyer, offer }) => {
          const fee =
            offer.model === "contingency" ? (example * offer.amount) / 100 : offer.amount;
          const left = example - fee;
          const stagedNote =
            offer.model === "contingency" && rangeSuffix(offer) !== "";
          return (
            <div
              key={lawyer.id}
              className="flex items-center gap-2.5 rounded-2xl bg-foreground/[0.04] px-3 py-2.5"
            >
              {/* פנים ולא ראשי תיבות — זה הרגע שבו הלקוח משווה ובוחר */}
              {lawyer.photoUrl ? (
                <img
                  src={lawyer.photoUrl}
                  alt=""
                  className="size-7 shrink-0 rounded-full object-cover ring-1 ring-gold/40"
                />
              ) : (
                <span className="chip-navy grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-black">
                  {lawyer.initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] text-foreground">
                  <span className="text-muted-foreground">{t("meansFee")} </span>
                  <span className="font-bold" dir="ltr">{shekel(fee)}</span>
                </p>
                <p className="text-[12.5px] text-foreground">
                  <span className="text-muted-foreground">{t("meansLeft")} </span>
                  <span className="font-black text-success" dir="ltr">
                    {shekel(Math.max(0, left))}
                  </span>
                </p>
                {stagedNote && (
                  <p className="text-[10.5px] text-muted-foreground">{t("meansStagedNote")}</p>
                )}
              </div>
              {/*
                * ההוצאות אינן חלק מהחשבון — הן משתנה שאיננו יודעים. מציינים
                * את קיומן במפורש, כי זה בדיוק המקום שבו לקוחות מופתעים.
                */}
              {offer.expenses !== "included" && (
                <span className="shrink-0 text-[10.5px] font-semibold leading-tight text-warning-ink">
                  {t(offer.expenses === "advanced" ? "meansExpAdv" : "meansExpClient")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {hourly.length > 0 && (
        <p className="mt-2.5 rounded-2xl bg-foreground/[0.04] px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {t("meansHourly")}
        </p>
      )}

      <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground/80">
        {t("meansDisclaimer")}
      </p>
    </div>
  );
}
