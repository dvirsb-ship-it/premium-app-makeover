import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Phone, Scale, Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { CaseReferrals } from "../components/CaseReferrals";
import { ConnectionCelebration } from "../components/ConnectionCelebration";
import { useWhatsNewKey } from "../components/CaseWhatsNew";
import { ClientJourney } from "../components/ClientJourney";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";
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
  const { getCase, casesLoaded, casesError } = useAppStore();
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
        setCaseContext(raw?.caseContext ?? "");
        setRecommendation(raw?.recommendation ?? "");
        setChecklist((raw?.clientChecklist as string[] | undefined) ?? []);
      })
      .catch(() => {});
  }, [caseId]);


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
  /* אוברליי החגיגה — רק ברגע הבחירה עצמו, לא בכניסות הבאות לתיק */
  const [celebrating, setCelebrating] = useState<string | null>(null);
  /*
   * "פעולה מובילה לפעולה" (דביר, 25/8): אחרי ששלח פנייה, כפתור
   * "בחרו עורך דין" הצועק סתר את המצב. המפתח מלמד אם יש פנייה חיה —
   * ואז הכפתור מפנה את הבמה לשורות הסטטוס והופך לקישור שקט.
   */
  const whatsNew = useWhatsNewKey(caseId, item?.status ?? "validating");
  const refsInFlight =
    whatsNew === "homeNewSent" ||
    whatsNew === "homeNewCleared" ||
    whatsNew === "homeNewShared" ||
    whatsNew === "homeNewOffer";
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
  /*
   * ═══ רגע התמורה תוקן — 23/8/2026 (ביקורת "שפה אחת") ═══
   *
   * השער הקודם היה `item.interested.find(...)` — מערך של מודל הפיד
   * שאיש כבר לא כותב. התוצאה: אחרי הבחירה הלקוח ראה "עורכי דין
   * שהביעו עניין: 0" במקום שם, "הודעה" ו"התקשרות". פרטי הקשר עצמם
   * (chosenProfile) נטענו כל הזמן — רק השער היה מת.
   */
  const chosen = Boolean(item.chosenLawyerId);

  return (
    <AppShell bare>
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
          {/*
            * שני השלבים החדשים של המתווה (20/8/2026): סיכום שממתין
            * לאישור, ותיק מאושר שממתין לבחירת עורך דין. שניהם CTA
            * יחיד — אלה הרגעים שבהם הפונה הוא זה שפועל.
            */}
          {item.status === "summary_ready" && (
            <Link
              to="/summary/$caseId"
              params={{ caseId: item.id }}
              className="btn-gold mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl text-[14px] font-bold"
            >
              {t("caseSummaryReadyCta")}
            </Link>
          )}
          {item.status === "awaiting_selection" && !refsInFlight && (
            <Link
              to="/choose/$caseId"
              params={{ caseId: item.id }}
              className="btn-gold mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl text-[14px] font-bold"
            >
              {t("caseChooseCta")}
            </Link>
          )}
          {item.status === "awaiting_selection" && refsInFlight && (
            <Link
              to="/choose/$caseId"
              params={{ caseId: item.id }}
              className="liquid-glass mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl text-[13px] font-semibold text-foreground"
            >
              {t("caseChooseMoreCta")}
            </Link>
          )}
          {(item.status === "awaiting_selection" || item.status === "connected") && (
            <CaseReferrals caseId={item.id} status={item.status} onConnected={setCelebrating} />
          )}

          {/* הסרגל הגדול — כל המסע והמיקום בו, גם כאן (23/8/2026) */}
          <div className="mt-5">
            <ClientJourney active={item} />
          </div>

          {/*
            * דלת היציאה — נצבעה מחדש למודל הבחירה (23/8/2026): הייתה
            * מותנית בסטטוסים מתים, כלומר אף תיק חדש לא היה בר-משיכה.
            */}
          {(item.status === "summary_ready" || item.status === "awaiting_selection") && (
            <div className="mt-3">
              {confirmWithdraw ? (
                <div className="rounded-3xl border border-warning-ink/35 bg-warning-ink/[0.08] p-4">
                  <p className="text-[13px] font-bold text-foreground">
                    {t("withdrawConfirmTitle")}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {t("withdrawConfirmBody")}
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
                id="connected-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 scroll-mt-24"
              >
                <div className="liquid-glass rounded-3xl p-5 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-success text-success-foreground shadow-lg shadow-success/30">
                    <Check className="size-6" strokeWidth={3} />
                  </span>
                  <h3 className="mt-3 text-base font-bold text-foreground">
                    {t("connectedWith")} {chosenProfile?.fullName || t("lawyerBadge")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("orDirectContact")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/lawyer-profile/$lawyerId",
                        params: { lawyerId: chosenId! },
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
            ) : null}
          </AnimatePresence>
        </div>

        <ConnectionCelebration
          name={celebrating}
          onClose={() => setCelebrating(null)}
          onView={() => {
            setCelebrating(null);
            requestAnimationFrame(() =>
              document
                .getElementById("connected-panel")
                ?.scrollIntoView({ behavior: "smooth", block: "center" }),
            );
          }}
        />
      </Page>
    </AppShell>
  );
}

