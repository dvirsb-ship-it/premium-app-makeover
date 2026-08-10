import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Calendar, Check, Clock, Languages, Scale, ShieldAlert, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { categoryIcon } from "../lib/category-icons";
import { openCaseCountsFn, type OpenCountsResult } from "../lib/ai/intake.functions";
import { fbAuth } from "../lib/firebase";
import { categoryMatchesSpecialties } from "../lib/db";
import { readLawyerProfile, readLawyerStats } from "../lib/db";
import { NotificationBell } from "../components/NotificationBell";
import {
  watchMyVerification,
  type VerificationStatus,
} from "../lib/verification-queue";
import { useAppStore } from "../lib/store";
import type { FeedCase } from "../lib/types";
import { cn } from "../lib/utils";
import { useT, translate, type StringKey } from "../lib/i18n";
import { LANG_NAMES, useSettings, type Lang } from "../lib/settings";
import { useRequireAuth } from "../lib/require-auth";
import { trialState } from "../lib/trial";
import { PushPrimer } from "../components/PushPrimer";
import { usePushPrimer } from "../lib/use-push-primer";
import { isWarningReason, strongestReason, type MatchReason } from "../lib/match";

export const Route = createFileRoute("/lawyer")({
  head: () => ({
    meta: [
      { title: "JustAsk — Lawyer feed" },
      {
        name: "description",
        content: "Fresh legal requests waiting for expert lawyers to express interest.",
      },
      { property: "og:title", content: "JustAsk — Lawyer feed" },
      {
        property: "og:description",
        content: "Quality real-time legal requests for lawyers on JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LawyerFeed,
});

function LawyerFeed() {

  useRequireAuth();  const navigate = useNavigate();
  const { feed, feedError, user } = useAppStore();
  const { lang } = useSettings();
  const t = useT();
  const urgentLabel = translate("urgent", "he"); // still used to test underlying data

  // סטטוס האימות של עורך הדין — באנר קבוע עד לאישור
  const [verStatus, setVerStatus] = useState<VerificationStatus | null>(null);
  /*
   * "טרם נטען" ו"מעולם לא הגיש" הם שני מצבים שונים שנראו זהים (שניהם null),
   * ועורך דין שנרשם ולא המשיך לאימות היה מקבל מסך ריק בלי שום הסבר.
   */
  const [verLoaded, setVerLoaded] = useState(false);
  /* תקופת המייסדים נגזרת מתאריך האישור; המונה נכתב בשרת */
  const [approvedAt, setApprovedAt] = useState<number | null>(null);
  const [connections, setConnections] = useState<number>(0);
  /*
   * כשל בקריאת הסטטוס אינו "לא הגיש". בלי ההפרדה הזו כשל רשת רגעי היה
   * מציע לעורך דין *מאושר* להתחיל אימות מחדש — בדיוק ההיפך מהאמת.
   */
  const [verError, setVerError] = useState(false);
  /*
   * ספירות התיקים הפתוחים — לעו"ד שטרם אומת.
   *
   * הוא אינו רשאי לקרוא תיקים, וזה נכון שיישאר ככה. אבל מסך ריק לגמרי
   * נראה כמו מוצר מת בדיוק ברגע שבו הוא מחליט אם להשלים את האימות.
   * מספרים בלבד: אפס מידע על אף אדם, והוכחה שיש כאן עבודה.
   */
  const [counts, setCounts] = useState<OpenCountsResult | null>(null);
  const [mySpecs, setMySpecs] = useState<string[]>([]);
  useEffect(() => {
    /*
     * בלי תלות ב-verStatus — בכוונה. כשהוא היה בתנאי, סטטוס האימות
     * (קריאת Firestore מהירה) הגיע לפני שהספירה מהשרת חזרה, ה-cleanup
     * ביטל אותה באמצע, וההרצה מחדש יצאה מיד ב-return — כלומר אצל עורך
     * דין מאושר FeedPulse לא הופיע אף פעם. הספירה זולה; מי שמחליט אם
     * להציג אותה הוא ה-render, לא ה-fetch.
     */
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const idToken = await fbAuth().currentUser?.getIdToken();
        if (!idToken) return;
        const [res, prof] = await Promise.all([
          openCaseCountsFn({ data: { idToken } }),
          readLawyerProfile(user.uid).catch(() => null),
        ]);
        if (cancelled) return;
        setCounts(res);
        setMySpecs(prof?.specialties ?? []);
      } catch {
        /* ספירה שנכשלה פשוט לא מוצגת */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchMyVerification(
      user.uid,
      (rec) => {
        setVerStatus(rec?.status ?? null);
        setApprovedAt(rec?.reviewedAt ?? null);
        setVerLoaded(true);
        setVerError(false);
      },
      () => setVerError(true),
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void readLawyerStats(user.uid)
      .then((st) => setConnections(st?.connections ?? 0))
      .catch(() => {});
  }, [user]);

  /*
   * מצב הניסיון מוצג בפיד כשקיפות, לא כהפתעה: עורך דין צריך לדעת כמה
   * חיבורים נשארו לו *לפני* שהוא משקיע זמן בקריאת תיקים.
   */
  const trial = trialState({ connections, approvedAt });
  /*
   * ההסבר על ההתראות — רק לעו"ד שאושר. לפני האישור אין לו תיקים לקבל
   * עליהם התראה, ובקשה בשלב הזה היא רעש שישרוף לנו את ההזדמנות.
   */
  const primer = usePushPrimer(user?.uid, verStatus === "approved");

  return (
    <AppShell>
      <PushPrimer
        open={primer.open}
        role="lawyer"
        onAllow={() => void primer.allow()}
        onDismiss={primer.dismiss}
      />
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        /*
         * אותו לוח כותרת בדיוק כמו בבית של הלקוח — קו אחד לשני הצדדים.
         * ההנמקה המלאה, כולל למה אין כאן `sticky`, נמצאת ב-`.masthead`.
         */
        className="masthead -mx-5 flex items-center justify-between px-5 pb-4 pt-6"
      >
        <div>
          <p className="eyebrow-live text-xs font-medium tracking-[0.22em]">
            JUSTASK · PRO
          </p>
          <h1 className="mast-name mt-1 text-2xl font-bold">
            {t("newLeads")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell className="mast-bell" />
          <button
            type="button"
            onClick={() => navigate({ to: "/lawyer-subscription" })}
            className="mast-bell liquid-glass grid size-11 place-items-center rounded-full text-foreground"
            aria-label={t("proSubscriptionAria")}
          >
            {/* לא `text-gold`: על לוח העצם זהב-על-קרם הוא אותה משפחת גוון
                ונעלם. `mast-accent` נותן את הזהב הנכון לכל לוח. */}
            <Sparkles className="mast-accent size-5" strokeWidth={2} />
          </button>
        </div>
      </motion.header>

      {/* אותו אזור עבודה כמו בבית של הלקוח — קו אחד לשני הצדדים.
          ההנמקה המלאה נמצאת ב-index.tsx. */}
      <div className="workspace -mx-5 min-h-screen px-5 pt-1">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 flex gap-2"
      >
        <span className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-foreground">
          <Users className="size-3.5 text-gold" strokeWidth={2} />
          {feed.length} {t("openLeads")}
        </span>
        <span className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-foreground">
          <Calendar className="size-3.5 text-gold" strokeWidth={2} />
          {t("today")}
        </span>
      </motion.div>

      {verStatus === "pending" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass mt-4 flex items-start gap-3 rounded-2xl px-4 py-3.5"
          role="status"
        >
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <ShieldCheck className="size-4.5" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground">{t("verPendingBanner")}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              {t("verPendingBannerSub")}
            </p>
          </div>
        </motion.div>
      )}

      {verLoaded && !verError && verStatus === null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass mt-4 flex items-start gap-3 rounded-2xl border border-gold/35 px-4 py-3.5"
          role="status"
        >
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <ShieldCheck className="size-4.5" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-foreground">
              {t("interestLockedTitle")}
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/lawyer-onboarding" })}
              className="mt-1.5 text-[12px] font-bold text-gold underline-offset-2 hover:underline"
            >
              {t("interestLockedCta")}
            </button>
          </div>
        </motion.div>
      )}

      {verError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 px-4 py-3.5"
          role="alert"
        >
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive">
            <ShieldAlert className="size-4.5" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-foreground">{t("verStatusErrorTitle")}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              {t("verStatusErrorSub")}
            </p>
          </div>
        </motion.div>
      )}

      {verStatus === "rejected" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass mt-4 flex items-start gap-3 rounded-2xl border border-gold/35 px-4 py-3.5"
          role="alert"
        >
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <ShieldAlert className="size-4.5" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-foreground">{t("verRejectedBanner")}</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/lawyer-onboarding" })}
              className="mt-1.5 text-[12px] font-bold text-gold underline-offset-2 hover:underline"
            >
              {t("verRejectedBannerCta")}
            </button>
          </div>
        </motion.div>
      )}

      {/*
        * הפומו. מוצג רק כשיש באמת תיקים — פאנל שמכריז "0 תיקים ממתינים"
        * עושה את ההיפך המדויק ממה שהוא נועד לו.
        */}
      {verStatus !== "approved" && counts && counts.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 rounded-[26px] border border-gold/30 bg-gold/[0.06] p-5"
        >
          {(() => {
            const mine = mySpecs.length
              ? counts.byCategory.filter((c) => categoryMatchesSpecialties(c.category, mySpecs))
              : counts.byCategory;
            const mineTotal = mine.reduce((n, c) => n + c.count, 0);
            const show = (mineTotal > 0 ? mine : counts.byCategory).slice(0, 6);
            const headline = mineTotal > 0 ? mineTotal : counts.total;
            return (
              <>
                <p className="text-center text-[46px] font-black leading-none text-gold-ink">
                  {headline}
                </p>
                <p className="mt-1.5 text-center text-[13.5px] font-bold text-foreground">
                  {t(mineTotal > 0 ? "fomoTitleMine" : "fomoTitleAll")}
                </p>
                <div className="mt-4 space-y-1.5">
                  {show.map((c) => {
                    const Icon = categoryIcon(c.category);
                    return (
                      <div key={c.category} className="flex items-center gap-2.5">
                        <Icon className="size-4 shrink-0 text-gold-ink" strokeWidth={1.9} aria-hidden />
                        <span className="flex-1 truncate text-[12.5px] text-foreground/90">
                          {c.category}
                        </span>
                        <span className="text-[12.5px] font-bold text-foreground">{c.count}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 border-t border-gold/20 pt-3 text-center text-[12px] font-semibold text-gold-ink">
                  {t("fomoUnlock")}
                </p>
              </>
            );
          })()}
        </motion.div>
      )}

      <div className="mt-6 space-y-3">
        {/*
          * שלושה מצבים שנראו זהים ולכן בלבלו: פיד ריק, פיד שנכשל, ופיד
          * שחסום כי האימות טרם אושר. השלישי הוא לא תקלה — החוקים מונעים
          * קריאת תיקים מעו"ד לא מאושר, וה-onSnapshot נכשל בצדק. עד עכשיו
          * עורך דין חדש ראה באנר ירוק "אפשר לצפות בתיקים" ומיד מתחתיו
          * שגיאה אדומה. הבאנר למעלה כבר אומר את האמת; כאן פשוט שותקים.
          */}
        {/*
          * מונה הניסיון — שקיפות ולא הפתעה. עורך דין צריך לדעת כמה
          * חיבורים נשארו לו לפני שהוא משקיע זמן בקריאת תיקים, ולא
          * לגלות את זה כשהוא כבר רוצה להגיש הצעה. למייסדים ולמנויים
          * אין מונה בכלל — אין להם מכסה.
          */}
        {verStatus === "approved" && Number.isFinite(trial.left) && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.07] px-3.5 py-2.5">
            <Sparkles className="size-4 shrink-0 text-gold" strokeWidth={2.2} />
            <span className="text-[12.5px] font-bold text-foreground">
              {trial.left === 1
                ? t("trialLeftChipOne")
                : trial.left > 0
                  ? t("trialLeftChip").replace("{n}", String(trial.left))
                  : t("trialOverTitle").replace("{n}", String(trial.used))}
            </span>
            <button
              type="button"
              onClick={() => navigate({ to: "/lawyer-subscription" })}
              className="ms-auto shrink-0 text-[12px] font-bold text-gold underline-offset-2 hover:underline"
            >
              {t("trialOverCta")}
            </button>
          </div>
        )}

        {verStatus !== "approved" ? null : feedError ? (
          <div className="liquid-glass rounded-3xl border border-destructive/30 p-5 text-center">
            <p className="text-sm font-bold text-foreground">{t("feedErrorTitle")}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t("feedErrorSub")}
            </p>
          </div>
        ) : feed.length === 0 ? (
          /*
           * עורך הדין הראשון שיאושר ייכנס לפיד ריק — זה בלתי נמנע בשלב
           * ההשקה, אבל "אין כרגע פניות בתחומכם" נקרא כמו מוצר מת ולא
           * כמו יום ראשון. אומרים לו איפה אנחנו, מה כבר עובד, ומה יקרה
           * כשתגיע פנייה. זה עורך דין שגויס אישית — הוא ראוי להקשר.
           */
          <div className="rounded-3xl border border-gold/25 bg-gold/[0.05] p-7 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold/12 ring-1 ring-gold/25">
              <Scale className="size-5 text-gold" strokeWidth={1.9} />
            </span>
            <p className="mt-4 text-[15px] font-bold text-foreground">
              {t("feedFirstRunTitle")}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {t("feedFirstRunSub")}
            </p>
            <ul className="mt-5 space-y-2.5 text-start">
              {(["feedFirstRun1", "feedFirstRun2", "feedFirstRun3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-gold">
                    <Check className="size-2.5 text-[#0F172A]" strokeWidth={4} />
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-foreground/90">{t(k)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-gold/15 pt-4 text-[12px] leading-relaxed text-muted-foreground">
              {t("feedFirstRunNotify")}
            </p>
          </div>
        ) : null}

        {feed.map((f, i) => (
          <motion.button
            key={f.id}
            type="button"
            onClick={() =>
              navigate({
                to: "/lawyer-case/$caseId",
                params: { caseId: f.id },
              })
            }
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15 + i * 0.08,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileTap={{ scale: 0.98 }}
            className="liquid-glass relative flex w-full items-stretch gap-3 overflow-hidden rounded-[24px] p-3 text-start"
          >
            {/*
              * סמל התחום במקום תמונת סטוק. התמונות היו כמעט זהות בכל
              * הכרטיסים (ורובן ברירת מחדל, כי המפתחות היו שמות קטגוריה
              * ישנים), כלומר תפסו 88px בלי לשאת מידע. סמל נקרא במבט.
              */}
            <span className="chip-emblem grid size-[88px] shrink-0 place-items-center rounded-2xl">
              {(() => {
                const Icon = categoryIcon(f.category);
                return (
                  <Icon
                    className="relative z-10 size-9 text-gold-ink"
                    strokeWidth={1.7}
                    aria-hidden
                  />
                );
              })()}
            </span>

            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {/*
                    * התחום הוא **סיווג**, ולכן שבב דיו ולא זהב. הזהב על
                    * הכרטיס הזה שמור לסיבת ההתאמה — מה שעושה את התיק שווה
                    * לעורך הדין הזה דווקא.
                    */}
                  <span className="chip-navy rounded-full px-2 py-0.5 text-[10px] font-bold">
                    {f.category}
                  </span>
                  {f.urgency === urgentLabel && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                      {t("urgent")}
                    </span>
                  )}
                  {/*
                    * הסיבה, לא הציון.
                    *
                    * "התאמה 100%" אמר לעורך הדין מה לחשוב בלי לומר לו למה.
                    * "התחום המרכזי שלך" הוא עובדה שהוא יכול לאמת בעצמו
                    * ולחלוק עליה. הציון עדיין ממיין את הפיד — הוא פשוט
                    * הפסיק להתחזות לשיפוט.
                    */}
                  {(() => {
                    const r = strongestReason(
                      (f.matchReasons ?? []) as MatchReason[],
                    );
                    if (!r) return null;
                    return (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          isWarningReason(r)
                            ? "bg-warning-ink/12 text-warning-ink"
                            : "chip-gold",
                        )}
                      >
                        {t(r)}
                      </span>
                    );
                  })()}
                  {/*
                    * חלון ההתיישנות — מוצג רק כשהוא נסגר (פחות משנה וחצי).
                    * תג שמופיע על כל תיק מפסיק להיות סימן ומתחיל להיות רעש.
                    */}
                  {typeof f.limitationMonthsLeft === "number" &&
                    f.limitationMonthsLeft <= 18 && (
                      <span className="rounded-full bg-warning-ink/12 px-2 py-0.5 text-[10px] font-bold text-warning-ink">
                        {t("limitationLeft")} {f.limitationMonthsLeft}{" "}
                        {t("limitationMonths")}
                      </span>
                    )}
                  {/*
                    * שפת הלקוח — מוצגת רק כשהיא אינה עברית, כי תג על כל
                    * תיק הוא רעש. אם היא גם מחוץ לשפות שסימן, התג מסמן
                    * את זה במפורש: זה ההבדל בין "כדאי לדעת" ל"שים לב".
                    */}
                  {f.clientLang && f.clientLang !== "he" && (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        f.langMismatch
                          ? "bg-warning-ink/12 text-warning-ink"
                          : "bg-primary/10 text-primary"
                      }`}
                      title={
                        f.langMismatch
                          ? t("feedLangMismatch")
                          : `${t("feedLangLabel")}: ${LANG_NAMES[f.clientLang as Lang] ?? f.clientLang}`
                      }
                    >
                      <Languages className="size-3" strokeWidth={2.4} />
                      {LANG_NAMES[f.clientLang as Lang] ?? f.clientLang}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[15px] font-semibold text-foreground">
                  {f.title}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {f.location}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {f.interestedCount}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {f.postedAgo}
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/*
        * מתחת לפיד היה שטח ריק, ועורך דין שרואה שתי פניות אינו יודע אם
        * זה כל מה שיש או שהמערכת פשוט שקטה. שני הבלוקים האלה עונים בדיוק
        * על זה — הראשון במספרים אמיתיים, השני בהסבר של מה קורה הלאה.
        */}
      {verStatus === "approved" && (
        <>
          <FeedPulse feed={feed} counts={counts} mySpecs={mySpecs} />
          <HowItWorks />
        </>
      )}

      </div>

      {/* silence unused var warnings when lang changes */}
      <span hidden>{lang}</span>
    </AppShell>
  );
}

/**
 * מה פתוח עכשיו — ולמה אתה רואה רק חלק מזה.
 *
 * זו השאלה שעורך דין שואב מהמסך בלי לשאול: "זה הכול?". התשובה הכנה
 * היא שהוא רואה את התחומים שסימן, ושיש עוד. הפס מראה את היחס במבט
 * אחד, והפירוט מסמן אילו תחומים שלו.
 */
function FeedPulse({
  feed,
  counts,
  mySpecs,
}: {
  feed: FeedCase[];
  counts: OpenCountsResult | null;
  mySpecs: string[];
}) {
  const t = useT();
  const navigate = useNavigate();
  // בלי נתונים אמיתיים לא מציגים פאנל — לוח ריק גרוע מאין לוח
  if (!counts || counts.total === 0) return null;

  const visible = feed.length;
  const total = counts.total;
  const elsewhere = Math.max(0, total - visible);
  const share = total > 0 ? Math.min(100, Math.round((visible / total) * 100)) : 0;
  // פניות שאיש עוד לא הגיב להן — ההזדמנות האמיתית, ונתון שאפשר לאמת
  const untouched = feed.filter((f) => f.interestedCount === 0).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="liquid-glass mt-8 rounded-[26px] p-5"
      aria-label={t("pulseTitle")}
    >
      <p className="text-[11px] font-medium tracking-[0.2em] text-gold">
        {t("pulseEyebrow")}
      </p>
      <h2 className="mt-1.5 text-[17px] font-bold text-foreground">
        {t("pulseTitle")}
      </h2>

      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        <span className="font-bold text-foreground">{visible}</span>{" "}
        {t("pulseOutOf")}{" "}
        <span className="font-bold text-foreground">{total}</span>{" "}
        {t("pulseOpenNow")}
      </p>

      {/* היחס במבט אחד: המילוי הוא מה שפתוח בפניך, השאר הוא מה שקיים ואינו */}
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10"
        role="img"
        aria-label={`${visible} ${t("pulseOutOf")} ${total}`}
      >
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${share}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-[#F1E4C3] via-gold to-[#B8912B]"
        />
      </div>

      {elsewhere > 0 && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
          {elsewhere} {t("pulseElsewhere")}
        </p>
      )}

      <div className="mt-4 space-y-1.5 border-t border-foreground/10 pt-4">
        {counts.byCategory.slice(0, 6).map((c) => {
          const mine = categoryMatchesSpecialties(c.category, mySpecs);
          const Icon = categoryIcon(c.category);
          return (
            <div key={c.category} className="flex items-center gap-2.5">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  mine ? "text-gold" : "text-muted-foreground/60",
                )}
                strokeWidth={1.9}
                aria-hidden
              />
              <span
                className={cn(
                  "flex-1 truncate text-[12.5px]",
                  mine ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {c.category}
              </span>
              {mine && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold-ink">
                  {t("pulseMine")}
                </span>
              )}
              <span
                className={cn(
                  "w-6 text-end text-[12.5px] font-bold tabular-nums",
                  mine ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {c.count}
              </span>
            </div>
          );
        })}
      </div>

      {untouched > 0 && (
        <p className="mt-4 rounded-2xl bg-gold/[0.07] px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed text-gold-ink">
          {untouched} {t("pulseUntouched")}
        </p>
      )}

      {/*
        * מוביל למסך עריכת התחומים, לא לטופס האימות.
        *
        * עד 6/8/2026 הוא הוביל ל-/lawyer-onboarding — שמתחיל משלב אפס
        * ומסיים בכתיבת status:"pending". כלומר עורך דין מאומת שלחץ כאן,
        * בדיוק כפי שהשורה שמעל מבקשת ממנו, איבד את האימות ויצא מהפיד.
        */}
      {elsewhere > 0 && (
        <button
          type="button"
          onClick={() => navigate({ to: "/settings/specialties" })}
          className="mt-3 min-h-11 w-full rounded-2xl border border-gold/30 py-2.5 text-[12.5px] font-bold text-gold-ink transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          {t("pulseEditSpecs")}
        </button>
      )}
    </motion.section>
  );
}

/**
 * מה קורה אחרי שמביעים עניין.
 *
 * עורך דין חדש אינו יודע מה קורה מהרגע שהוא לוחץ ועד שיש לו לקוח, ולכן
 * הוא מהסס. שלושת השלבים כתובים בדיוק כפי שהמערכת עובדת — כולל העובדה
 * שהלקוח הוא שבוחר, ושפרטיו נחשפים רק אז.
 */
function HowItWorks() {
  const t = useT();
  const steps: { key: StringKey; icon: typeof Scale }[] = [
    { key: "howStep1", icon: Scale },
    { key: "howStep2", icon: Users },
    { key: "howStep3", icon: Clock },
  ];

  return (
    <section className="mt-4 rounded-[26px] border border-foreground/10 p-5">
      <h2 className="text-[13px] font-bold text-foreground">{t("howTitle")}</h2>
      <ol className="mt-3.5 space-y-3.5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gold/12 text-[11px] font-black text-gold-ink ring-1 ring-gold/20">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {t(s.key)}
                </p>
              </div>
              <Icon className="mt-1 size-4 shrink-0 text-gold/50" strokeWidth={1.8} aria-hidden />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
