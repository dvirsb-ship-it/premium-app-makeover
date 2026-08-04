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

import { Page, Pressable, Rise, Stagger } from "../components/motion";
import { NotificationBell } from "../components/NotificationBell";
import { SubmittedModal } from "../components/SubmittedModal";
import { PushPrimer } from "../components/PushPrimer";
import { usePushPrimer } from "../lib/use-push-primer";
import { translate, useT, type StringKey } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useAppStore } from "../lib/store";
import { toneClasses, useStatusMeta, useTimeAgo } from "../lib/status";
import { cn } from "../lib/utils";
import type { Case } from "../lib/types";


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
  const { role, user, onboarded, authReady } = useAppStore();
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

  // עורך דין שלוחץ "ראשי" קיבל עד כה את מסך הבחירה — יש לו בית משלו
  useEffect(() => {
    if (gateChecked && role === "lawyer") navigate({ to: "/lawyer", replace: true });
  }, [gateChecked, role, navigate]);

  /*
   * מחובר שטרם אישר את התנאים לא רואה את הבית — גם אם הקליד "/" ידנית.
   * בלי זה מסך ההתחייבות הוא המלצה בלבד: כתובת ישירה עוקפת אותו.
   */
  useEffect(() => {
    if (gateChecked && user && onboarded === false && role !== "lawyer") {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [gateChecked, user, onboarded, role, navigate]);

  /*
   * הבוחר הישן שישב כאן הוסר: בחירת התפקיד גרה עכשיו בסוף מסך הדלתות,
   * וקיומם של שני מסכי בחירה שונים יצר בדיוק את מה שדביר ראה בטלפון —
   * "לפעמים העיצוב הישן". מי שמגיע לכאן בלי תפקיד מופנה לדלתות.
   *
   * לפני כל ה-early-returns — hooks חייבים לרוץ בכל רינדור.
   */
  useEffect(() => {
    /*
     * authReady הוא חלק מהתנאי: לפני שהאימות הוכרע, role=null פירושו
     * "עוד לא יודעים" ולא "אין תפקיד". בלעדיו, משתמש חוזר שהקריאה
     * מהשרת שלו התעכבה הוקפץ לבחירת תפקיד שכבר בחר.
     */
    if (authReady && gateChecked && role === null) navigate({ to: "/welcome", replace: true });
  }, [authReady, gateChecked, role, navigate]);

  if (!gateChecked) return null;

  // המערכת כבר יודעת מי אתה — אין סיבה לשאול שוב בכל כניסה
  if (role === "client" && user) return <ClientHome />;

  return null;
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

  /*
   * ההסבר מוצג ללקוח רק כשיש לו תיק פעיל — לפני זה אין לו על מה לקבל
   * התראה, והבקשה תישרף על אדם שעדיין לא הבין מה האפליקציה עושה.
   */
  const primer = usePushPrimer(user?.uid, cases.length > 0);

  return (
    <AppShell>
      <PushPrimer
        open={primer.open}
        role="client"
        onAllow={() => void primer.allow()}
        onDismiss={primer.dismiss}
      />
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

                {/*
                  * רגע ההגעה.
                  *
                  * זה מה שכל המסלול הוביל אליו: אדם שנפגע, סיפר סיפור לא
                  * קל, חיכה — ועכשיו מישהו אמר "אני יכול לעזור לך". קודם
                  * זה נאמר בפס דק בלשון סטטוס, וזה נקרא כהערת שוליים.
                  * כאן זה זהב מלא, בגובה שאי אפשר לפספס, ובלשון פעולה.
                  */}
                {interested > 0 && active.status !== "connected" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative overflow-hidden bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] px-5 py-4"
                  >
                    {/* פס אור איטי — סימן חיים, לא קרנבל */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.45),transparent)] motion-safe:animate-[shine_3.8s_ease-in-out_infinite]"
                    />
                    <div className="relative flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0F172A]/10">
                        <Sparkles className="size-4.5 text-[#0F172A]" strokeWidth={2.4} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-black leading-tight text-[#0F172A]">
                          {interested === 1
                            ? t("offerWaitingOne")
                            : t("offerWaitingMany").replace("{n}", String(interested))}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] font-semibold text-[#0F172A]/70">
                          {interested === 1 ? t("offerWaitingCtaOne") : t("offerWaitingCtaMany")}
                        </span>
                      </span>
                      <Arrow className="size-5 shrink-0 text-[#0F172A]/60" />
                    </div>
                  </motion.div>
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
