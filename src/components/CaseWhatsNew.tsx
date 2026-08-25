import { useEffect, useState } from "react";
import { useT, type StringKey } from "../lib/i18n";
import { cn } from "../lib/utils";
import { watchCaseReferrals, type ReferralDoc } from "../lib/db";
import type { Case } from "../lib/types";

/*
 * שורת "מה חדש" — הדופק של התיק, על הכרטיס בדף הבית (21/8/2026).
 *
 * נולדה בבדיקה המשותפת: עורך הדין אישר זמינות, הגיש הצעה — והבית
 * המשיך להציג "מוכן — בחר עורך דין". התנועה חיה בפעמון ובמסך התיק,
 * כלומר מוחבאת. השורה גוזרת מהפניות את הדבר האחד הכי אקטואלי,
 * בסדר דחיפות: הצעה שהתקבלה > זמין וממתין לך > שותף וממתין להצעה >
 * נשלח ונבדק > כולן לא זמינות.
 */
export function whatsNewKey(refs: ReferralDoc[], status: Case["status"]): StringKey | null {
  if (status === "connected") return "homeNewConnected";
  if (refs.length === 0) return null;
  const live = (r: ReferralDoc) =>
    r.status === "names_check" && Date.now() <= r.expiresAt;
  if (refs.some((r) => r.status === "details_shared" && r.offerAmount)) return "homeNewOffer";
  if (refs.some((r) => r.status === "cleared")) return "homeNewCleared";
  if (refs.some((r) => r.status === "details_shared")) return "homeNewShared";
  if (refs.some(live)) return "homeNewSent";
  return "homeNewUnavailable";
}

/**
 * בשורה טובה = ירוק (25/8/2026). כלל הצבע של האפליקציה: זהב מבקש ממך
 * צעד, ירוק מבשר שקרה משהו טוב. ההצעה והחיבור הם הרגעים הירוקים.
 */
export function isGoodNews(key: StringKey | null): boolean {
  return key === "homeNewOffer" || key === "homeNewConnected";
}

/** המפתח האקטואלי של התיק — גם למי שצריך אותו ברמת הכרטיס (מסגרת ירוקה). */
export function useWhatsNewKey(caseId: string | null, status: Case["status"]): StringKey | null {
  const [refs, setRefs] = useState<ReferralDoc[]>([]);
  const relevant = Boolean(caseId) && (status === "awaiting_selection" || status === "connected");
  useEffect(() => {
    if (!relevant || !caseId) return;
    return watchCaseReferrals(caseId, setRefs, () => {});
  }, [caseId, relevant]);
  if (!relevant) return null;
  return whatsNewKey(refs, status);
}

/** הרצועה עצמה, בלי מנוי משלה — למי שכבר מחזיק את המפתח ביד. */
export function WhatsNewStrip({ k, compact = false }: { k: StringKey | null; compact?: boolean }) {
  const t = useT();
  if (!k) return null;
  const good = isGoodNews(k);
  if (compact) {
    return (
      <span className={cn("mt-1 flex items-center gap-1.5 text-[11px] font-bold", good ? "text-success-ink dark:text-success" : "text-foreground/70")}>
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", good ? "bg-success-ink dark:bg-success" : "bg-muted-foreground/50")} />
        <span className="min-w-0 truncate">{t(k)}</span>
      </span>
    );
  }
  return (
    <div
      className={cn(
        "mt-4 flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5",
        good ? "bg-success/[0.13]" : "bg-[var(--recess-fill)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          good ? "bg-success-ink dark:bg-success motion-safe:animate-pulse" : "bg-muted-foreground/50",
        )}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[12.5px] font-bold leading-snug",
            good ? "text-success-ink dark:text-success" : "text-foreground/80",
          )}
        >
          {t(k)}
        </span>
        {/* מה עושים בשלב הזה — ההסבר שביקש דביר ("עם הסבר של מה הוא עושה") */}
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
          {t(`${k}Sub` as StringKey)}
        </span>
      </span>
    </div>
  );
}

export function CaseWhatsNew({ caseId, status, compact = false }: { caseId: string; status: Case["status"]; compact?: boolean }) {
  const key = useWhatsNewKey(caseId, status);
  return <WhatsNewStrip k={key} compact={compact} />;
}


/*
 * דירוג לפי "מה דורש פעולה" — לבחירת הכרטיס הראשי בדף הבית.
 * summary_ready (אשר) > awaiting_selection (בחר/השווה) > legacy > connected.
 */
export function caseActionRank(status: Case["status"]): number {
  switch (status) {
    case "summary_ready": return 0;
    case "awaiting_selection": return 1;
    case "has_interest": return 2;
    case "matching": return 3;
    case "validating": return 4;
    case "connected": return 5;
    default: return 9;
  }
}
