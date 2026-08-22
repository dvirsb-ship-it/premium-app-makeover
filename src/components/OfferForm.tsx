import { useEffect, useState } from "react";
import { Check, Scale, Sparkles } from "lucide-react";
import { useT } from "../lib/i18n";
import {
  PLTD_MAX_PERCENT,
  categoryHasStatutoryCap,
  categoryForbidsContingency,
  type ExpensesTerm,
  type FeeModel,
  type CaseOffer,
} from "../lib/db";

/**
 * טופס הצעת שכר טרחה מובנה — הוחזר למודל הבחירה (21/8/2026).
 *
 * בפיבוט נשאר כאן טופס של שלושה שדות חופשיים. בבדיקה המשותפת דביר
 * זיהה את הדילול: "מה שהיה מקודם היה מושקע בהרבה יותר". הטופס הזה הוא
 * הטופס מגרסת הפיד (תג v1-assessment-model), בלי הבעת העניין ובלי
 * תיבת ניגוד העניינים — הניגוד כבר נבדק בשלב השמות, לפני שהסיכום נחשף.
 *
 * הצעה מובנית היא גם עניין של אתיקה: הצעות ברות-השוואה, בשפה אחת,
 * בלי דירוג — הלקוח משווה בעצמו (נספח א·8).
 */
export type OfferInput = Omit<CaseOffer, "at" | "fee" | "noConflict">;

const inputCls =
  "block w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-gold/50";

export function OfferForm({
  category,
  busy,
  onSubmit,
}: {
  category: string;
  busy: boolean;
  onSubmit: (offer: OfferInput) => void;
}) {
  const t = useT();
  const [model, setModel] = useState<FeeModel>("contingency");
  const [amount, setAmount] = useState("");
  /* אחוז מדורג — פשרה מוקדמת / משהוגשה תביעה / פסק דין */
  const [staged, setStaged] = useState(false);
  const [postSuit, setPostSuit] = useState("");
  const [judgment, setJudgment] = useState("");
  /* מקדמה שמתקזזת — מקובלת בשעתי ובגלובלי */
  const [retainer, setRetainer] = useState("");
  /* "+ מע"מ" היא ברירת המחדל כי כך השוק מדבר */
  const [vat, setVat] = useState<"plus" | "included">("plus");
  const [noWin, setNoWin] = useState(true);
  const [expenses, setExpenses] = useState<ExpensesTerm>("advanced");
  const [expensesEstimate, setExpensesEstimate] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");

  const maxPercent = Math.max(
    Number(amount) || 0,
    staged ? Number(postSuit) || 0 : 0,
    staged ? Number(judgment) || 0 : 0,
  );
  /* תקרת הפלת"ד — אזהרה ולא חסימה: עורך הדין יודע אם התיק כפוף לה */
  const capWarning =
    model === "contingency" && maxPercent > PLTD_MAX_PERCENT && categoryHasStatutoryCap(category);
  /* מעל 100% אינו "יקר" — בלתי אפשרי, ולכן חוסם */
  const impossiblePercent = model === "contingency" && maxPercent > 100;
  /* מדורג חצי-מלא = הצעה זולה יותר ממה שהתכוונו */
  const stagedIncomplete =
    model === "contingency" && staged && !(Number(postSuit) > 0 && Number(judgment) > 0);
  /* בפלילי שכר מותנה בתוצאות אסור בדין */
  const noContingency = categoryForbidsContingency(category);
  useEffect(() => {
    if (noContingency && model === "contingency") setModel("fixed");
  }, [noContingency, model]);

  /* החלפת מודל מאפסת מספרים — 15% ו-₪15 אינם אותו דבר */
  function switchModel(next: FeeModel) {
    if (next === model) return;
    setModel(next);
    setAmount("");
    setStaged(false);
    setPostSuit("");
    setJudgment("");
    setRetainer("");
  }

  const pill = (on: boolean) =>
    `rounded-2xl border px-2 py-2.5 text-[11.5px] font-bold leading-tight transition ${
      on ? "border-gold/60 bg-gold/15 text-gold-ink dark:text-gold" : "border-border bg-background/40 text-muted-foreground"
    }`;
  const checkRow = "flex w-full items-center gap-3 rounded-2xl border border-border bg-background/40 p-3 text-start";
  const checkBox = (on: boolean) =>
    `grid size-5 shrink-0 place-items-center rounded-md border transition ${
      on ? "border-gold bg-gold text-background" : "border-border"
    }`;

  const canSend =
    Number(amount) > 0 && !impossiblePercent && !stagedIncomplete && !busy;

  return (
    <div className="recessed mt-3 space-y-2.5 rounded-2xl bg-[var(--recess-fill)] p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-gold-ink dark:text-gold" strokeWidth={2.2} aria-hidden />
        <p className="text-[13px] font-bold text-foreground">{t("offerTitle")}</p>
      </div>

      <div>
        <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">{t("offerModelLabel")}</span>
        <div className={`grid gap-1.5 ${noContingency ? "grid-cols-2" : "grid-cols-3"}`}>
          {((noContingency ? ["hourly", "fixed"] : ["contingency", "hourly", "fixed"]) as FeeModel[]).map((m) => (
            <button key={m} type="button" onClick={() => switchModel(m)} className={pill(model === m)}>
              {t(m === "contingency" ? "feeContingency" : m === "hourly" ? "feeHourly" : "feeFixed")}
            </button>
          ))}
        </div>
        {noContingency && (
          <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-muted-foreground">{t("offerNoContingencyCriminal")}</p>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-foreground/80">
          {t(model === "contingency" ? (staged ? "offerStagePreSuit" : "offerPercentLabel") : model === "hourly" ? "offerHourlyLabel" : "offerFixedLabel")}
        </span>
        <div className="relative">
          <input className={inputCls} type="number" inputMode="decimal" min={0} value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={model === "contingency" ? "12" : model === "hourly" ? "600" : "8000"} />
          <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">
            {model === "contingency" ? "%" : "₪"}
          </span>
        </div>
      </label>

      {model === "contingency" && (
        <div>
          <button type="button" onClick={() => setStaged((v) => !v)} className={checkRow}>
            <span className={checkBox(staged)}>{staged && <Check className="size-3.5" strokeWidth={3} />}</span>
            <span className="text-[12px] font-semibold text-foreground">{t("offerStagedToggle")}</span>
          </button>
          {staged && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-semibold text-foreground/70">{t("offerStagePostSuit")}</span>
                <div className="relative">
                  <input className={inputCls} type="number" inputMode="decimal" min={0} value={postSuit} onChange={(e) => setPostSuit(e.target.value)} placeholder="15" />
                  <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">%</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-semibold text-foreground/70">{t("offerStageJudgment")}</span>
                <div className="relative">
                  <input className={inputCls} type="number" inputMode="decimal" min={0} value={judgment} onChange={(e) => setJudgment(e.target.value)} placeholder="18" />
                  <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">%</span>
                </div>
              </label>
            </div>
          )}
        </div>
      )}

      {model !== "contingency" && (
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerRetainerLabel")}</span>
          <div className="relative">
            <input className={inputCls} type="number" inputMode="decimal" min={0} value={retainer} onChange={(e) => setRetainer(e.target.value)} placeholder="2000" />
            <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">{"₪"}</span>
          </div>
          <p className="mt-1 px-1 text-[10.5px] text-muted-foreground">{t("offerRetainerHint")}</p>
        </label>
      )}

      <div>
        <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">{t("offerVatLabel")}</span>
        <div className="grid grid-cols-2 gap-1.5">
          {(["plus", "included"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setVat(v)} className={pill(vat === v)}>
              {t(v === "plus" ? "offerVatPlus" : "offerVatIncluded")}
            </button>
          ))}
        </div>
      </div>

      {stagedIncomplete && (
        <p className="px-1 text-[11px] leading-relaxed text-warning-ink">{t("offerStagedIncomplete")}</p>
      )}
      {impossiblePercent && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
          <Scale className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-[11px] leading-relaxed text-foreground">{t("offerImpossiblePercent")}</p>
        </div>
      )}
      {capWarning && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
          <Scale className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-[11px] leading-relaxed text-foreground">{t("offerCapWarning")}</p>
        </div>
      )}

      {model === "contingency" && (
        <button type="button" onClick={() => setNoWin((v) => !v)} className={checkRow}>
          <span className={checkBox(noWin)}>{noWin && <Check className="size-3.5" strokeWidth={3} />}</span>
          <span className="text-[12px] font-semibold text-foreground">{t("offerNoWinLabel")}</span>
        </button>
      )}

      <div>
        <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">{t("offerExpensesLabel")}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {(["included", "advanced", "client"] as ExpensesTerm[]).map((x) => (
            <button key={x} type="button" onClick={() => setExpenses(x)} className={pill(expenses === x)}>
              {t(x === "included" ? "expensesIncluded" : x === "advanced" ? "expensesAdvanced" : "expensesClient")}
            </button>
          ))}
        </div>
        {expenses !== "included" && (
          <input className={`${inputCls} mt-2`} value={expensesEstimate} onChange={(e) => setExpensesEstimate(e.target.value)}
            placeholder={t("offerExpensesPh")} aria-label={t("expensesEstimateAria")} />
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerDurationLabel")}</span>
        <input className={inputCls} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t("offerDurationPh")} />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerNoteLabel")}</span>
        <textarea className={`${inputCls} resize-none`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("offerNotePh")} />
      </label>

      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">{t("offerNonBinding")}</p>

      <button
        type="button"
        disabled={!canSend}
        onClick={() =>
          onSubmit({
            model,
            amount: Number(amount),
            noWinNoFee: model === "contingency" ? noWin : false,
            expenses,
            expensesEstimate: expenses === "included" ? "" : expensesEstimate.trim(),
            duration: duration.trim(),
            note: note.trim(),
            vat,
            ...(model === "contingency" && staged && Number(postSuit) > 0 ? { postSuitPercent: Number(postSuit) } : {}),
            ...(model === "contingency" && staged && Number(judgment) > 0 ? { judgmentPercent: Number(judgment) } : {}),
            ...(model !== "contingency" && Number(retainer) > 0 ? { retainer: Number(retainer) } : {}),
          })
        }
        className="btn-gold min-h-12 w-full rounded-2xl text-[15px] font-bold disabled:opacity-40"
      >
        {busy ? "…" : t("offerSend")}
      </button>
    </div>
  );
}
