import { useEffect, useState } from "react";
import { Clock, ShieldCheck, Users } from "lucide-react";
import { Rise } from "./motion";
import { useT } from "../lib/i18n";
import { watchLawyerReferrals, type ReferralDoc } from "../lib/db";
import { fbAuth } from "../lib/firebase";
import { useTimeAgo } from "../lib/status";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/utils";

/**
 * הפניות של עורך הדין — מה שהחליף את הפיד הפתוח (20/8/2026).
 *
 * ההבדל המבני: הפיד הציג את כל התיקים בתחום לכל עורך דין מאושר;
 * כאן מגיעות רק פניות ממי שבחר בעורך הדין הזה מהאינדקס. שלושה
 * מצבים, בסדר הזרימה:
 *
 * 1. names_check — רק צדדים/תחום/עיר/חודש. שתי פעולות: זמין / לא.
 * 2. cleared — ממתין לפונה. אין מה לעשות, וזה מוצג כך.
 * 3. details_shared — הסיכום נגלה, וטופס הצעה פרטני.
 *
 * מה שאין, בכוונה: צבירת נתונים על פניות אחרות, ציוני התאמה, או
 * כל דבר שממיין פניות לפי "שווי". כל פנייה עומדת לבדה.
 */
export function LawyerReferrals({ uid }: { uid: string }) {
  const t = useT();
  const ago = useTimeAgo();
  const [rows, setRows] = useState<ReferralDoc[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [model, setModel] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => watchLawyerReferrals(uid, setRows, () => setRows([])), [uid]);

  async function respond(id: string, answer: "cleared" | "declined") {
    if (busy) return;
    setBusy(id);
    try {
      const { respondReferralFn } = await import("../lib/ai/intake.functions");
      const idToken = await fbAuth().currentUser?.getIdToken();
      const res = await respondReferralFn({ data: { referralId: id, answer, idToken } });
      if (res.ok) haptic(answer === "cleared" ? "success" : "light");
    } finally {
      setBusy(null);
    }
  }

  async function submitOffer(id: string) {
    if (busy) return;
    const n = Number(amount);
    if (!n || !model.trim()) return;
    setBusy(id);
    try {
      const { submitReferralOfferFn } = await import("../lib/ai/intake.functions");
      const idToken = await fbAuth().currentUser?.getIdToken();
      const res = await submitReferralOfferFn({
        data: { referralId: id, amount: n, model, note, idToken },
      });
      if (res.ok) {
        haptic("success");
        setOfferFor(null);
        setAmount(""); setModel(""); setNote("");
      }
    } finally {
      setBusy(null);
    }
  }

  if (rows === null)
    return <div className="liquid-glass h-28 animate-pulse rounded-3xl" />;

  if (rows.length === 0)
    return (
      <p className="liquid-glass rounded-3xl p-6 text-center text-[13px] leading-relaxed text-muted-foreground">
        {t("refEmpty")}
      </p>
    );

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const expired =
          r.status === "expired" ||
          (r.status === "names_check" && Date.now() > r.expiresAt);
        return (
          <Rise key={r.id}>
            <div className="liquid-glass rounded-3xl p-5">
              {/* השורה העובדתית — קיימת בכל מצב */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="chip-navy rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {r.category}
                </span>
                {r.city && (
                  <span className="text-[11.5px] text-muted-foreground">{r.city}</span>
                )}
                {r.incidentMonth && (
                  <span className="text-[11.5px] text-muted-foreground">{r.incidentMonth}</span>
                )}
                <span className="ms-auto text-[11px] text-muted-foreground">{ago(r.createdAt)}</span>
              </div>

              {expired ? (
                <p className="mt-3 text-[13px] font-semibold text-muted-foreground">
                  {t("refExpiredLawyer")}
                </p>
              ) : r.status === "names_check" ? (
                <>
                  <div className="recessed mt-3 rounded-2xl bg-[var(--recess-fill)] px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {t("refStageA")}
                    </p>
                    <p className="mt-1.5 text-[13.5px] font-semibold text-foreground">
                      {t("refParties")}: {r.parties || "—"}
                    </p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground/75">
                      {t("refStageANote")}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void respond(r.id, "cleared")}
                      className="btn-gold min-h-11 flex-1 rounded-2xl text-[13px] font-bold disabled:opacity-45"
                    >
                      {t("refClear")}
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void respond(r.id, "declined")}
                      className="min-h-11 flex-1 rounded-2xl border border-border text-[13px] font-semibold text-foreground/80 disabled:opacity-45"
                    >
                      {t("refDecline")}
                    </button>
                  </div>
                </>
              ) : r.status === "cleared" ? (
                <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-foreground/75">
                  <Clock className="size-4 shrink-0 text-gold-ink dark:text-gold" aria-hidden />
                  {t("refWaitClient")}
                </p>
              ) : r.status === "details_shared" ? (
                <>
                  <h3 className="mt-3 text-[15px] font-bold text-foreground">{r.caseTitle}</h3>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-foreground/85">
                    {r.summary}
                  </p>
                  {r.offerAmount ? (
                    <p className="mt-3 flex items-center gap-2 rounded-2xl bg-success/12 px-4 py-3 text-[13px] font-bold text-success-ink">
                      <Users className="size-4" aria-hidden />
                      {t("refOfferSent")}
                    </p>
                  ) : offerFor === r.id ? (
                    <div className="recessed mt-3 space-y-2.5 rounded-2xl bg-[var(--recess-fill)] p-4">
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        inputMode="numeric"
                        placeholder={t("refOfferAmount")}
                        aria-label={t("refOfferAmount")}
                        className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-[13px] text-foreground"
                      />
                      <input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={t("refOfferModel")}
                        aria-label={t("refOfferModel")}
                        className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-[13px] text-foreground"
                      />
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder={t("refOfferNote")}
                        aria-label={t("refOfferNote")}
                        className="w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-[13px] text-foreground"
                      />
                      <button
                        type="button"
                        disabled={busy === r.id || !Number(amount) || !model.trim()}
                        onClick={() => void submitOffer(r.id)}
                        className="btn-gold min-h-11 w-full rounded-2xl text-[13px] font-bold disabled:opacity-45"
                      >
                        {t("refOfferCta")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOfferFor(r.id)}
                      className="btn-gold mt-3 min-h-11 w-full rounded-2xl text-[13px] font-bold"
                    >
                      {t("refOfferCta")}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-3 text-[13px] font-semibold text-muted-foreground">
                  {t("caseRefDeclined")}
                </p>
              )}
            </div>
          </Rise>
        );
      })}
    </div>
  );
}
