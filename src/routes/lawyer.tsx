import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Calendar, Check, Clock, Hourglass, Languages, Scale, ShieldAlert, ShieldCheck, Sparkles, Users } from "lucide-react";
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
import { LawyerReferrals } from "../components/LawyerReferrals";
import { usePushPrimer } from "../lib/use-push-primer";
import { isWarningReason, strongestReason, type MatchReason } from "../lib/match";

export const Route = createFileRoute("/lawyer")({
  head: () => ({
    meta: [
      { title: "JustAsk — הפניות אליך" },
      {
        name: "description",
        content: "Fresh legal requests waiting for expert lawyers to express interest.",
      },
      { property: "og:title", content: "JustAsk — הפניות אליך" },
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
  const { user } = useAppStore();
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
        className="masthead -mx-5 flex items-center justify-between px-5 pb-4 pt-8"
      >
        <div>
          <p className="eyebrow-live text-xs font-medium tracking-[0.22em]">
            JUSTASK · PRO
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground">
            {t("newLeads")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => navigate({ to: "/lawyer-subscription" })}
            className="liquid-glass grid size-11 place-items-center rounded-full text-foreground"
            aria-label={t("proSubscriptionAria")}
          >
            <Sparkles className="size-5 text-gold" strokeWidth={2} />
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

        {/*
          * ═══ הפיד הישן הוחלף בפניות — 20/8/2026 ═══
          *
          * feed.map הציג כאן את כל התיקים הפתוחים בתחום לכל עורך דין
          * מאושר — המנגנון שהסקירה כינתה "מכרז על לקוחות". תיק אינו
          * מגיע עוד ל-matching, כך שהרשימה ההיא ריקה מבנית; מה שמוצג
          * הוא פניות ממי שבחר בעורך הדין הזה בעצמו.
          */}
        {verStatus === "approved" && user && <LawyerReferrals uid={user.uid} />}
      </div>

      {/*
        * מתחת לפיד היה שטח ריק, ועורך דין שרואה שתי פניות אינו יודע אם
        * זה כל מה שיש או שהמערכת פשוט שקטה. שני הבלוקים האלה עונים בדיוק
        * על זה — הראשון במספרים אמיתיים, השני בהסבר של מה קורה הלאה.
        */}
      {verStatus === "approved" && (
        <>
          {/* FeedPulse הוסר מהרינדור — נשען על הפיד הישן. יימחק בטאטוא. */}
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
/* FeedPulse נמחק (20/8/2026) — מדד של הפיד הפתוח, שאינו קיים במתווה החדש. */

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
