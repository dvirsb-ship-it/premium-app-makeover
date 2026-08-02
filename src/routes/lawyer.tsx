import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Calendar, Check, Clock, Scale, ShieldAlert, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { categoryIcon } from "../lib/category-icons";
import { openCaseCountsFn, type OpenCountsResult } from "../lib/ai/intake.functions";
import { fbAuth } from "../lib/firebase";
import { categoryMatchesSpecialties } from "../lib/db";
import { readLawyerProfile } from "../lib/db";
import { NotificationBell } from "../components/NotificationBell";
import {
  watchMyVerification,
  type VerificationStatus,
} from "../lib/verification-queue";
import { useAppStore } from "../lib/store";
import { useT, translate } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useRequireAuth } from "../lib/require-auth";

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
    if (!user || verStatus === "approved") return;
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
  }, [user, verStatus]);

  useEffect(() => {
    if (!user) return;
    return watchMyVerification(
      user.uid,
      (rec) => {
        setVerStatus(rec?.status ?? null);
        setVerLoaded(true);
        setVerError(false);
      },
      () => setVerError(true),
    );
  }, [user]);
  return (
    <AppShell>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between pt-6"
      >
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-gold">
            JUSTASK · PRO
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
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
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                    {f.category}
                  </span>
                  {f.urgency === urgentLabel && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                      {t("urgent")}
                    </span>
                  )}
                  {f.match === "high" && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                      {t("matchHigh")}
                    </span>
                  )}
                  {f.match === "medium" && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold text-foreground/80">
                      {t("matchMedium")}
                    </span>
                  )}
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

      {/* silence unused var warnings when lang changes */}
      <span hidden>{lang}</span>
    </AppShell>
  );
}
