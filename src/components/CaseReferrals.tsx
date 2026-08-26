import { useState } from "react";
import { useEffect } from "react";
import { BadgeCheck, Clock, Scale } from "lucide-react";
import { useT } from "../lib/i18n";
import { watchCaseReferrals, chooseLawyerDb, type ReferralDoc } from "../lib/db";
import { fbAuth } from "../lib/firebase";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/utils";
import { OfferComparison } from "./OfferComparison";
import type { CaseOffer, Lawyer } from "../lib/types";

/*
 * תצוגה מקוצרת של הצעה מובנית — באותה שפה שבה הוצעה.
 * "12%" / "₪600 לשעה" / "₪8,000", ואחריהן רק מה שמשנה ללקוח: מדרגות,
 * מע"מ, "אין פיצוי — אין שכר". ההשוואה המלאה ו"מה זה אומר בכסף" —
 * ב-OfferComparison למטה.
 */
function offerLine(o: CaseOffer, t: (k: never) => string): string {
  const amt =
    o.model === "contingency"
      ? `${o.amount}%` + (o.judgmentPercent && o.judgmentPercent > o.amount ? `–${o.judgmentPercent}%` : "")
      : `₪${o.amount.toLocaleString("he-IL")}`;
  const model = t((o.model === "contingency" ? "feeContingency" : o.model === "hourly" ? "feeHourly" : "feeFixed") as never);
  const bits = [`${amt} · ${model}`];
  if (o.vat) bits.push(t((o.vat === "plus" ? "offerVatPlus" : "offerVatIncluded") as never));
  if (o.model === "contingency" && o.noWinNoFee) bits.push(t("offerNoWinLabel" as never));
  return bits.join(" · ");
}

/**
 * הפניות של התיק — מה שהפונה רואה אחרי שבחר עורכי דין.
 *
 * כל פנייה מציגה את מצבה בנוסח ניטרלי (ש·10: "אינו זמין", לעולם לא
 * "דחה"), ואת הפעולה היחידה הרלוונטית: אישור שיתוף בשלב cleared,
 * ובחירה כשיש הצעה. ההצעות מוצגות זו לצד זו **בסדר הגעה, בלי דירוג
 * ובלי סימון "מומלץ"** — ההשוואה וההכרעה כולן של הפונה (נספח א·8).
 */
export function CaseReferrals({
  caseId,
  status,
  onConnected,
}: {
  caseId: string;
  status: string;
  /** נורה פעם אחת אחרי בחירה מוצלחת — מדליק את אוברליי החגיגה במסך התיק */
  onConnected?: (lawyerName: string) => void;
}) {
  const t = useT();
  const [rows, setRows] = useState<ReferralDoc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => watchCaseReferrals(caseId, setRows, () => {}), [caseId]);

  if (rows.length === 0) return null;

  async function share(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      const { shareSummaryFn } = await import("../lib/ai/intake.functions");
      const idToken = await fbAuth().currentUser?.getIdToken();
      const res = await shareSummaryFn({ data: { referralId: id, idToken } });
      if (res.ok) haptic("success");
    } finally {
      setBusy(null);
    }
  }

  async function choose(r: ReferralDoc) {
    if (busy) return;
    setBusy(r.id);
    try {
      const u = fbAuth().currentUser;
      await chooseLawyerDb(caseId, r.lawyerId, {
        name: u?.displayName ?? "",
        phone: u?.phoneNumber ?? "",
        email: u?.email ?? "",
      });
      haptic("success");
      onConnected?.(r.lawyerName || "");
    } finally {
      setBusy(null);
    }
  }

  /* ההשוואה: עורכי דין עם הצעה מובנית, בסדר הגעה, בלי דירוג */
  const withOffers = rows.filter((r) => r.offer && r.offer.amount > 0);
  const cmpLawyers: Lawyer[] = withOffers.map((r) => ({
    id: r.lawyerId,
    name: r.lawyerName || "—",
    firm: "",
    specialty: r.category,
    rating: 0,
    reviews: 0,
    years: 0,
    initials: (r.lawyerName || "?").split(" ").map((w) => w[0]).slice(0, 2).join(""),
    blurb: "",
  }));
  const cmpOffers: Record<string, CaseOffer> = Object.fromEntries(
    withOffers.map((r) => [r.lawyerId, r.offer as CaseOffer]),
  );

  return (
    <div className="mt-3">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {t("caseRefsTitle")}
      </p>
      <div className="mt-2 space-y-2.5">
        {rows.map((r) => {
          const expired =
            r.status === "expired" ||
            (r.status === "names_check" && Date.now() > r.expiresAt);
          const hasOffer = r.status === "details_shared" && !!r.offerAmount;
          return (
            <div key={r.id} className="liquid-glass rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <span className="chip-navy grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black">
                  {(r.lawyerName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-foreground">{r.lawyerName || "—"}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[11.5px] font-semibold",
                      r.status === "connected"
                        ? "text-success-ink"
                        : expired || r.status === "declined"
                        ? "text-muted-foreground"
                        : r.status === "cleared"
                          ? "text-gold-ink dark:text-gold"
                          : hasOffer
                            ? "text-success-ink"
                            : "text-muted-foreground",
                    )}
                  >
                    {expired
                      ? t("caseRefExpired")
                      : r.status === "names_check"
                        ? t("caseRefWaiting")
                        : r.status === "cleared"
                          ? t("caseRefCleared")
                          : r.status === "declined"
                            ? t("caseRefDeclined")
                            : r.status === "closed"
                              ? t("caseRefClosed")
                              : r.status === "connected"
                                ? t("caseRefChosen")
                              : hasOffer
                                ? `${t("caseRefOffer")}: ${
                                    r.offer
                                      ? offerLine(r.offer, t as never)
                                      : `₪${r.offerAmount?.toLocaleString()} · ${r.offerModel ?? ""}`
                                  }`
                                : t("caseRefShared")}
                  </p>
                  {hasOffer && r.offerNote && (
                    <p className="mt-1 text-[12px] leading-relaxed text-foreground/75">{r.offerNote}</p>
                  )}
                </div>
                {r.status === "names_check" && !expired && (
                  <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </div>

              {r.status === "cleared" && status === "awaiting_selection" && (
                <>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => void share(r.id)}
                    className="btn-gold mt-3 min-h-11 w-full rounded-2xl text-[13px] font-bold disabled:opacity-45"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <BadgeCheck className="size-4" aria-hidden />
                      {t("caseRefShare")}
                    </span>
                  </button>
                  <p className="mt-1.5 px-1 text-center text-[10.5px] leading-snug text-muted-foreground">
                    {t("caseRefShareHint")}
                  </p>
                </>
              )}

              {hasOffer && status === "awaiting_selection" && (
                <>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => void choose(r)}
                    className="btn-gold mt-3 min-h-11 w-full rounded-2xl text-[13px] font-bold disabled:opacity-45"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Scale className="size-4" aria-hidden />
                      {t("caseRefChoose")}
                    </span>
                  </button>
                  {/*
                    * ההשלכות של הבחירה — חשיפת קשר וסגירת שאר הפניות —
                    * חייבות להיאמר ליד הכפתור, לא רק ב"כך זה עובד".
                    */}
                  <p className="mt-1.5 px-1 text-center text-[10.5px] leading-snug text-muted-foreground">
                    {t("caseRefChooseHint")}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
      {withOffers.length > 0 && (
        <div className="mt-4">
          <OfferComparison interested={cmpLawyers} offers={cmpOffers} />
        </div>
      )}
    </div>
  );
}
