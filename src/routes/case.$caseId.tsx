import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Phone, Scale, Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";
import { OfferComparison } from "../components/OfferComparison";
import { RateLawyerCard } from "../components/RateLawyerCard";
import { useAppStore } from "../lib/store";
import {
  avgRating,
  avgResponseLabel,
  readMyRating,
  watchMilestones,
  type CaseMilestone,
  readCaseLawyerContact,
  readCaseRaw,
  readLawyerStats,
  type LawyerContactDoc,
  removeStuckCase,
  withdrawCase,
} from "../lib/db";
import { BadgeCheck } from "lucide-react";
import { normalizePhone } from "../lib/auth-service";
import { toneClasses, useStatusMeta } from "../lib/status";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { CaseOffer, Lawyer } from "../lib/types";
import { useRequireAuth } from "../lib/require-auth";
import { LAWYER_RATINGS_VISIBLE } from "../lib/limits";
import { CATEGORY_SPECS } from "../lib/specialties";
import { GoldBurst } from "../components/GoldBurst";

export const Route = createFileRoute("/case/$caseId")({
  /* עמוד אישי מאחורי התחברות — אין סיבה שיהיה במנוע חיפוש */
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: CaseDetail,
});

function CaseDetail() {

  useRequireAuth();  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const { getCase, chooseLawyer, casesLoaded, casesError } = useAppStore();
  const [celebrating, setCelebrating] = useState(false);
  const { dir } = useSettings();
  const t = useT();
  const statusMeta = useStatusMeta();
  const item = getCase(caseId);
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  // הבסיס המשפטי מהוולידציה — הלקוח רואה על מה התיק אושר
  const [caseContext, setCaseContext] = useState<string>("");
  // בדחייה: ההמלצה מה כן לעשות
  const [recommendation, setRecommendation] = useState<string>("");
  // רשימת ההכנה שנגזרה מהראיון — התוצר שהלקוח לא קיבל עד היום
  const [checklist, setChecklist] = useState<string[]>([]);
  // ציר הזמן שאחרי החיבור — כדי שלא ישאל "מה קורה עם התיק שלי"
  const [milestones, setMilestones] = useState<CaseMilestone[]>([]);
  /* כשל אינו 'אין התקדמות' — לא מאפסים ציר זמן שכבר נטען */
  useEffect(() => watchMilestones(caseId, setMilestones, () => {}), [caseId]);
  // תמונות המקור — ללקוח בלבד (עו"ד רואה גרסה מצונזרת)
  useEffect(() => {
    void readCaseRaw(caseId)
      .then((raw) => {
        /* מסמכים שנוצרו לפני השינוי נושאים את השם הישן — קריאה עם נפילה
           חזרה, כדי שתיקים קיימים לא יאבדו את הרקע שלהם. */
        setCaseContext(raw?.caseContext ?? raw?.legalBasis ?? "");
        setRecommendation(raw?.recommendation ?? "");
        setChecklist((raw?.clientChecklist as string[] | undefined) ?? []);
      })
      .catch(() => {});
  }, [caseId]);

  /*
   * מדד התגובתיות של כל עו"ד שהביע עניין — הפלטפורמה מדדה אותו בעצמה,
   * ולכן הוא אמת ולא הצהרה שיווקית.
   */
  const interestedIdsKey = item?.interested.map((l) => l.id).join(",") ?? "";
  const [responseLabels, setResponseLabels] = useState<Record<string, string | null>>({});
  /* דירוג אמיתי שהצטבר מלקוחות קודמים — לא המספר המקובע שהיה בקוד */
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number } | null>>({});
  useEffect(() => {
    const ids = interestedIdsKey ? interestedIdsKey.split(",") : [];
    if (!ids.length) return;
    let cancelled = false;
    void Promise.all(
      ids.map(async (id) => {
        const st = await readLawyerStats(id);
        const avg = avgRating(st);
        return [
          id,
          avgResponseLabel(st),
          avg === null ? null : { avg, count: st?.ratings ?? 0 },
        ] as const;
      }),
    ).then((rows) => {
      if (cancelled) return;
      setResponseLabels(Object.fromEntries(rows.map((r) => [r[0], r[1]])));
      setRatings(Object.fromEntries(rows.map((r) => [r[0], r[2]])));
    });
    return () => {
      cancelled = true;
    };
  }, [interestedIdsKey]);

  /*
   * בקשת הדירוג — רק אחרי שעורך הדין סימן שהתיק הסתיים, ורק אם הלקוח
   * טרם דירג. בלי הבדיקה הזו היינו מבקשים ממנו לדרג שוב בכל כניסה.
   */
  const closed = milestones.some((m) => m.key === "closed");
  const [rated, setRated] = useState<boolean | null>(null);
  useEffect(() => {
    if (!closed) return;
    void readMyRating(caseId).then((r) => setRated(r !== null));
  }, [closed, caseId]);

  // פרטי הקשר של עורך הדין הנבחר — נחשפים רק אחרי הבחירה (תת-אוסף מוגן)
  const chosenId = item?.chosenLawyerId;
  const [chosenProfile, setChosenProfile] = useState<LawyerContactDoc | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  /*
   * הקריאה הזו מרוצה מול הכתיבה של הבחירה עצמה, ומפסידה.
   *
   * chooseLawyer מעדכן את המצב המקומי מיד (נכון — המסך חייב להגיב),
   * אבל חוק הגישה לתת-האוסף דורש שהשרת *כבר* ידע מי נבחר. בניסיון
   * יחיד הקריאה נדחית בהרשאות, ה-catch הריק בלע את זה, ו-chosenId לא
   * משתנה שוב — כלומר אין ניסיון נוסף לעולם. התוצאה: בדיוק ברגע החשוב
   * ביותר במסלול הלקוח רואה שם מוסתר, וכפתורי "הודעה" ו"התקשרות"
   * עונים "פרטי הקשר אינם זמינים" עד רענון הדף.
   */
  useEffect(() => {
    if (!chosenId) return;
    let cancelled = false;
    let attempt = 0;
    const read = () => {
      readCaseLawyerContact(caseId, chosenId)
        .then((p) => {
          if (!cancelled) setChosenProfile(p);
        })
        .catch(() => {
          if (cancelled || attempt >= 4) return;
          attempt += 1;
          window.setTimeout(read, attempt * 700);
        });
    };
    read();
    return () => {
      cancelled = true;
    };
  }, [caseId, chosenId]);

  function contactMessage() {
    if (chosenProfile?.phone) {
      const digits = normalizePhone(chosenProfile.phone).replace("+", "");
      window.open(`https://wa.me/${digits}`, "_blank", "noopener");
    } else if (chosenProfile?.email) {
      window.location.href = `mailto:${chosenProfile.email}`;
    } else {
      toast.info(t("contactUnavailable"));
    }
  }

  function contactCall() {
    if (chosenProfile?.phone) {
      window.location.href = `tel:${normalizePhone(chosenProfile.phone)}`;
    } else {
      toast.info(t("contactUnavailable"));
    }
  }

  if (!item && !casesLoaded) {
    /*
     * התיקים עוד בדרך מהשרת. "התיק לא קיים" לפני שהמנוי הראשון חזר
     * היה מוצג לכל מי שפתח קישור ישיר או התראה — למשך כל סבב הרשת.
     */
    return (
      <AppShell>
        <TopBar title="" />
        <div className="flex flex-1 items-center justify-center py-24">
          <div className="liquid-glass h-40 w-full max-w-sm animate-pulse rounded-3xl" aria-hidden />
        </div>
      </AppShell>
    );
  }

  if (!item && casesError) {
    return (
      <AppShell>
        <TopBar title={t("loadFailedTitle")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">{t("loadFailedBody")}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
          >
            {t("retryBtn")}
          </button>
        </div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <TopBar title={t("caseNotFound")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">{t("caseNotExist")}</p>
          <Link
            to="/cases"
            className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
          >
            {t("toMyCases")}
          </Link>
        </div>
      </AppShell>
    );
  }

  /* רבע שעה ב"בבדיקה" — הבדיקה אמורה לקחת פחות מדקה */
  const staleValidating =
    item.status === "validating" && Date.now() - item.createdAt > 15 * 60 * 1000;

  const meta = statusMeta(item.status);
  const chosen = item.interested.find((l) => l.id === item.chosenLawyerId);

  return (
    <AppShell bare>
      {celebrating && <GoldBurst onDone={() => setCelebrating(false)} />}
      <Page className="min-h-screen">
        <TopBar title={t("caseDetailsTitle")} subtitle={item.category} />

        <div className="px-5 pt-6">
          <div className="liquid-glass rounded-3xl p-5">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[meta.tone]}`}
            >
              {meta.label}
            </span>
            <h2 className="mt-3 text-lg font-bold leading-snug text-foreground">
              {item.title || t("homeCaseUntitled")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          {item.status === "validating" && !staleValidating && (
            <div className="liquid-glass mt-3 flex items-start gap-3 rounded-3xl px-4 py-3.5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-gold/12 text-gold">
                <Scale className="size-4.5" strokeWidth={2.2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground">{t("deepCheckRunning")}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {t("deepCheckRunningSub")}
                </p>
              </div>
            </div>
          )}

          {/*
            * בדיקה שלא הסתיימה בזמן סביר — לא מסתירים את זה מאחורי ספינר
            * נצחי. הבדיקה לוקחת פחות מדקה; רבע שעה פירושו שהיא לא רצה,
            * והמשתמש צריך דרך לצאת מזה בעצמו.
            */}
          {/*
            * משיכת הפנייה — רק כשהיא באמת פתוחה. אישור דו-שלבי כמו
            * בסגירת תיק אצל עורך הדין: פעולה שמודיעים עליה לאנשים
            * אחרים לא נעשית בלחיצה אחת.
            */}
          {(item.status === "matching" || item.status === "has_interest") && (
            <div className="mt-3">
              {confirmWithdraw ? (
                <div className="rounded-3xl border border-warning-ink/35 bg-warning-ink/[0.08] p-4">
                  <p className="text-[13px] font-bold text-foreground">
                    {t("withdrawConfirmTitle")}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {item.interested.length > 0
                      ? t("withdrawConfirmBodyInterested")
                      : t("withdrawConfirmBody")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmWithdraw(false)}
                      className="liquid-glass flex-1 rounded-2xl py-3 text-[13.5px] font-semibold text-foreground"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={withdrawing}
                      onClick={() => {
                        setWithdrawing(true);
                        void withdrawCase(item.id)
                          .then(() => navigate({ to: "/cases" }))
                          .catch(() => {
                            setWithdrawing(false);
                            toast.error(t("authErrGeneric"));
                          });
                      }}
                      className="flex-1 rounded-2xl bg-destructive/90 py-3 text-[13.5px] font-bold text-destructive-foreground disabled:opacity-60"
                    >
                      {t("withdrawConfirmBtn")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmWithdraw(true)}
                  className="w-full rounded-2xl py-3 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  {t("withdrawCta")}
                </button>
              )}
            </div>
          )}

          {staleValidating && (
            <div className="mt-3 rounded-3xl border border-warning-ink/35 bg-warning-ink/[0.08] px-4 py-3.5">
              <p className="text-[13px] font-bold text-foreground">{t("staleCheckTitle")}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {t("staleCheckBody")}
              </p>
              {/*
                * שתי דרכים החוצה, ולנסות-שוב היא הראשונה.
                *
                * בדיקה שנתקעה היא כמעט תמיד כשל רגעי — והסיפור שהאדם
                * כבר סיפר שמור בתיק. להציע רק "הסרה" פירושו לבקש ממנו
                * לספר הכל מחדש בגלל תקלה שלנו.
                */}
              <button
                type="button"
                disabled={retrying}
                onClick={() => {
                  setRetrying(true);
                  try {
                    sessionStorage.setItem("justask-active-case", item.id);
                  } catch {
                    /* ignore */
                  }
                  navigate({ to: "/validating" });
                }}
                className="btn-gold mt-3 w-full rounded-2xl py-3 text-[14px] font-bold disabled:opacity-60"
              >
                {t("staleCheckRetry")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void removeStuckCase(item.id)
                    .then(() => navigate({ to: "/cases" }))
                    .catch(() => toast.error(t("authErrGeneric")));
                }}
                className="mt-2 w-full rounded-2xl py-2.5 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                {t("staleCheckRemove")}
              </button>
            </div>
          )}

          {item.status !== "validating" && item.status !== "rejected" && caseContext && (
            <div className="liquid-glass mt-3 flex items-start gap-3 rounded-3xl px-4 py-3.5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                <BadgeCheck className="size-4.5" strokeWidth={2.2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground">{t("caseValidatedChip")}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  {caseContext}
                </p>
              </div>
            </div>
          )}

          {item.status === "rejected" && (
            <div className="liquid-glass mt-3 rounded-3xl p-4">
              <p className="text-[13px] font-bold text-foreground">{t("intakeNotSuitableTitle")}</p>
              {caseContext && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {caseContext}
                </p>
              )}
              {recommendation && (
                <div className="mt-3 rounded-2xl bg-gold/8 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gold">
                    {t("intakeNotSuitableRec")}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">
                    {recommendation}
                  </p>
                </div>
              )}
            </div>
          )}

          {milestones.length > 0 && (
            <div className="liquid-glass mt-3 rounded-3xl p-5">
              <p className="text-[13px] font-bold text-foreground">{t("timelineHeader")}</p>
              <ol className="mt-3 space-y-3">
                {milestones.map((m) => (
                  <li key={m.key} className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-foreground">
                        {t(`ms_${m.key}` as never)}
                      </p>
                      {m.note && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          {m.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                        {new Date(m.at).toLocaleDateString(dir === "rtl" ? "he-IL" : "en-GB")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* התיק נסגר — הרגע היחיד שבו יש טעם לשאול איך היה */}
          {closed && rated === false && (
            <RateLawyerCard caseId={caseId} onDone={() => setRated(true)} />
          )}
          {closed && rated === true && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-gold">
              <Check className="size-3.5" strokeWidth={3} />
              {t("rateDone")}
            </p>
          )}

          {checklist.length > 0 && item.status !== "rejected" && (
            <div className="liquid-glass mt-3 rounded-3xl p-4">
              <p className="text-[13px] font-bold text-foreground">{t("checklistHeader")}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {t("checklistSub")}
              </p>
              <ul className="mt-3 space-y-2">
                {checklist.map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                    <span className="text-[13px] leading-relaxed text-foreground/90">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AnimatePresence mode="wait">
            {chosen ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="liquid-glass rounded-3xl p-5 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-success text-success-foreground shadow-lg shadow-success/30">
                    <Check className="size-6" strokeWidth={3} />
                  </span>
                  <h3 className="mt-3 text-base font-bold text-foreground">
                    {t("connectedWith")} {chosenProfile?.fullName || chosen.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("orDirectContact")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/lawyer-profile/$lawyerId",
                        params: { lawyerId: chosen.id },
                      })
                    }
                    className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
                  >
                    {t("viewFullProfile")}
                    <Arrow className="size-4" />
                  </button>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={contactMessage}
                      className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                    >
                      <MessageCircle className="size-4 text-gold" />
                      {t("messageAction")}
                    </button>
                    <button
                      type="button"
                      onClick={contactCall}
                      className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                    >
                      <Phone className="size-4 text-gold" />
                      {t("callAction")}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : item.status === "rejected" ? (
              // תיק שנדחה לא יגיע לעורכי דין — הבטחת "נעדכן אותך" כאן היא שקר
              <motion.div key="rejected-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
            ) : (
              <motion.div
                key="choose"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    {t("lawyersInterestedHeader")}
                  </h3>
                  <span className="text-sm font-bold text-gold">
                    {item.interested.length}
                  </span>
                </div>

                {item.interested.length === 0 ? (
                  /*
                   * "נעדכן אותך ברגע שמישהו יביע עניין" מניח שיש מי שיביע.
                   * כשאף עורך דין מאומת לא מכסה את התחום, ההמתנה היא
                   * לתור שלא קיים — ועדיף להגיד את זה מאשר להשתיק.
                   */
                  item.notifiedLawyers === 0 ? (
                    <div className="rounded-3xl border border-gold/30 bg-gold/[0.06] p-6 text-center">
                      <p className="text-[14px] font-bold text-foreground">
                        {t("noLawyersYetTitle")}
                      </p>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                        {t("noLawyersYetSub")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
                        {t("noInterestYet")}
                      </div>
                      {/*
                        * מי רואה את הפנייה — גילוי יזום, בזמן ההמתנה.
                        *
                        * שקלנו כאן יומן צפיות ("N עורכי דין צפו בתיק"), וזנחנו
                        * אותו: הוא היה מחייב לתעד כל גלישה של כל עורך דין —
                        * מאגר מעקב חדש שנבנה כדי **לדווח** על חשיפה בלי
                        * להקטין אותה. גילוי מפורש עושה את אותה עבודה בלי
                        * לאסוף דבר, וזה גם מה שהלקוח באמת רוצה לדעת: לא כמה
                        * הציצו, אלא מה מותר להם לעשות עם מה שראו.
                        */}
                      {typeof item.notifiedLawyers === "number" && (
                        <div className="note-gold mt-3 rounded-3xl">
                          <p className="text-[13px] font-bold text-foreground">
                            <span className="mark-gold">{t("whoSeesTitle")}</span>
                          </p>
                          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
                            <li>
                              {t("whoSeesCount").replace(
                                "{n}",
                                String(item.notifiedLawyers),
                              )}
                            </li>
                            <li>{t("whoSeesConfidential")}</li>
                            <li>{t("whoSeesDocs")}</li>
                            <li>{t("whoSeesContact")}</li>
                          </ul>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <>
                  <OfferComparison interested={item.interested} offers={item.offers} />
                  <Stagger className="space-y-4">
                    {item.interested.map((l) => (
                      <Rise key={l.id}>
                        <LawyerChoiceCard
                          lawyer={l}
                          offer={item.offers?.[l.id]}
                          responseLabel={responseLabels[l.id]}
                          rating={ratings[l.id]}
                          caseCategory={item.category}
                          onChoose={() => {
                            /*
                             * הרגע היחיד שבו שני צדדים באמת נפגשים —
                             * ועד עכשיו עבר בשקט. זהב-לבן, לא צבעוני:
                             * הרגש הוא הקלה, לא מסיבה.
                             */
                            chooseLawyer(item.id, l.id);
                            setCelebrating(true);
                          }}
                        />
                      </Rise>
                    ))}
                  </Stagger>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Page>
    </AppShell>
  );
}

/**
 * שלוש עובדות התאמה, כל אחת נכונה או לא — בלי ממוצע ובלי אחוז.
 *
 * מוצגות רק כשהן חיוביות: תג "לא מדבר את שפתך" על כרטיס של אדם
 * שהתנדב לעזור לך הוא עלבון, וגם מידע שאפשר להסיק מהיעדר התג.
 * עורך דין בלי שפות מוגדרות נחשב דובר עברית — ברירת המחדל של השוק,
 * ולכן גם הפירוש הבטוח לפרופילים ישנים שנשמרו לפני שהשדה נוסף.
 */
function FitFacts({
  lawyer,
  caseCategory,
}: {
  lawyer: Lawyer;
  caseCategory?: string;
}) {
  const t = useT();
  /* "שפתי" בצד הלקוח היא פשוט השפה שבה הוא מסתכל על המסך עכשיו */
  const { lang: clientLang } = useSettings();
  const facts: string[] = [];

  const specs = caseCategory ? (CATEGORY_SPECS[caseCategory] ?? []) : [];
  if (specs.length && lawyer.specialties?.some((s) => (specs as readonly string[]).includes(s))) {
    facts.push(t("fitField"));
  }

  const langs = lawyer.languages?.length ? lawyer.languages : ["he"];
  const lang = clientLang || "he";
  /* עברית מול דובר עברית אינה עובדה — היא ברירת המחדל */
  if (lang !== "he" && langs.includes(lang)) facts.push(t("fitLanguage"));

  if (lawyer.city) facts.push(lawyer.city);

  if (!facts.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {facts.map((f) => (
        <span
          key={f}
          className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
        >
          {f}
        </span>
      ))}
    </div>
  );
}

function LawyerChoiceCard({
  lawyer,
  offer,
  responseLabel,
  rating,
  caseCategory,
  onChoose,
}: {
  lawyer: Lawyer;
  offer?: CaseOffer;
  /** קטגוריית התיק — כדי לומר "עוסק בתחום שלך" ולא לנחש */
  caseCategory?: string;
  /** מדד תגובתיות שהפלטפורמה מדדה — לא הצהרה של עורך הדין */
  responseLabel?: string | null;
  /** ממוצע דירוגי לקוחות. null כשעדיין אין — ואז מוצג תג האימות במקום. */
  rating?: { avg: number; count: number } | null;
  onChoose: () => void;
}) {
  const t = useT();
  return (
    <div className="liquid-glass rounded-3xl p-5">
      <div className="flex items-start gap-3">
        {/* ראשי התיבות של עורך הדין — זהות, ולכן דיו */}
        <span className="chip-navy grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black">
          {lawyer.initials}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-bold leading-tight text-foreground">
            {lawyer.name}
          </h4>
          <p className="truncate text-xs text-muted-foreground">{lawyer.firm}</p>
          {/*
            * דירוג מוצג רק כשהוא קיים. "★ 0 (0)" אינו נקרא כ"אין נתונים"
            * אלא כ"עורך דין גרוע", והוא היה מופיע על *כל* עורך דין עד
            * שיצטבר דירוג ראשון — כלומר על כולם, בכל הפעמים הראשונות.
            */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {LAWYER_RATINGS_VISIBLE && rating ? (
              <>
                <span className="flex items-center gap-0.5 font-bold text-foreground">
                  <Star className="size-3.5 fill-gold text-gold" />
                  {rating.avg.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({rating.count} {t("ratingCount")})
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-gold">
                <BadgeCheck className="size-3.5" strokeWidth={2.4} />
                {t("verifiedLawyerChipShort")}
              </span>
            )}
            {lawyer.years > 0 && (
              <span className="text-muted-foreground">
                {lawyer.years} {t("yearsExperience")}
              </span>
            )}
          </div>
        </div>
      </div>
      {/*
        * עובדות התאמה — בלי ציון, ובכוונה.
        *
        * הכרטיס הראה עד כה ותק ודירוג: כמה **טוב** עורך הדין. הוא לא
        * אמר מילה על כמה הוא **מתאים לי** — האם הוא מדבר את שפתי, האם
        * התחום שלי הוא שלו, והאם הוא בעיר שלי. אלה השאלות שאדם שואל
        * כשהוא בוחר, והן היו חסרות לגמרי.
        *
        * שלוש עובדות שהלקוח יכול לאמת בעצמו — לא ציון מצטבר שאומר לו
        * מי עדיף. מי שרוצה עורך דין מנוסה יותר מרחוק, זו זכותו.
        */}
      <FitFacts lawyer={lawyer} caseCategory={caseCategory} />
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {lawyer.blurb}
      </p>
      {offer && (offer.amount > 0 || offer.fee) && (
        <div className="mt-3 rounded-2xl border border-gold/25 bg-gold/[0.06] p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
            {t("offerHeader")}
          </p>

          {/* המספר הגדול — מה שמשווים */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground" dir="ltr">
              {offer.model === "contingency"
                ? `${offer.amount}%`
                : `\u20aa${offer.amount.toLocaleString("he-IL")}`}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">
              {t(
                offer.model === "contingency"
                  ? offer.postSuitPercent || offer.judgmentPercent
                    ? "offerOfAwardPreSuit"
                    : "offerOfAward"
                  : offer.model === "hourly"
                    ? "offerPerHour"
                    : "offerFixedTotal",
              )}
              {offer.vat ? ` \u00b7 ${t(offer.vat === "plus" ? "offerVatPlus" : "offerVatIncluded")}` : ""}
            </span>
          </div>

          {/*
            * \u05d4\u05de\u05e9\u05e4\u05d8 \u05d4\u05e4\u05e9\u05d5\u05d8 \u2014 \u05d4\u05de\u05e9\u05de\u05e2\u05d5\u05ea \u05dc\u05e4\u05e0\u05d9 \u05d4\u05de\u05db\u05e0\u05d9\u05e7\u05d4. "13%" \u05d0\u05d5\u05de\u05e8 \u05d0\u05d9\u05da \u05de\u05d7\u05e9\u05d1\u05d9\u05dd;
            * "\u05de\u05e9\u05dc\u05de\u05d9\u05dd \u05e8\u05e7 \u05d0\u05dd \u05de\u05e7\u05d1\u05dc\u05d9\u05dd \u05e4\u05d9\u05e6\u05d5\u05d9" \u05d0\u05d5\u05de\u05e8 \u05de\u05d4 \u05de\u05e1\u05db\u05e0\u05d9\u05dd. \u05d4\u05d4\u05e1\u05d1\u05e8 \u05d4\u05d5\u05dc\u05da \u05dc\u05e4\u05d9
            * \u05de\u05d5\u05d3\u05dc \u05d4\u05e9\u05db\u05e8 \u05d5\u05dc\u05d0 \u05dc\u05e4\u05d9 \u05ea\u05d7\u05d5\u05dd \u05d4\u05ea\u05d9\u05e7, \u05d5\u05dc\u05db\u05df \u05e9\u05dc\u05d5\u05e9\u05d4 \u05de\u05e9\u05e4\u05d8\u05d9\u05dd \u05de\u05db\u05e1\u05d9\u05dd \u05d0\u05ea \u05db\u05dc
            * 21 \u05d4\u05ea\u05d7\u05d5\u05de\u05d9\u05dd \u05d1\u05d4\u05d2\u05d3\u05e8\u05d4.
            */}
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            {t(
              offer.model === "contingency"
                ? "offerPlainContingency"
                : offer.model === "hourly"
                  ? "offerPlainHourly"
                  : "offerPlainFixed",
            )}
          </p>

          {/* המדרגות — האחוז עולה עם שלב ההליך, כמו בהסכמי שכר טרחה אמיתיים */}
          {offer.model === "contingency" && (offer.postSuitPercent || offer.judgmentPercent) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {offer.postSuitPercent ? (
                <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {t("offerStagePostSuit")}: <span dir="ltr">{offer.postSuitPercent}%</span>
                </span>
              ) : null}
              {offer.judgmentPercent ? (
                <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {t("offerStageJudgment")}: <span dir="ltr">{offer.judgmentPercent}%</span>
                </span>
              ) : null}
            </div>
          )}

          {/* מקדמה שמתקזזת — חלק מהמחיר, לא הפתעה בפגישה הראשונה */}
          {offer.retainer ? (
            <p className="mt-1.5 text-[12px] text-foreground">
              <span className="text-muted-foreground">{t("offerRetainerLabel")}: </span>
              <span className="font-bold" dir="ltr">₪{offer.retainer.toLocaleString("he-IL")}</span>
              <span className="text-muted-foreground"> · {t("offerRetainerHint")}</span>
            </p>
          ) : null}

          {responseLabel && (
            <p className="mt-1.5 text-[12px] text-foreground">
              <span className="text-muted-foreground">{t("responseTimeLabel")} </span>
              <span className="font-bold">{responseLabel}</span>
              <span className="text-muted-foreground"> {t("responseTimeAvg")}</span>
            </p>
          )}

          {offer.noWinNoFee && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success-ink">
              <Check className="size-3" strokeWidth={3} />
              {t("offerNoWinBadge")}
            </p>
          )}

          {/* ההוצאות הנלוות — הפער שבו לקוחות נכווים */}
          <div className="mt-2.5 border-t border-gold/15 pt-2.5">
            <p className="text-[12px] text-foreground">
              <span className="text-muted-foreground">{t("offerExpensesShort")}: </span>
              <span className="font-bold">
                {t(
                  offer.expenses === "included"
                    ? "expensesIncluded"
                    : offer.expenses === "advanced"
                      ? "expensesAdvanced"
                      : "expensesClient",
                )}
              </span>
              {offer.expensesEstimate ? ` \u00b7 ${offer.expensesEstimate}` : ""}
            </p>
            {offer.duration && (
              <p className="mt-1 text-[12px] text-foreground">
                <span className="text-muted-foreground">{t("offerDurationShort")}: </span>
                <span className="font-bold">{offer.duration}</span>
              </p>
            )}
          </div>

          {offer.note && (
            <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
              {"\u05f4"}{offer.note}{"\u05f4"}
            </p>
          )}

          <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground/80">
            {t("offerNonBindingShort")}
          </p>
        </div>
      )}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onChoose}
        className="btn-gold mt-4 w-full rounded-2xl py-3 text-sm font-bold"
      >
        {t("chooseThisLawyer")}
      </motion.button>
    </div>
  );
}
