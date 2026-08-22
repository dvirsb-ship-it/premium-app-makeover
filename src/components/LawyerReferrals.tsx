import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Clock, ShieldCheck, Users } from "lucide-react";
import { Rise } from "./motion";
import { useT } from "../lib/i18n";
import { watchLawyerReferrals, readCaseRaw, type ReferralDoc } from "../lib/db";
import { fbAuth } from "../lib/firebase";
import { useTimeAgo } from "../lib/status";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/utils";
import { OfferForm, type OfferInput } from "./OfferForm";

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

  useEffect(() => watchLawyerReferrals(uid, setRows, () => setRows([])), [uid]);

  /*
   * גיבוי להפניות מלפני 21/8: הצעה שהוגשה והלקוח כבר בחר — אבל הסטטוס
   * נשאר details_shared. חוקי המסד מתירים לעורך הדין לקרוא תיק רק אם
   * נבחר בו, ולכן קריאה מוצלחת היא עצמה ההוכחה. הפניות חדשות מסומנות
   * connected בשרת ואינן צריכות את זה.
   */
  const [legacyConnected, setLegacyConnected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!rows) return;
    const probe = rows.filter((r) => r.status === "details_shared" && r.offerAmount);
    if (probe.length === 0) return;
    let cancelled = false;
    void Promise.all(
      probe.map(async (r) => {
        try {
          const c = await readCaseRaw(r.caseId);
          return c && c.chosenLawyerId === uid ? r.id : null;
        } catch {
          return null;
        }
      }),
    ).then((ids) => {
      if (cancelled) return;
      setLegacyConnected(new Set(ids.filter((x): x is string => !!x)));
    });
    return () => {
      cancelled = true;
    };
  }, [rows, uid]);

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

  async function submitOffer(id: string, offer: OfferInput) {
    if (busy) return;
    setBusy(id);
    try {
      const { submitReferralOfferFn } = await import("../lib/ai/intake.functions");
      const idToken = await fbAuth().currentUser?.getIdToken();
      const res = await submitReferralOfferFn({ data: { referralId: id, offer, idToken } });
      if (res.ok) {
        haptic("success");
        setOfferFor(null);
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
        const status = legacyConnected.has(r.id) ? "connected" : r.status;
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
              ) : status === "names_check" ? (
                <>
                  <div className="recessed mt-3 rounded-2xl bg-[var(--recess-fill)] px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {t("refStageA")}
                    </p>
                    <p className="mt-1.5 text-[13.5px] font-semibold text-foreground">
                      {t("refParties")}: {r.parties || "—"}
                    </p>
                    {(r.damageType || (r.documents && r.documents.length > 0)) && (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/80">
                        {r.damageType && (
                          <span>
                            {t(r.damageType === "financial" ? "damageFinancial" : r.damageType === "both" ? "damageBoth" : "damageBody")}
                          </span>
                        )}
                        {r.damageType && r.documents && r.documents.length > 0 && " · "}
                        {r.documents && r.documents.length > 0 && (
                          <span>
                            {t("docsHeader")}: {r.documents.map((k) => t(`doc${k.charAt(0).toUpperCase()}${k.slice(1)}` as never)).join(", ")}
                          </span>
                        )}
                      </p>
                    )}
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
              ) : status === "cleared" ? (
                <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-foreground/75">
                  <Clock className="size-4 shrink-0 text-gold-ink dark:text-gold" aria-hidden />
                  {t("refWaitClient")}
                </p>
              ) : status === "details_shared" ? (
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
                    <OfferForm
                      category={r.category}
                      busy={busy === r.id}
                      onSubmit={(offer) => void submitOffer(r.id, offer)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOfferFor(r.id)}
                      className="btn-gold mt-3 min-h-11 w-full rounded-2xl text-[13px] font-bold"
                    >
                      {t("refOfferCta")}
                    </button>
                  )}
                  {/*
                    * יציאה מפורשת אחרי קריאה (21/8/2026): עורך דין שקרא
                    * והבין שזה לא בשבילו — אחרת הפונה מחכה להצעה שלא תגיע.
                    * אותו נוסח ניטרלי כמו בשלב השמות (ש·10).
                    */}
                  {!r.offerAmount && (
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void respond(r.id, "declined")}
                      className="mt-2 min-h-10 w-full rounded-2xl border border-border text-[12.5px] font-semibold text-foreground/70 disabled:opacity-45"
                    >
                      {t("refDecline")}
                    </button>
                  )}
                </>
              ) : status === "connected" ? (
                <Link
                  to="/lawyer-case/$caseId"
                  params={{ caseId: r.caseId }}
                  className="mt-3 flex items-center gap-3 rounded-2xl bg-gold/15 px-4 py-3 text-[13px] font-bold text-gold-ink transition active:scale-[0.99] dark:text-gold"
                >
                  <BadgeCheck className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">{t("refChosenLawyer")}</span>
                  <ArrowLeft className="size-4 shrink-0 rtl:rotate-0 ltr:rotate-180" aria-hidden />
                </Link>
              ) : status === "closed" ? (
                <p className="mt-3 text-[13px] font-semibold text-muted-foreground">
                  {t("refClosedLawyer")}
                </p>
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
