import { useEffect, useMemo, useState } from "react";
import { useT, type StringKey } from "../lib/i18n";
import { cn } from "../lib/utils";
import {
  watchCaseEvents,
  watchCaseReferrals,
  type CaseEventDoc,
  type ReferralDoc,
} from "../lib/db";
import type { Case } from "../lib/types";

/*
 * יומן התיק — "מנהל התיק האישי" (שלב 3, 25/9/2026; דביר בחר את כיוון C
 * מתוך שלושה רינדורים).
 *
 * שני חלקים: אי "מה עכשיו" — תמיד רואים אצל מי הכדור, בלי אף טיימר
 * (הכרעת דביר: ציפייה רכה במקום שעון); ופיד מתוארך שמדבר בגוף ראשון.
 *
 * הרשומות מגיעות מהשרת (cases/{id}/events), אבל תיקים שנולדו לפני
 * היומן לא יראו דף ריק: אנחנו מסנתזים רשומות מחותמות הזמן שכבר
 * קיימות על התיק וההפניות, ומדלגים על כל רגע שכבר יש לו רשומת אמת.
 */

type Ball = "you" | "lawyers" | "system" | "done" | null;

export function journalBall(c: Case, refs: ReferralDoc[]): Ball {
  if (c.status === "connected") return "done";
  if (c.status === "validating") return "system";
  if (c.status === "summary_ready") return "you";
  if (c.status !== "awaiting_selection") return null;
  const live = (r: ReferralDoc) => r.status === "names_check" && Date.now() <= r.expiresAt;
  if (refs.some((r) => r.status === "details_shared" && r.offerAmount)) return "you";
  if (refs.some((r) => r.status === "cleared")) return "you";
  if (refs.some((r) => r.status === "details_shared")) return "lawyers";
  if (refs.some(live)) return "lawyers";
  return "you";
}

const BALL_KEY: Record<Exclude<Ball, null>, StringKey> = {
  you: "jrBallYou",
  lawyers: "jrBallLawyers",
  system: "jrBallSystem",
  done: "jrBallDone",
};

/* סינתזה לתיקים ותיקים — רק רגעים שאין להם רשומת אמת מהשרת */
function synthesize(c: Case, refs: ReferralDoc[], real: CaseEventDoc[]): CaseEventDoc[] {
  const has = (kind: string, refId?: string) =>
    real.some((e) => e.kind === kind && (refId === undefined || e.refId === refId));
  const out: CaseEventDoc[] = [];
  const mk = (
    kind: string,
    ts: number,
    titleKey: string,
    bodyKey: string,
    actor: CaseEventDoc["actor"],
    r?: ReferralDoc,
  ) => {
    if (!ts) return;
    out.push({
      id: `syn_${kind}_${r?.id ?? "case"}`,
      ts, kind, actor, titleKey, heTitle: "", bodyKey,
      refId: r?.id, refName: r?.lawyerName ?? "", synthetic: true,
    });
  };

  if (c.createdAt && !has("case_created")) {
    mk("case_created", c.createdAt, "evCaseCreated", "evCaseCreatedBody", "client");
  }
  if (c.summaryApprovedAt && !has("summary_approved")) {
    mk("summary_approved", c.summaryApprovedAt, "evSummaryApproved", "evSummaryApprovedBody", "client");
  }
  for (const r of refs) {
    if (!has("referral_sent", r.id)) {
      mk("referral_sent", r.createdAt, "evReferralSent", "evReferralSentBody", "client", r);
    }
    if (r.sharedAt) {
      if (!has("summary_shared", r.id)) {
        mk("summary_shared", r.sharedAt, "evSummaryShared", "evSummarySharedBody", "client", r);
      }
    } else if (r.status === "cleared" && r.respondedAt && !has("referral_cleared", r.id)) {
      mk("referral_cleared", r.respondedAt, "evReferralCleared", "evReferralClearedBody", "lawyer", r);
    }
    if (r.status === "declined" && r.respondedAt && !has("referral_declined", r.id)) {
      mk("referral_declined", r.respondedAt, "evReferralDeclined", "evReferralDeclinedBody", "lawyer", r);
    }
    if (r.status === "expired" && !has("referral_expired", r.id) && !has("offer_window_expired", r.id)) {
      mk("referral_expired", r.expiredAt ?? r.expiresAt, "evReferralExpired", "evReferralExpiredBody", "system", r);
    }
    if (r.offeredAt && !has("offer_received", r.id)) {
      mk("offer_received", r.offeredAt, "evOfferReceived", "evOfferReceivedBody", "lawyer", r);
    }
    if (r.status === "connected" && r.connectedAt && !has("connected")) {
      mk("connected", r.connectedAt, "evConnected", "evConnectedBody", "system", r);
    }
  }
  return out;
}

function dayLabel(ts: number, t: (k: StringKey) => string): string {
  const d = new Date(ts);
  const today = new Date();
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (same(d, today)) return t("jrToday");
  if (same(d, yesterday)) return t("jrYesterday");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "numeric" });
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function CaseJournal({ caseDoc }: { caseDoc: Case }) {
  const t = useT();
  const [events, setEvents] = useState<CaseEventDoc[]>([]);
  const [refs, setRefs] = useState<ReferralDoc[]>([]);
  useEffect(() => watchCaseEvents(caseDoc.id, setEvents, () => {}), [caseDoc.id]);
  useEffect(() => {
    if (caseDoc.status !== "awaiting_selection" && caseDoc.status !== "connected") return;
    return watchCaseReferrals(caseDoc.id, setRefs, () => {});
  }, [caseDoc.id, caseDoc.status]);

  /* תרגום עם נפילה: מפתח לא מוכר (גרסה עתידית) → הנוסח העברי מהשרת */
  const tt = (key: string, fallback: string, name?: string) => {
    const s = t(key as StringKey);
    const raw = !s || s === key ? fallback : s;
    return raw.replace("{name}", name ?? "");
  };

  const feed = useMemo(() => {
    const syn = synthesize(caseDoc, refs, events);
    return [...events, ...syn].sort((a, b) => a.ts - b.ts);
  }, [caseDoc, refs, events]);

  const ball = journalBall(caseDoc, refs);

  /* רשומת "בהמשך" — מה הדבר הבא שיופיע כאן, בלי שעון */
  const pending: { title: StringKey; body: StringKey } | null = useMemo(() => {
    if (caseDoc.status !== "awaiting_selection") return null;
    const live = (r: ReferralDoc) => r.status === "names_check" && Date.now() <= r.expiresAt;
    if (refs.some((r) => r.status === "details_shared" && r.offerAmount))
      return { title: "jrPendingChoose", body: "jrPendingChooseBody" };
    if (refs.some((r) => r.status === "details_shared"))
      return { title: "jrPendingOffer", body: "jrPendingOfferBody" };
    if (refs.some(live) || refs.some((r) => r.status === "cleared"))
      return { title: "jrPendingCheck", body: "jrPendingCheckBody" };
    return null;
  }, [caseDoc.status, refs]);

  if (caseDoc.status === "validating") return null;

  let lastDay = "";

  return (
    <section aria-label={t("jrTitle")} className="mt-4">
      {/* האי הכהה — מה עכשיו, אצל מי הכדור */}
      {ball ? (
        <div className="jr-island rounded-2xl p-4">
          <div className="text-[11px] font-bold tracking-[0.12em] text-gold-ink">{t("jrNow")}</div>
          <div className="mt-1 text-lg font-extrabold text-foreground">{t(BALL_KEY[ball])}</div>
          {ball === "system" || caseDoc.status === "summary_ready" ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {ball === "system" ? t("jrNowValidating") : t("jrNowSummaryReady")}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* הפיד המתוארך */}
      <ol className="mt-3">
        {feed.map((ev) => {
          const day = dayLabel(ev.ts, t);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <li key={ev.id}>
              {showDay ? (
                <div className="mb-1 mt-3 pe-1 text-[11px] font-bold text-muted-foreground">
                  {day} · {timeLabel(ev.ts)}
                </div>
              ) : null}
              <div className="jr-entry relative me-2 border-e-2 border-border pe-3 pb-3">
                <span
                  className={cn(
                    "jr-dot absolute -end-[5px] top-1.5 size-2 rounded-full",
                    ev.actor === "lawyer" ? "bg-gold-ink" : ev.kind === "connected" ? "bg-success" : "bg-primary",
                  )}
                  aria-hidden
                />
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-[13.5px] font-bold text-foreground">
                    {tt(ev.titleKey, ev.heTitle, ev.refName)}
                  </div>
                  {ev.bodyKey || ev.heBody ? (
                    <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {tt(ev.bodyKey ?? "", ev.heBody ?? "", ev.refName)}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}

        {pending ? (
          <li>
            <div className="mb-1 mt-3 pe-1 text-[11px] font-bold text-muted-foreground/70">{t("jrUpcoming")}</div>
            <div className="relative me-2 border-e-2 border-dashed border-border pe-3">
              <span className="absolute -end-[5px] top-1.5 size-2 rounded-full border-2 border-border bg-card" aria-hidden />
              <div className="rounded-xl border border-dashed border-border bg-card p-3">
                <div className="text-[13.5px] font-bold text-muted-foreground">{t(pending.title)}</div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground/80">{t(pending.body)}</div>
              </div>
            </div>
          </li>
        ) : null}
      </ol>
    </section>
  );
}
