import { useState } from "react";
import { useEffect } from "react";
import { BadgeCheck, Clock, Scale } from "lucide-react";
import { useT } from "../lib/i18n";
import { watchCaseReferrals, chooseLawyerDb, type ReferralDoc } from "../lib/db";
import { fbAuth } from "../lib/firebase";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/utils";

/**
 * הפניות של התיק — מה שהפונה רואה אחרי שבחר עורכי דין.
 *
 * כל פנייה מציגה את מצבה בנוסח ניטרלי (ש·10: "אינו זמין", לעולם לא
 * "דחה"), ואת הפעולה היחידה הרלוונטית: אישור שיתוף בשלב cleared,
 * ובחירה כשיש הצעה. ההצעות מוצגות זו לצד זו **בסדר הגעה, בלי דירוג
 * ובלי סימון "מומלץ"** — ההשוואה וההכרעה כולן של הפונה (נספח א·8).
 */
export function CaseReferrals({ caseId, status }: { caseId: string; status: string }) {
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
    } finally {
      setBusy(null);
    }
  }

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
                      expired || r.status === "declined"
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
                            : hasOffer
                              ? `${t("caseRefOffer")}: ₪${r.offerAmount?.toLocaleString()} · ${r.offerModel ?? ""}`
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
              )}

              {hasOffer && status === "awaiting_selection" && (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
