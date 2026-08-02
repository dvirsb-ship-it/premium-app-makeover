import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LifeBuoy,
  Plus,
  Scale,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "../components/AppShell";

import { BrandMark } from "../components/BrandMark";
import { HeroVideo } from "../components/HeroVideo";
import { Page, Pressable, Rise, Stagger } from "../components/motion";
import { NotificationBell } from "../components/NotificationBell";
import { SubmittedModal } from "../components/SubmittedModal";
import { translate, useT, type StringKey } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useAppStore } from "../lib/store";
import { toneClasses, useStatusMeta, useTimeAgo } from "../lib/status";
import { cn } from "../lib/utils";
import type { Case, Role } from "../lib/types";


export const Route = createFileRoute("/")({
  // מזהה תיק שזה עתה נשלח — מציג את אישור הקליטה מעל הבית.
  // המפתח מושמט כשאינו קיים, כדי שניווטים רגילים ל-"/" לא ידרשו search.
  validateSearch: (search: Record<string, unknown>): { done?: string } =>
    typeof search.done === "string" ? { done: search.done } : {},
  /*
   * ה-meta בעברית — זה מה שנשלח בוואטסאפ ומה שגוגל מאנדקס, על עמוד
   * שמוגש כ-lang="he" dir="rtl". תצוגה מקדימה באנגלית לקהל ישראלי היא
   * שריד מהתבנית. הקופי נשלף מ-i18n כדי שלא יהיו שתי גרסאות לתחזק.
   */
  head: () => ({
    meta: [
      { title: translate("rootMetaTitle", "he") },
      { name: "description", content: translate("rootMetaDesc", "he") },
      { property: "og:title", content: translate("rootMetaTitle", "he") },
      { property: "og:description", content: translate("rootOgDesc", "he") },
      { property: "og:locale", content: "he_IL" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { role, setRole, user } = useAppStore();
  const t = useT();
  const [gateChecked, setGateChecked] = useState(false);

  // First-run welcome tour gate — runs once per browser.
  useEffect(() => {
    try {
      if (!localStorage.getItem("justask-welcomed")) {
        navigate({ to: "/welcome", replace: true });
        return;
      }
    } catch {
      /* ignore */
    }
    setGateChecked(true);
  }, [navigate]);

  function choose(nextRole: Role) {
    setRole(nextRole);
    if (nextRole === "lawyer") {
      navigate({ to: "/lawyer-onboarding" });
      return;
    }
    // Client already authenticated — go to intake tips; otherwise auth first.
    navigate({ to: role ? "/intake-tips" : "/auth" });
  }

  // עורך דין שלוחץ "ראשי" קיבל עד כה את מסך הבחירה — יש לו בית משלו
  useEffect(() => {
    if (gateChecked && role === "lawyer") navigate({ to: "/lawyer", replace: true });
  }, [gateChecked, role, navigate]);

  if (!gateChecked) return null;

  // המערכת כבר יודעת מי אתה — אין סיבה לשאול שוב בכל כניסה
  if (role === "client" && user) return <ClientHome />;

  return (
    <AppShell bare outerClassName="studio-stage !overflow-y-auto">
      {/* Cinematic studio backdrop — two clips cross-fading behind the phone */}
      <HeroVideo className="z-0" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen flex-col px-6 pb-8 pt-10">
        {/* Centered brand lockup in the studio spotlight */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <BrandMark size={84} />

            <h1 className="mt-5 text-[2.75rem] font-black leading-none tracking-tight text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]">
              Just<span className="text-gradient-gold">Ask</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mt-3 max-w-[17rem] text-base font-light leading-snug text-white/85 drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]"
            >
              {t("heroTagline")}
            </motion.p>
          </motion.div>
        </div>


        {/* Role selection cards — liquid glass */}
        <Stagger className="w-full max-w-sm space-y-4 self-center pb-4">
          <Rise>
            <Pressable
              onClick={() => choose("client")}
              className="liquid-glass glass-hero group block w-full rounded-[22px] p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <div className="relative flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-foreground/5 text-foreground">
                  <UserRound className="size-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-tight text-foreground">
                    {t("clientCTA")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("clientCTASub")}
                  </p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <Pressable
              onClick={() => choose("lawyer")}
              className="liquid-glass-selected glass-hero group block w-full rounded-[22px] p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <div className="relative flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-lg shadow-gold/25">
                  <Scale className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-tight text-foreground">
                    {t("lawyerCTA")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("lawyerCTASub")}
                  </p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <p className="pt-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("trustBadge")}
            </p>
          </Rise>
        </Stagger>
      </div>

    </AppShell>
  );
}

/**
 * הבית של הלקוח.
 *
 * התפקיד הרגשי כאן הוא לא תפריט — אלא תחושה שמישהו מחזיק את התיק בשבילך.
 * לכן התיק הפעיל הוא האלמנט הגדול והיחיד שמושך תשומת לב, והשאר מסודר
 * בקוביות זכוכית שקטות.
 */
function ClientHome() {
  const navigate = useNavigate();
  const { done } = Route.useSearch();
  const t = useT();
  const { cases, casesError, user } = useAppStore();
  const { dir } = useSettings();
  const statusMeta = useStatusMeta();
  const ago = useTimeAgo();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const firstName = (user?.displayName ?? "").trim().split(" ")[0];
  const [active, ...rest] = cases;
  const activeMeta = active ? statusMeta(active.status) : null;
  const interested = active?.interested.length ?? 0;

  return (
    <AppShell>
      <AnimatePresence>
        {done && (
          <SubmittedModal
            onClose={() => navigate({ to: "/", search: {}, replace: true })}
            onViewCase={() => navigate({ to: "/case/$caseId", params: { caseId: done } })}
          />
        )}
      </AnimatePresence>

      <Page>
        <header className="flex items-start justify-between gap-3 pb-7 pt-9">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">{t("homeHello")}</p>
            <h1 className="mt-0.5 truncate text-[2.25rem] font-black leading-[1.1] tracking-tight text-foreground">
              {firstName || t("meBadge")}
            </h1>
            {!active && (
              <p className="mt-1.5 text-sm text-muted-foreground">{t("homeSub")}</p>
            )}
          </div>
          <NotificationBell />
        </header>

        <Stagger className="pb-12">
          {active ? (
            <Rise>
              <Pressable
                onClick={() => navigate({ to: "/case/$caseId", params: { caseId: active.id } })}
                className={cn(
                  "liquid-glass glass-raised relative w-full overflow-hidden rounded-[30px] text-start",
                  interested > 0 && active.status !== "connected" && "glass-warm",
                  active.status === "connected" && "glass-lit",
                )}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[activeMeta!.tone]}`}
                    >
                      {activeMeta!.label}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {ago(active.createdAt)}
                    </span>
                  </div>

                  <h2 className="mt-3.5 text-[1.35rem] font-extrabold leading-[1.2] tracking-tight text-foreground">
                    {active.title || t("homeCaseUntitled")}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {active.summary}
                  </p>
                </div>

                {/* רגע הערך — חותמת בשולי הכרטיס, לא מדבקה שצפה בתוכו */}
                {interested > 0 && active.status !== "connected" && (
                  <div className="flex items-center gap-2.5 border-t border-gold/25 bg-gold/[0.08] px-5 py-3.5">
                    <Sparkles className="size-4 shrink-0 text-gold-ink" strokeWidth={2} />
                    <span className="text-[13px] font-bold text-foreground">
                      {interested} {t("lawyersInterestedCount")}
                    </span>
                    <Arrow className="ms-auto size-4 shrink-0 text-gold-ink/70" />
                  </div>
                )}
              </Pressable>
            </Rise>
          ) : (
            <Rise>
              {/* "עוד לא שיתפת מקרה" מול "לא הצלחנו לטעון" — לא אותו דבר */}
              <div className={casesError
                ? "rounded-[30px] border border-destructive/30 bg-destructive/[0.05] p-6 text-center"
                : "liquid-glass rounded-[30px] p-6 text-center"}>
                <span className="chip-emblem mx-auto grid size-14 place-items-center">
                  <Scale className="relative z-10 size-6 text-gold-ink" strokeWidth={2} />
                </span>
                <h2 className="mt-4 text-base font-bold text-foreground">
                  {t(casesError ? "loadFailedTitle" : "homeEmptyTitle")}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(casesError ? "casesErrorSub" : "homeEmptySub")}
                </p>
              </div>
            </Rise>
          )}

          <Rise className="mt-3">
            <Pressable
              onClick={() => navigate({ to: "/intake-tips" })}
              className={cn(
                "tap flex w-full items-center justify-center gap-2 rounded-full font-bold",
                active
                  ? "surface-sunken py-3.5 text-[15px] text-foreground ring-1 ring-inset ring-gold/35"
                  : "btn-gold py-4 text-base",
              )}
            >
              <Plus className={cn("size-[18px]", active && "text-gold-ink")} strokeWidth={2.5} />
              {active ? t("homeNewCase") : t("homeFirstCase")}
            </Pressable>
          </Rise>

          {/*
            * כאן היו ארבע קוביות ניווט, ושלוש מהן היו כפילות: "התיקים שלי"
            * ו"פרופיל" יושבים בתפריט התחתון, ו"התראות" הוא הפעמון שבראש
            * המסך הזה ממש. קובייה שמובילה למקום שכבר נגיש בשני מגעים אינה
            * עוזרת — היא רק מרעישה את המסך.
            *
            * במקומן: מה שהלקוח באמת לא יודע. איפה הפנייה שלו נמצאת עכשיו,
            * ומי כבר ראה אותה. "עזרה ותמיכה" נשאר, כי הוא היחיד שלא היה
            * נגיש מכאן.
            */}
          <Rise className="mt-6">
            <ClientJourney active={active} />
          </Rise>

          <Rise className="mt-3">
            <Pressable
              onClick={() => navigate({ to: "/settings/help" })}
              className="liquid-glass glass-flat tap flex w-full items-center gap-3 rounded-[22px] px-4 py-3.5"
            >
              <span className="chip-emblem grid size-10 shrink-0 place-items-center">
                <LifeBuoy className="relative z-10 size-4 text-gold-ink" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="flex-1 text-start text-[13.5px] font-bold text-foreground">
                {t("help")}
              </span>
              <Arrow className="size-4 shrink-0 text-muted-foreground/50" />
            </Pressable>
          </Rise>

          {rest.length > 0 && (
            <Rise className="mt-6">
              <div className="liquid-glass glass-quiet overflow-hidden rounded-[26px]">
                <p className="px-5 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("homeOtherCases")}
                </p>
                {rest.slice(0, 3).map((c, i) => {
                  const m = statusMeta(c.status);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate({ to: "/case/$caseId", params: { caseId: c.id } })}
                      className={`flex w-full items-center gap-3 p-4 text-start ${i !== Math.min(rest.length, 3) - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {c.title || t("homeCaseUntitled")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{m.label}</p>
                      </div>
                      <Arrow className="size-4 shrink-0 text-muted-foreground/40" />
                    </button>
                  );
                })}
              </div>
            </Rise>
          )}
        </Stagger>
      </Page>
    </AppShell>
  );
}

/**
 * איפה הפנייה שלך נמצאת עכשיו.
 *
 * זה מה שהחליף ארבע קוביות ניווט שהובילו למקומות שכבר נגישים מהתפריט
 * התחתון ומהפעמון שלמעלה. השאלה שהלקוח באמת מחזיק בראש אינה "איפה
 * הפרופיל" אלא "מה קורה עם מה ששלחתי, ומי כבר ראה את זה".
 *
 * שלושת השלבים הם המראה של אותו הסבר שעורך הדין מקבל בסוף הפיד שלו —
 * אותו תהליך, משני צדדיו.
 */
function ClientJourney({ active }: { active?: Case }) {
  const t = useT();

  /*
   * השלב הנוכחי נגזר מהסטטוס האמיתי של התיק, לא מהערכה. בלי תיק פעיל
   * מוצגים אותם שלבים בלי סימון — כך זה נקרא כ"מה יקרה" ולא כהתקדמות
   * מדומה של תיק שלא קיים.
   */
  const step = !active
    ? -1
    : active.status === "validating"
      ? 0
      : active.status === "matching"
        ? 1
        : active.status === "has_interest"
          ? 2
          : active.status === "connected" || active.status === "closed"
            ? 3
            : -1;

  /*
   * המספר האמיתי של עורכי הדין שקיבלו את הפנייה. undefined בתיקים
   * ישנים שנפתחו לפני שהתחלנו למדוד — ואז פשוט לא נאמר מספר, במקום
   * לנחש אחד.
   */
  const notified = active?.notifiedLawyers;

  const steps: { key: StringKey; note?: string }[] = [
    { key: "journeyStep1" },
    {
      key: "journeyStep2",
      note:
        typeof notified === "number" && notified > 0
          ? `${notified} ${t("journeyNotified")}`
          : undefined,
    },
    { key: "journeyStep3" },
  ];

  return (
    <div className="liquid-glass glass-quiet rounded-[26px] p-5">
      <p className="text-[13px] font-bold text-foreground">
        {t(active ? "journeyTitleActive" : "journeyTitleEmpty")}
      </p>

      <ol className="mt-4 space-y-4">
        {steps.map((s, i) => {
          const done = step > i;
          const current = step === i;
          return (
            <li key={s.key} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black",
                  done && "bg-gold/20 text-gold-ink ring-1 ring-gold/30",
                  current && "bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-lg shadow-gold/25",
                  !done && !current && "bg-foreground/8 text-muted-foreground ring-1 ring-foreground/10",
                )}
                aria-hidden
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[12.5px] leading-relaxed",
                    current ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(s.key)}
                </p>
                {s.note && (
                  <p className="mt-1 text-[12px] font-bold text-gold-ink">{s.note}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
