import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BadgeCheck, Check, Flag, Languages, MapPin, MessageCircle, Phone, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { LANG_NAMES, type Lang } from "../lib/settings";
import { FREE_CONNECTIONS, trialState } from "../lib/trial";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useT, translate } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import {
  caseImageUrl,
  categoryHasStatutoryCap,
  categoryForbidsContingency,
  markMilestone,
  reconcileClosedCase,
  readCaseMemo,
  watchMilestones,
  MILESTONE_ORDER,
  type CaseMilestone,
  type MilestoneKey,
  PLTD_MAX_PERCENT,
  readCaseRaw,
  submitAppeal,
  type CaseImage,
  type ExpensesTerm,
  type FeeModel,
  readLawyerStats,
} from "../lib/db";
import { normalizePhone } from "../lib/auth-service";
import {
  watchMyVerification,
  type VerificationStatus,
} from "../lib/verification-queue";

const offerInputCls =
  "block w-full rounded-2xl border border-white/10 bg-foreground/[0.04] px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-gold/50";

export const Route = createFileRoute("/lawyer-case/$caseId")({
  /* עמוד אישי מאחורי התחברות — אין סיבה שיהיה במנוע חיפוש */
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: LawyerCaseDetail,
});

type ConnectedCase = {
  title: string;
  category: string;
  summary: string;
  clientContact?: { name: string; phone: string; email: string };
};

function LawyerCaseDetail() {

  useRequireAuth();  const { caseId } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const { getFeedCase, expressInterest, user } = useAppStore();
  const t = useT();
  const item = getFeedCase(caseId);
  const urgentSeed = translate("urgent", "he");

  /*
   * סטטוס האימות — הבעת עניין פתוחה רק לעו"ד מאושר (נאכף גם בחוקי השרת).
   *
   * "טרם נטען" אינו "לא מאושר". בלי ההפרדה הזו כל פתיחה של תיק הציגה
   * לרגע לעורך דין *מאושר* את החסימה עם כפתור "השלימו אימות", ואם
   * הקריאה נכשלה (רשת, הרשאות) הוא נשאר חסום לכל הסשן — כלומר לא יכול
   * להביע עניין באף תיק. המסך התאום lawyer.tsx כבר פתר בדיוק את זה.
   */
  const [verStatus, setVerStatus] = useState<VerificationStatus | null>(null);
  const [verLoaded, setVerLoaded] = useState(false);
  const [verError, setVerError] = useState(false);
  /* מתי אושר האימות — ממנו נגזרת תקופת המייסדים (חצי שנה חינם) */
  const [approvedAt, setApprovedAt] = useState<number | null>(null);
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
      () => {
        setVerError(true);
        setVerLoaded(true);
      },
    );
  }, [user]);

  /*
   * מכסת הניסיון — שלושת החיבורים הראשונים חינם.
   *
   * החסימה כאן היא על *הבעת עניין בתיק חדש*, ובכוונה לא על תיק קיים:
   * מי שכבר מטפל בלקוח ימשיך לטפל בו במלואו לנצח. אף פעם לא מחזיקים
   * תיק חי של אדם כבן ערובה עד שעורך דין ישלם.
   */
  const [connections, setConnections] = useState<number | null>(null);
  useEffect(() => {
    if (!user) return;
    void readLawyerStats(user.uid)
      .then((st) => setConnections(st?.connections ?? 0))
      .catch(() => setConnections(0));
  }, [user]);
  const trial = trialState({
    connections: connections ?? 0,
    approvedAt,
  });

  // תמונות התיק: עד החיבור — הגרסה המצונזרת בלבד; אחרי החיבור — המקור
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [imgOriginals, setImgOriginals] = useState(false);

  // תיק שכבר חובר אליי לא מופיע בפיד — נטען ישירות כדי להציג את פרטי הלקוח
  const [connected, setConnected] = useState<ConnectedCase | null>(null);
  /*
   * "עוד טוען" ו"לא קיים" הם שני מצבים שונים. תיק מחובר אינו בפיד,
   * ולכן item ריק בכל פתיחה — עד עכשיו המסך הציג "הפנייה לא קיימת"
   * למשך זמן הקריאה (הבהוב מובטח בכל כניסה מהתיקים הפעילים), ואם
   * הקריאה נכשלה — לתמיד, בלי להבדיל בין תקלה למחיקה.
   */
  const [directLoad, setDirectLoad] = useState<"loading" | "done" | "failed">("loading");
  useEffect(() => {
    if (item || !user) return;
    setDirectLoad("loading");
    void readCaseRaw(caseId)
      .then(async (raw) => {
        if (raw && raw.chosenLawyerId === user.uid) {
          setConnected({
            title: raw.title,
            category: raw.category,
            summary: raw.summary,
            clientContact: raw.clientContact,
          });
          const imgs = (raw.images ?? []) as CaseImage[];
          const urls = await Promise.all(
            imgs.map((im) => caseImageUrl(im.origPath).catch(() => "")),
          );
          setImgUrls(urls.filter(Boolean));
          setImgOriginals(true);
        }
        setDirectLoad("done");
      })
      .catch(() => setDirectLoad("failed"));
  }, [item, user, caseId]);

  // פרטי הוולידציה המלאים — הבסיס המשפטי, תאריך, נזק ותיעוד
  const [details, setDetails] = useState<{
    legalBasis?: string;
    incidentDate?: string;
    damageType?: string;
    hasDocumentation?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!item) return;
    void readCaseRaw(caseId)
      .then(async (raw) => {
        if (raw) {
          setDetails({
            legalBasis: raw.legalBasis,
            incidentDate: raw.incidentDate,
            damageType: raw.damageType,
            hasDocumentation: raw.hasDocumentation,
          });
          // עד החיבור נטענת הגרסה המצונזרת בלבד — המקור חסום בחוקי Storage
          const imgs = (raw.images ?? []) as CaseImage[];
          const urls = await Promise.all(
            imgs.map((im) => caseImageUrl(im.censPath).catch(() => "")),
          );
          setImgUrls(urls.filter(Boolean));
        }
      })
      .catch(() => {});
  }, [item, caseId]);

  // טופס ההצעה שנשלחת עם הבעת העניין — מובנה, כדי שהלקוח יוכל להשוות
  const [offerOpen, setOfferOpen] = useState(false);
  const [model, setModel] = useState<FeeModel>("contingency");
  const [amount, setAmount] = useState("");
  /*
   * אחוז מדורג — השפה של הסכמי שכר טרחה בנזקי גוף: מדרגה לפשרה מוקדמת,
   * מדרגה משהוגשה תביעה, מדרגה לפסק דין. לא כופים: עורך דין שעובד עם
   * אחוז אחיד פשוט לא פותח את זה.
   */
  const [staged, setStaged] = useState(false);
  const [postSuit, setPostSuit] = useState("");
  const [judgment, setJudgment] = useState("");
  /* מקדמה שמתקזזת — מקובלת בשעתי ובגלובלי */
  const [retainer, setRetainer] = useState("");
  /* "+ מע"מ" היא ברירת המחדל כי כך השוק מדבר */
  const [vat, setVat] = useState<"plus" | "included">("plus");
  const [noWin, setNoWin] = useState(true);
  const [expenses, setExpenses] = useState<ExpensesTerm>("advanced");
  const [expensesEstimate, setExpensesEstimate] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  /*
   * ניגוד עניינים — מאופס בכוונה בכל תיק ותיק.
   *
   * זה state של הרכיב, כלומר הוא נולד false בכל כניסה למסך של תיק אחר.
   * "זוכר" היה הופך את הבדיקה לטקס שנעשה פעם אחת ומסומן לנצח, וזו בדיוק
   * ההפך מהכוונה: הניגוד תלוי בצדדים של **התיק הזה**.
   */
  const [noConflict, setNoConflict] = useState(false);

  /*
   * בתביעות פלת"ד שכר הטרחה מוגבל בכללי לשכת עורכי הדין. הקטגוריה "נזיקין
   * ותאונות" כוללת גם תיקים שאינם תאונת דרכים, ולכן זו אזהרה ולא חסימה —
   * עורך הדין הוא שיודע אם התיק שלו כפוף לתקרה.
   */
  const maxPercent = Math.max(
    Number(amount) || 0,
    staged ? Number(postSuit) || 0 : 0,
    staged ? Number(judgment) || 0 : 0,
  );
  const capWarning =
    model === "contingency" &&
    maxPercent > PLTD_MAX_PERCENT &&
    categoryHasStatutoryCap(item?.category ?? "");

  /*
   * החלפת מודל מאפסת את המספרים.
   *
   * בלי זה "15" שנכתב כאחוזים נשאר "15" אחרי מעבר לסכום קבוע — כלומר
   * הצעה של ₪15 לטיפול בתיק, בלי שום סימן על המסך שמשהו השתנה. אלה
   * יחידות שונות לגמרי, ולכן הערך הישן אינו "ברירת מחדל נוחה" אלא
   * מספר שגוי. אותו דבר בכיוון ההפוך: ₪8,000 שהופכים ל-8000%.
   */
  function switchModel(next: FeeModel) {
    if (next === model) return;
    setModel(next);
    setAmount("");
    setStaged(false);
    setPostSuit("");
    setJudgment("");
    setRetainer("");
  }

  /*
   * אחוז מעל 100 אינו "יקר" — הוא בלתי אפשרי: אי אפשר לקחת יותר מהפיצוי
   * כולו. בניגוד לתקרת הפלת"ד, שהיא כלל משפטי שחל על חלק מהתיקים
   * ולכן מקבל אזהרה, כאן זו טעות הקלדה (18 שהפך ל-180) והשליחה נחסמת.
   */
  const impossiblePercent = model === "contingency" && maxPercent > 100;

  /*
   * מדורג שנשאר חצי-מלא הוא הצעה זולה יותר ממה שהוקלד.
   *
   * ברגע שמסמנים "מדורג", התווית של שדה הסכום הופכת ל"עד פשרה לפני
   * הגשת תביעה" — כלומר 8 שנכתב שם אומר "8% רק בפשרה מוקדמת". אבל אם
   * שתי המדרגות נשארות ריקות, מה שנשמר הוא אחוז אחיד של 8, ואצל הלקוח
   * זה נקרא "8% מהפיצוי" עד פסק דין. עורך הדין מחויב להצעה נמוכה
   * מזו שהתכוון לה, בלי שום סימן על המסך.
   */
  const stagedIncomplete =
    model === "contingency" &&
    staged &&
    !(Number(postSuit) > 0 && Number(judgment) > 0);

  /* בעניין פלילי שכר מותנה בתוצאות אסור בדין — האופציה לא מוצגת כלל */
  const noContingency = categoryForbidsContingency(item?.category ?? "");
  useEffect(() => {
    if (noContingency && model === "contingency") setModel("fixed");
  }, [noContingency, model]);

  /*
   * אבני דרך — הלקוח מקבל התראה על כל סימון, וזה גם הנתון שעליו יתבסס
   * החיוב פר-חיבור. עד היום לא היה לפלטפורמה שום מושג אם חיבור הבשיל.
   */
  const [milestones, setMilestones] = useState<CaseMilestone[]>([]);
  const [msNote, setMsNote] = useState("");
  /* כשל אינו 'אין התקדמות' — לא מאפסים ציר זמן שכבר נטען */
  useEffect(() => watchMilestones(caseId, setMilestones, () => {}), [caseId]);
  const marked = new Set(milestones.map((m) => m.key));

  /*
   * ריפוי עצמי לתיקים שנתקעו: אבן הדרך האחרונה סומנה, אבל עדכון הסטטוס
   * נכשל בשקט (לפני שהוסר ה-catch שבלע אותו) והתיק המשיך להופיע כפעיל.
   * במקום תיקון ידני במסד, הפתיחה הבאה של התיק סוגרת אותו.
   */
  useEffect(() => {
    if (!marked.has("closed")) return;
    void reconcileClosedCase(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, milestones.length]);

  /*
   * סימון אבן דרך הוא חד-כיווני: החוקים אוסרים עדכון ומחיקה, ואין
   * פונקציית ביטול בשום מקום. עבור "closed" זה אומר שלחיצה אחת מוטעית
   * סוגרת תיק חי — הוא יורד מהרשימה הפעילה, הלקוח מקבל "התיק הסתיים",
   * וגם תיקון ידני במסד יבוטל כי reconcileClosedCase כותב שוב closed
   * בכל פתיחה. לכן דווקא הסגירה מקבלת אישור.
   */
  const [confirmClose, setConfirmClose] = useState(false);

  function mark(key: MilestoneKey) {
    if (key === "closed" && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    setConfirmClose(false);
    void markMilestone(caseId, key, msNote)
      .then(() => {
        setMsNote("");
        toast.success(t("msMarked"));
      })
      .catch(() => toast.error(t("authErrGeneric")));
  }

  // התזכיר המשפטי המלא — עבודת המשפטן שה-AI כתב, נחסך מעורך הדין
  const [memo, setMemo] = useState<string | null>(null);
  const [memoOpen, setMemoOpen] = useState(false);
  useEffect(() => {
    if (!item) return;
    void readCaseMemo(caseId).then(setMemo).catch(() => {});
  }, [item, caseId]);

  // ערעור על הוולידציה
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSent, setAppealSent] = useState(false);

  function sendAppeal() {
    const reason = appealReason.trim();
    if (!reason || !user || !item) return;
    void submitAppeal({
      caseId: item.id,
      caseTitle: item.title,
      lawyerId: user.uid,
      lawyerName: user.displayName || "עורך דין",
      reason,
    })
      .then(() => {
        setAppealSent(true);
        setAppealOpen(false);
        toast.success(t("appealSentMsg"));
      })
      .catch(() => toast.error(t("authErrGeneric")));
  }

  function damageLabel(v?: string) {
    if (v === "financial") return t("damageFinancial");
    if (v === "both") return t("damageBoth");
    return t("damageBody");
  }

  if (!item && connected) {
    const c = connected.clientContact;
    return (
      <AppShell bare>
        <Page className="flex min-h-screen flex-col">
          <TopBar title={t("leadDetailsTitle")} subtitle={connected.category} />
          <div className="flex-1 px-5 pt-6">
            <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success">
              {t("connectedWithLawyer")}
            </span>
            <h2 className="mt-4 text-xl font-black leading-snug text-foreground">
              {connected.title}
            </h2>
            <div className="liquid-glass mt-6 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-foreground">{t("caseDescriptionHeader")}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {connected.summary}
              </p>
            </div>

            {/*
              * אין תמונות = אין הרשאה, לא תקלה.
              *
              * מאז שחוקי ה-Storage צומצמו למי שהביע עניין בתיק הזה,
              * `imgUrls` חוזר ריק לעורך דין שטרם הביע עניין. בלי ההסבר
              * הזה החלק הזה פשוט נעלם מהמסך, והוא היה נראה כמו תיק בלי
              * תיעוד — כלומר מידע שגוי על התיק.
              */}
            {imgUrls.length === 0 && details?.hasDocumentation && (
              <div className="liquid-glass mt-4 rounded-3xl border border-gold/20 p-4">
                <p className="text-[13px] font-bold text-foreground">
                  {t("imagesAfterInterest")}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                  {t("imagesAfterInterestWhy")}
                </p>
              </div>
            )}

            {imgUrls.length > 0 && (
              <div className="liquid-glass mt-4 rounded-3xl p-4">
                <p className="text-[13px] font-bold text-foreground">{t("lawyerImagesHeader")}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {imgOriginals ? t("lawyerImagesOriginalsNote") : t("lawyerImagesNote")}
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {imgUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={url} alt="" className="h-24 w-24 rounded-2xl border border-border object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-foreground">{t("timelineLawyerHeader")}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("timelineLawyerSub")}
              </p>
              <input
                className={`${offerInputCls} mt-3`}
                value={msNote}
                onChange={(e) => setMsNote(e.target.value)}
                placeholder={t("msNotePh")}
              />
              {confirmClose && (
                <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-foreground">
                  {t("msCloseWarning")}
                </p>
              )}
              <div className="mt-3 space-y-2">
                {MILESTONE_ORDER.map((k) => {
                  const done = marked.has(k);
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-foreground/[0.04] px-3.5 py-2.5"
                    >
                      <span className="flex-1 text-[13px] font-semibold text-foreground">
                        {t(`ms_${k}` as never)}
                      </span>
                      {done ? (
                        <span className="rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success">
                          {t("msMarked")}
                        </span>
                      ) : k === "closed" && confirmClose ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmClose(false)}
                            className="rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-bold text-muted-foreground transition active:scale-95"
                          >
                            {t("cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => mark(k)}
                            className="rounded-full bg-destructive/20 px-3 py-1 text-[11px] font-bold text-destructive transition active:scale-95"
                          >
                            {t("msCloseConfirm")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => mark(k)}
                          className="rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-gold transition active:scale-95"
                        >
                          {t("msMarkBtn")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-gold" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-foreground">{t("clientContactHeader")}</h3>
              </div>
              <p className="mt-2 text-[15px] font-semibold text-foreground">
                {c?.name || "—"}
              </p>
              {c?.phone && (
                <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
                  {c.phone}
                </p>
              )}
              {c?.email && (
                <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
                  {c.email}
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (c?.phone) {
                      const digits = normalizePhone(c.phone).replace("+", "");
                      window.open(`https://wa.me/${digits}`, "_blank", "noopener");
                    } else if (c?.email) {
                      window.location.href = `mailto:${c.email}`;
                    }
                  }}
                  className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                >
                  <MessageCircle className="size-4 text-gold" />
                  {t("messageAction")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (c?.phone) window.location.href = `tel:${normalizePhone(c.phone)}`;
                  }}
                  className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                >
                  <Phone className="size-4 text-gold" />
                  {t("callAction")}
                </button>
              </div>
            </div>
          </div>
        </Page>
      </AppShell>
    );
  }

  if (!item && directLoad !== "done") {
    /* עדיין לא יודעים אם התיק קיים — שלד או שגיאה, לא "לא קיים" */
    return (
      <AppShell>
        <TopBar title={directLoad === "failed" ? t("loadFailedTitle") : ""} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          {directLoad === "failed" ? (
            <>
              <p className="text-muted-foreground">{t("loadFailedBody")}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
              >
                {t("retryBtn")}
              </button>
            </>
          ) : (
            <div className="liquid-glass h-40 w-full max-w-sm animate-pulse rounded-3xl" aria-hidden />
          )}
        </div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <TopBar title={t("leadNotFound")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">{t("leadNotExist")}</p>
          <Link
            to="/lawyer"
            className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
          >
            {t("toLeadsList")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const canExpress = verStatus === "approved" && trial.canExpressInterest;

  return (
    <AppShell bare>
      <Page className="flex min-h-screen flex-col">
        <TopBar title={t("leadDetailsTitle")} subtitle={item.category} />

        <div className="flex-1 px-5 pt-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
              {item.category}
            </span>
            {item.urgency === urgentSeed && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold text-destructive">
                {t("urgent")}
              </span>
            )}
            {/*
              * שפת הלקוח — כאן היא תמיד מוצגת, גם עברית. בפיד היא רעש
              * על כל כרטיס; במסך שממנו שולחים הצעה היא חלק מההחלטה אם
              * לקחת את התיק, ולכן צריכה להיות מפורשת ולא מוסקת.
              */}
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                item.langMismatch
                  ? "bg-warning-ink/12 text-warning-ink"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <Languages className="size-3.5" strokeWidth={2.4} />
              {LANG_NAMES[(item.clientLang || "he") as Lang] ?? item.clientLang}
            </span>
          </div>
          {item.langMismatch && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-warning-ink">
              {t("feedLangMismatchNote")}
            </p>
          )}

          {/*
            * פירוט המד — כל סיבה היא משפט שאפשר להגיד בקול. זו ההוכחה
            * החיה שהדירוג מבוסס כללים ולא תשלום: אין כאן שום דבר
            * שלא כתוב על המסך.
            *
            * האחוז עצמו ירד מכאן ומהכרטיס ב-6/8/2026. הוא הוסיף שכבה
            * של שיפוט מעל עובדות שכבר עמדו בפני עצמן — "התאמה 100%"
            * אומר לעורך הדין מה לחשוב, "התחום המרכזי שלך · באותה עיר"
            * נותן לו את מה שצריך כדי לחשוב בעצמו. הציון נשאר בקוד
            * וממיין את הפיד; הוא פשוט אינו נטען עוד כמסקנה.
            */}
          {(item.matchReasons ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {(item.matchReasons ?? []).map((r) => (
                <span
                  key={r}
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    r === "reasonLangGap"
                      ? "bg-warning-ink/12 text-warning-ink"
                      : "bg-foreground/[0.06] text-muted-foreground"
                  }`}
                >
                  {t(r as never)}
                </span>
              ))}
            </div>
          )}

          <h2 className="mt-4 text-xl font-black leading-snug text-foreground">
            {item.title}
          </h2>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-gold" />
              {item.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-gold" />
              {item.interestedCount} {t("interestedSuffix")}
            </span>
            <span>{item.postedAgo}</span>
          </div>

          <div className="liquid-glass mt-6 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-foreground">{t("caseDescriptionHeader")}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          {details && (details.legalBasis || details.incidentDate) && (
            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-gold" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-foreground">{t("whyApprovedHeader")}</h3>
              </div>
              {details.legalBasis && (
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {details.legalBasis}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("incidentDateLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground" dir="ltr">{details.incidentDate || "—"}</dd>
                </div>
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("damageTypeLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground">{damageLabel(details.damageType)}</dd>
                </div>
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("documentationLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground">{details.hasDocumentation ? t("docYes") : t("docNo")}</dd>
                </div>
              </dl>
            </div>
          )}

          {memo && (
            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <button
                type="button"
                onClick={() => setMemoOpen((v) => !v)}
                className="flex w-full items-center gap-2 text-start"
              >
                <Scale className="size-4 shrink-0 text-gold" strokeWidth={2.2} />
                <span className="flex-1 text-sm font-bold text-foreground">{t("memoHeader")}</span>
                <span className="text-[11px] font-semibold text-gold">
                  {memoOpen ? t("memoHide") : t("memoShow")}
                </span>
              </button>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("memoSub")}
              </p>
              {memoOpen && (
                <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-[13px] leading-relaxed text-foreground/90">
                  {memo}
                </p>
              )}
            </div>
          )}

          {imgUrls.length > 0 && (
            <div className="liquid-glass mt-4 rounded-3xl p-4">
              <p className="text-[13px] font-bold text-foreground">{t("lawyerImagesHeader")}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {t("lawyerImagesNote")}
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {imgUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img src={url} alt="" className="h-24 w-24 rounded-2xl border border-border object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/8 px-4 py-3 text-xs leading-relaxed text-foreground">
            <Scale className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{t("interestNotice")}</span>
          </div>

          {/* ערעור על הוולידציה — הוולידציה הכפולה של קהילת עורכי הדין */}
          {!appealSent && (
            <div className="mt-3 pb-2">
              {appealOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="liquid-glass rounded-2xl p-4"
                >
                  <p className="text-[13px] font-bold text-foreground">{t("appealLink")}</p>
                  <textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    rows={3}
                    placeholder={t("appealPlaceholder")}
                    className={`${offerInputCls} mt-2 resize-none`}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={sendAppeal}
                      disabled={!appealReason.trim()}
                      className="btn-gold flex-1 rounded-2xl py-2.5 text-[13px] font-bold disabled:opacity-40"
                    >
                      {t("appealSend")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppealOpen(false)}
                      className="liquid-glass flex-1 rounded-2xl py-2.5 text-[13px] font-semibold text-foreground"
                    >
                      {t("cancelAction")}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAppealOpen(true)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <Flag className="size-3.5" strokeWidth={2.2} />
                  {t("appealLink")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-[var(--nav-inset)] border-t border-border/60 bg-background/90 px-5 py-5 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {item.expressed ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-success/12 py-4 text-sm font-bold text-success"
              >
                <Check className="size-5" strokeWidth={3} />
                {t("interestSent")}
              </motion.div>
            ) : canExpress && offerOpen ? (
              <motion.div
                key="offer"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass max-h-[60vh] space-y-2.5 overflow-y-auto rounded-3xl p-4"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-gold" strokeWidth={2.2} />
                  <p className="text-[13px] font-bold text-foreground">{t("offerTitle")}</p>
                </div>

                {/* מודל שכר הטרחה — בנזקי גוף אחוזים מהפיצוי הם הנפוץ */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">
                    {t("offerModelLabel")}
                  </span>
                  <div className={`grid gap-1.5 ${noContingency ? "grid-cols-2" : "grid-cols-3"}`}>
                    {((noContingency
                      ? ["hourly", "fixed"]
                      : ["contingency", "hourly", "fixed"]) as FeeModel[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => switchModel(m)}
                        className={`rounded-2xl border px-2 py-2.5 text-[12px] font-bold transition ${
                          model === m
                            ? "border-gold/60 bg-gold/15 text-gold"
                            : "border-white/10 bg-foreground/[0.04] text-muted-foreground"
                        }`}
                      >
                        {t(m === "contingency" ? "feeContingency" : m === "hourly" ? "feeHourly" : "feeFixed")}
                      </button>
                    ))}
                  </div>
                  {noContingency && (
                    <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-muted-foreground">
                      {t("offerNoContingencyCriminal")}
                    </p>
                  )}
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">
                    {t(
                      model === "contingency"
                        ? staged
                          ? "offerStagePreSuit"
                          : "offerPercentLabel"
                        : model === "hourly"
                          ? "offerHourlyLabel"
                          : "offerFixedLabel",
                    )}
                  </span>
                  <div className="relative">
                    <input
                      className={offerInputCls}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={model === "contingency" ? "12" : model === "hourly" ? "600" : "8000"}
                    />
                    <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">
                      {model === "contingency" ? "%" : "\u20aa"}
                    </span>
                  </div>
                </label>

                {/* אחוז מדורג לפי שלב — כך הסכמי שכר טרחה כתובים באמת */}
                {model === "contingency" && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setStaged((v) => !v)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-foreground/[0.04] p-3 text-start"
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
                          staged ? "border-gold bg-gold text-background" : "border-white/25"
                        }`}
                      >
                        {staged && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="text-[12px] font-semibold text-foreground">
                        {t("offerStagedToggle")}
                      </span>
                    </button>
                    {staged && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <label className="block">
                          <span className="mb-1 block text-[10.5px] font-semibold text-foreground/70">
                            {t("offerStagePostSuit")}
                          </span>
                          <div className="relative">
                            <input
                              className={offerInputCls}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              value={postSuit}
                              onChange={(e) => setPostSuit(e.target.value)}
                              placeholder="15"
                            />
                            <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">%</span>
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10.5px] font-semibold text-foreground/70">
                            {t("offerStageJudgment")}
                          </span>
                          <div className="relative">
                            <input
                              className={offerInputCls}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              value={judgment}
                              onChange={(e) => setJudgment(e.target.value)}
                              placeholder="18"
                            />
                            <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">%</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* מקדמה — רק היכן שהיא חלק מהשפה: שעתי וגלובלי */}
                {model !== "contingency" && (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-foreground/80">
                      {t("offerRetainerLabel")}
                    </span>
                    <div className="relative">
                      <input
                        className={offerInputCls}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={retainer}
                        onChange={(e) => setRetainer(e.target.value)}
                        placeholder="2000"
                      />
                      <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-[13px] font-bold text-muted-foreground">{"\u20aa"}</span>
                    </div>
                    <p className="mt-1 px-1 text-[10.5px] text-muted-foreground">{t("offerRetainerHint")}</p>
                  </label>
                )}

                {/* השוק אומר "+ מע\u05f4מ" בעל-פה — ההצעה אומרת זאת בכתב */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">
                    {t("offerVatLabel")}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["plus", "included"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVat(v)}
                        className={`rounded-2xl border px-2 py-2.5 text-[11px] font-bold leading-tight transition ${
                          vat === v
                            ? "border-gold/60 bg-gold/15 text-gold"
                            : "border-white/10 bg-foreground/[0.04] text-muted-foreground"
                        }`}
                      >
                        {t(v === "plus" ? "offerVatPlus" : "offerVatIncluded")}
                      </button>
                    ))}
                  </div>
                </div>

                {stagedIncomplete && (
                  <p className="px-1 text-[11px] leading-relaxed text-warning-ink">
                    {t("offerStagedIncomplete")}
                  </p>
                )}

                {impossiblePercent && (
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
                    <Scale className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p className="text-[11px] leading-relaxed text-foreground">{t("offerImpossiblePercent")}</p>
                  </div>
                )}

                {/* התקרה בפלת"ד היא חובה שבדין — מזהירים, לא חוסמים */}
                {capWarning && (
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
                    <Scale className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p className="text-[11px] leading-relaxed text-foreground">{t("offerCapWarning")}</p>
                  </div>
                )}

                {model === "contingency" && (
                  <button
                    type="button"
                    onClick={() => setNoWin((v) => !v)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-foreground/[0.04] p-3 text-start"
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
                        noWin ? "border-gold bg-gold text-background" : "border-white/25"
                      }`}
                    >
                      {noWin && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="text-[12px] font-semibold text-foreground">{t("offerNoWinLabel")}</span>
                  </button>
                )}

                {/* ההוצאות הנלוות — כאן לקוחות נכווים, ולכן זה שדה נפרד */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">
                    {t("offerExpensesLabel")}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["included", "advanced", "client"] as ExpensesTerm[]).map((x) => (
                      <button
                        key={x}
                        type="button"
                        onClick={() => setExpenses(x)}
                        className={`rounded-2xl border px-2 py-2.5 text-[11px] font-bold leading-tight transition ${
                          expenses === x
                            ? "border-gold/60 bg-gold/15 text-gold"
                            : "border-white/10 bg-foreground/[0.04] text-muted-foreground"
                        }`}
                      >
                        {t(x === "included" ? "expensesIncluded" : x === "advanced" ? "expensesAdvanced" : "expensesClient")}
                      </button>
                    ))}
                  </div>
                  {expenses !== "included" && (
                    <input
                      className={`${offerInputCls} mt-2`}
                      value={expensesEstimate}
                      onChange={(e) => setExpensesEstimate(e.target.value)}
                      placeholder={t("offerExpensesPh")}
                    />
                  )}
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerDurationLabel")}</span>
                  <input
                    className={offerInputCls}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder={t("offerDurationPh")}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerNoteLabel")}</span>
                  <textarea
                    className={`${offerInputCls} resize-none`}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("offerNotePh")}
                  />
                </label>

                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                  {t("offerNonBinding")}
                </p>

                {/*
                  * ניגוד עניינים — נבדק לפני ההגשה ולא אחריה.
                  *
                  * זו הנקודה שעורך הדין כבר התחייב עליה בהרשמה (סעיף 4
                  * בהתחייבות המקצועית); כאן המוצר מבקש אותה בפועל, על
                  * התיק הספציפי. התחייבות כללית שאין לה רגע יישום היא
                  * הצהרה, לא מנגנון.
                  *
                  * **הבדיקה עליו ולא עלינו, וזה אינו פער אלא הכרח:**
                  * אנחנו לא יודעים מי הצדדים בתיקים שלו, והדרך היחידה
                  * לדעת הייתה לבקש ממנו את רשימת הלקוחות שלו — כלומר
                  * לפגוע בסודיות כדי להגן עליה.
                  */}
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gold/30 bg-gold/[0.05] p-3.5">
                  <input
                    type="checkbox"
                    checked={noConflict}
                    onChange={(e) => setNoConflict(e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 accent-[oklch(0.52_0.115_80)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-foreground">
                      {t("conflictAgree")}
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-muted-foreground">
                      {t("conflictBody")}
                    </span>
                    <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground/80">
                      {t("conflictWhy")}
                    </span>
                  </span>
                </label>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={
                    !noConflict ||
                    !(Number(amount) > 0) ||
                    impossiblePercent ||
                    stagedIncomplete
                  }
                  onClick={() => {
                    expressInterest(item.id, {
                      model,
                      amount: Number(amount),
                      noConflict,
                      noWinNoFee: model === "contingency" ? noWin : false,
                      expenses,
                      expensesEstimate: expenses === "included" ? "" : expensesEstimate.trim(),
                      duration: duration.trim(),
                      note: note.trim(),
                      vat,
                      ...(model === "contingency" && staged && Number(postSuit) > 0
                        ? { postSuitPercent: Number(postSuit) }
                        : {}),
                      ...(model === "contingency" && staged && Number(judgment) > 0
                        ? { judgmentPercent: Number(judgment) }
                        : {}),
                      ...(model !== "contingency" && Number(retainer) > 0
                        ? { retainer: Number(retainer) }
                        : {}),
                    });
                    window.setTimeout(() => router.history.back(), 900);
                  }}
                  className="btn-gold w-full rounded-2xl py-3.5 text-[15px] font-bold disabled:opacity-40"
                >
                  {t("offerSend")}
                </motion.button>
              </motion.div>
            ) : verStatus === "approved" && trial.exhausted ? (
              /*
               * הניסיון נגמר — והקיר עולה כאן, לפני לקיחת לקוח חדש,
               * ולא ברגע שלקוח בחר. עורך דין לעולם אינו משלם אגרה על
               * אדם ספציפי; הוא מצטרף כדי להמשיך לקבל פניות.
               */
              <motion.div
                key="trial-over"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] p-4"
              >
                <p className="text-[14px] font-black text-[#0F172A]">
                  {t("trialOverTitle").replace("{n}", String(FREE_CONNECTIONS))}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#0F172A]/75">
                  {t("trialOverBody")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/lawyer-subscription" })}
                  className="mt-3 w-full rounded-xl bg-[#0F172A] py-3 text-[14px] font-bold text-white transition active:scale-[0.98]"
                >
                  {t("trialOverCta")}
                </button>
              </motion.div>
            ) : !verLoaded ? (
              /* עוד לא יודעים — שלד, לא חסימה. חסימה שגויה עולה יותר מהמתנה. */
              <motion.div
                key="ver-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="liquid-glass h-[58px] w-full rounded-2xl"
                aria-hidden
              />
            ) : canExpress ? (
              <motion.button
                key="express"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOfferOpen(true)}
                className="btn-gold w-full rounded-2xl py-4 text-base font-bold"
              >
                {t("imInterested")}
              </motion.button>
            ) : (
              <motion.div
                key="locked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <ShieldCheck className="size-4.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">
                    {t("interestLockedTitle")}
                  </p>
                  {verError ? (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {t("interestLockedUnknown")}
                    </p>
                  ) : verStatus === "pending" ? (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {t("interestLockedPending")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/lawyer-onboarding" })}
                      className="mt-0.5 text-[12px] font-bold text-gold underline-offset-2 hover:underline"
                    >
                      {t("interestLockedCta")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Page>
    </AppShell>
  );
}
