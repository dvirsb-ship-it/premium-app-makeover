import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import type { ChatMessage } from "../lib/types";
import { useRequireAuth } from "../lib/require-auth";
import { haptic } from "../lib/haptics";
import { useAppStore } from "../lib/store";
import {
  intakeTurn,
  type IntakeNotSuitable,
  type IntakeReady,
} from "../lib/ai/intake.functions";
import { createCase } from "../lib/db";
import { identify, initAnalytics, track } from "../lib/analytics";
import { fbAuth } from "../lib/firebase";
import { Scale } from "lucide-react";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/intake")({
  /* עמוד אישי מאחורי התחברות — אין סיבה שיהיה במנוע חיפוש */
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: Intake,
});

function Intake() {

  useRequireAuth();  const navigate = useNavigate();
  const t = useT();
  const { dir, lang } = useSettings();
  const { user } = useAppStore();

  /*
   * מדידת המשפך שלפני התיק — מי פתח, מי כתב, מי הגיע להכרעה, מי שלח.
   * בלי זה תיק שלא נוצר הוא בלתי נראה לגמרי, וזה רוב האנשים בשלב השקה.
   */
  const firstMsgSent = useRef(false);
  useEffect(() => {
    if (!user) return;
    identify(user.uid);
    initAnalytics();
    track("intake_opened");
  }, [user]);

  const openers: ChatMessage[] = useMemo(
    () => [
      { id: "a1", from: "assistant", text: t("opener1") },
      { id: "a2", from: "assistant", text: t("opener2") },
    ],
    [t],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(openers);
  const [input, setInput] = useState("");
  const DRAFT_KEY = "justask-intake-draft";
  // טיוטה נועדה להציל שיחה שנקטעה, לא להחזיר שיחה שהסתיימה
  const DRAFT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const [notSuitable, setNotSuitable] = useState<IntakeNotSuitable | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /*
   * עצירה לפני הגשה בלי תיעוד.
   *
   * לא חסימה — יש מקרים אמיתיים בלי שום תיעוד, ואדם שנפגע ואין לו
   * צילום לא צריך לגלות שהדלת נעולה. אבל רגע של עצירה עם עובדה אחת
   * ("עורך הדין רואה אם צירפת") הוא ההבדל בין תיק דל לתיק שאפשר
   * לעבוד איתו. אותו דפוס בדיוק כמו אישור סגירת תיק אצל עורך הדין.
   */
  const [confirmNoDocs, setConfirmNoDocs] = useState(false);
  /*
   * הבקשה המפורשת לקבל הצעות — חוסמת את השליחה (12/8/2026).
   *
   * לא נשמרת בטיוטה בכוונה: אם אדם חזר למסך יום אחרי, הוא צריך לבקש
   * שוב. אישור שנשמר מהפעם הקודמת אינו בקשה, הוא זיכרון.
   */
  const [requestedOffers, setRequestedOffers] = useState(false);
  /*
   * "התחלת שיחה חדשה" מוחק את כל מה שהפונה סיפר, והוא יושב ברוחב מלא
   * ישירות מעל שדה הקלט — בדיוק איפה שאגודל נוח. דביר איבד כך שיחה
   * שלמה ב-6/8/2026, באמצע ראיון.
   *
   * כאן זה חמור במיוחד: אדם שסיפר על פגיעה גופנית ומאבד את הסיפור
   * צריך לספר אותו שוב מההתחלה. לחיצה שנייה, לא דיאלוג — הכפתור
   * מתחמש ל-5 שניות ואז חוזר לעצמו.
   */
  const [restartArmed, setRestartArmed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readyData = useRef<IntakeReady | null>(null);

  function pushAssistant(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, from: "assistant", text },
    ]);
  }

  useEffect(() => {
    const scripted: Record<string, string> = {
      a1: t("opener1"),
      a2: t("opener2"),
    };
    setMessages((prev) =>
      prev.map((m) =>
        m.from === "assistant" && scripted[m.id]
          ? { ...m, text: scripted[m.id] }
          : m,
      ),
    );
  }, [t]);

  /*
   * טיוטה נטושה: מישהו מספר סיפור כואב וסוגר את הדפדפן. לאבד לו את זה
   * זו חוסר התחשבות, לא באג — לכן השיחה נשמרת מקומית ומשוחזרת.
   */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        at?: number;
        messages?: ChatMessage[];
        step?: number;
        ready?: IntakeReady | null;
        notSuitable?: IntakeNotSuitable | null;
      };
      const stale = !saved.at || Date.now() - saved.at > DRAFT_MAX_AGE_MS;
      if (stale || !Array.isArray(saved.messages)) {
        clearDraft();
        return;
      }
      // טיוטות מלפני 12/8 נשאו תמונות; הן נזרקות בשחזור
      if (saved.messages.length > openers.length) {
        setMessages(saved.messages.map((m) => ({ ...m, images: undefined })));
        /*
         * המצב המלא, לא רק התמליל. בלי זה מי שהגיע ל"מוכן להגשה", סגר
         * את הדפדפן וחזר — ראה את כל השיחה אבל בלי כפתור ההגשה ועם
         * סרגל התקדמות מאופס, ונאלץ להקליד עוד הודעה רק כדי להחזיר
         * אותו. הסיכום שה-AI כבר כתב הוא חלק מהטיוטה.
         */
        if (typeof saved.step === "number") setStep(saved.step);
        if (saved.ready) {
          readyData.current = saved.ready;
          setReady(true);
        }
        if (saved.notSuitable) setNotSuitable(saved.notSuitable);
      }
    } catch {
      clearDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (messages.length > openers.length) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            at: Date.now(),
            messages,
            step,
            ready: ready ? readyData.current : null,
            notSuitable,
          }),
        );
      }
    } catch {
      /* ignore */
    }
  }, [messages, openers.length, step, ready, notSuitable]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  /*
   * באג ידוע של ספארי ב-iOS: אחרי סגירת המקלדת ה-visual viewport נשאר
   * מוזח. אלמנטים בתחתית (כפתור "שליחה לבדיקת התאמה") מצוירים במקום
   * הנכון, אבל אזור המגע שלהם נשאר איפה שהיה כשהמקלדת הייתה פתוחה —
   * הקשה עליהם לא עושה כלום, ופתיחה מחדש של המקלדת "מתקנת" את זה.
   * זה בדיוק מה שדווח: הכפתור עבד רק אחרי שהמקלדת יצאה.
   *
   * התיקון: כשה-viewport גדל חזרה (המקלדת נסגרה) מאפסים את הגלילה של
   * החלון — העמוד עצמו ממילא אינו גליל (הגלילה פנימית), כך שאין תזוזה
   * נראית; זה רק מכריח את ספארי לסנכרן מחדש את מפת המגע.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let lastHeight = vv.height;
    const onResize = () => {
      const keyboardClosed = vv.height > lastHeight + 50;
      lastHeight = vv.height;
      if (keyboardClosed) {
        requestAnimationFrame(() => window.scrollTo(0, 0));
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // ארבעה פרטים נאספים בשיחה: תיאור, תאריך, סוג נזק, תיעוד
  const totalSteps = 3;
  const progress = Math.min(step, totalSteps);

  async function send() {
    const text = input.trim();
    if (!text || typing) return;

    if (!firstMsgSent.current) {
      firstMsgSent.current = true;
      track("intake_first_message");
    }

    // תשובה אחרי סיכום — המשתמש מתקן/מוסיף, ההכרעה נפתחת מחדש
    if (ready || notSuitable) {
      setReady(false);
      setNotSuitable(null);
      readyData.current = null;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text,
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setTyping(true);
    haptic("light");

    try {
      const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
      const res = await intakeTurn({
        data: {
          messages: history.map((m) => ({
            from: m.from,
            text: [m.text, m.aiNote].filter(Boolean).join("\n"),
          })),
          idToken,
        },
      });
      setTyping(false);
      if (res.reply) {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, from: "assistant", text: res.reply },
        ]);
      }
      if (res.ready) {
        readyData.current = res.ready;
        setReady(true);
        track("intake_ready");
      }
      if (res.notSuitable) {
        setNotSuitable(res.notSuitable);
        track("intake_not_suitable");
      }

      setStep((s) => s + 1);
    } catch {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, from: "assistant", text: t("intakeError") },
      ]);
      // מחזירים את ההודעה למגירה כדי שאפשר יהיה לשלוח שוב
      setInput(text);
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    }
  }

  async function submit() {
    const noDocs =
      (readyData.current?.documents?.length ?? 0) === 0 &&
      !readyData.current?.has_documentation;
    if (noDocs && !confirmNoDocs) {
      setConfirmNoDocs(true);
      return;
    }
    // בלי הבקשה המפורשת אין תיק — הכפתור חסום ממילא, וזו החגורה השנייה
    if (!requestedOffers) return;
    if (submitting) return;
    const uid = user?.uid;
    if (!uid) {
      navigate({ to: "/auth" });
      return;
    }
    const data = readyData.current;
    const description =
      data?.description ||
      messages.filter((m) => m.from === "user").map((m) => m.text).join("\n");
    setSubmitting(true);
    try {
      track("intake_submitted");
      const caseId = await createCase({
        clientId: uid,
        description,
        // השפה שבה הראיון נערך בפועל — לא הצהרה, אלא מה שקרה
        clientLang: lang,
        incidentDate: data?.incident_date,
        damageType: data?.damage_type,
        /*
         * נגזר מהרשימה ולא נשאל בנפרד. הבוליאני נשאר בשדה כי מסכי
         * הלקוח ועורך הדין נשענים עליו, אבל **מקורו אחד** — מה שהפונה
         * הצהיר שקיים אצלו.
         */
        documents: data?.documents ?? [],
        hasDocumentation: (data?.documents?.length ?? 0) > 0 || !!data?.has_documentation,
        city: data?.city,
      });
      try {
        sessionStorage.setItem("justask-active-case", caseId);
      } catch {
        /* ignore */
      }
      clearDraft();

      navigate({ to: "/validating" });
    } catch {
      setSubmitting(false);
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, from: "assistant", text: t("intakeError") },
      ]);
    }
  }

  return (
    <AppShell bare>
      <div className="relative flex min-h-screen flex-col">
        {/*
          * מקור אור אחד, מלמעלה (9/8/2026).
          *
          * כאן ישבו שלוש הילות — זהב למעלה, כחול משמאל-למטה וזהב מימין-למטה
          * — **מעל** שתי ההילות ש-AppShell כבר מצייר. חמישה מקורות אור על
          * מסך אחד, ולכן במצב בהיר נראה כחול משמאל וקרם מימין באותו גובה.
          * זה לא נקרא כחדר מואר אלא כתקלת רינדור, וזה מה שהרס את הרקע
          * שמתחת לטקסט של ה-AI.
          *
          * אור בחלל אמיתי מגיע מכיוון אחד. השוויתי שלוש אפשרויות בדפדפן:
          * בלי הילות מקומיות המסך נקי אבל קר וקליני מדי לשיחה שאדם פותח
          * אחרי שנפגע; זהב אחד מלמעלה נותן חום בלי ללכלך את השטח שמתחתיו.
          *
          * ההילות התחתונות לא הוחלפו במשהו — הן פשוט מיותרות. ל-AppShell
          * כבר יש כחול מלמטה, והן רק הכפילו אותו במקום אחר.
          */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div className="absolute -top-32 left-1/2 hidden h-72 w-72 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl dark:block" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <TopBar
            title={t("intakeTitle")}
            subtitle={t("intakeSubtitle")}
            right={
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                <ShieldCheck className="size-3" />
                {t("secureBadge")}
              </span>
            }
          />

          {/* Elegant step progress */}
          <div className="px-5 pt-4">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps + 1 }).map((_, i) => {
                const done = i < progress;
                const current = i === progress && !ready;
                return (
                  <motion.span
                    key={i}
                    initial={false}
                    animate={{
                      width: current ? 28 : 14,
                      opacity: done || current ? 1 : 0.35,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className={
                      "h-1 rounded-full " +
                      (done || ready
                        ? "bg-gradient-to-r from-gold to-[#B8912B]"
                        : current
                          ? "bg-gold/80"
                          : "bg-foreground/15")
                    }
                  />
                );
              })}
              {/*
                * dir=ltr הכרחי: "1 / 4" הוא זוג מספרים עם מפריד ניטרלי,
                * ובפסקה RTL אלגוריתם הדו-כיווניות הופך את סדרם — על המסך
                * זה נקרא "4 / 1", כלומר שלב 4 מתוך 1. דביר תפס את זה
                * בצילום מהטלפון.
                */}
              <span
                dir="ltr"
                className="ms-auto text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                {ready ? "✓" : `${Math.min(progress + 1, totalSteps + 1)} / ${totalSteps + 1}`}
              </span>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 pb-6 pt-6"
          >
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                    delay: i === messages.length - 1 ? 0 : 0,
                  }}
                  className={
                    m.from === "assistant"
                      ? "flex flex-col items-start gap-2"
                      : "flex justify-end"
                  }
                >
                  {m.from === "assistant" && (
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      <Sparkles className="size-3 text-gold" />
                      JustAsk AI
                    </div>
                  )}
                  <div
                    className={
                      m.from === "assistant"
                        ? "max-w-[92%] text-[15px] leading-relaxed text-foreground"
                        : /*
                           * `bubble-user`: בבהיר — דיו נייבי מלא (חפץ, לא
                           * זכוכית); בכהה — הזכוכית עם קצה הזהב, בלי שינוי.
                           * שני המצבים מוגדרים ב-styles.css תחת חוקי החומרים.
                           */
                          "bubble-user liquid-glass max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-luxe " +
                          (dir === "rtl"
                            ? "rounded-br-lg"
                            : "rounded-bl-lg")
                    }
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}

              {typing && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-start gap-2"
                >
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    <Sparkles className="size-3 text-gold" />
                    JustAsk AI
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-gold"
                        animate={{
                          y: [0, -4, 0],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/*
            * רציף הכתיבה — משטח משלו, לא המשך של השיחה (9/8/2026).
            *
            * קודם ישבה כאן דהייה `to-background`, כלומר אל צבע הרקע **השטוח**.
            * אבל הרקע כאן אינו שטוח: המסך הזה מצייר שלוש הילות משלו — זהב
            * למעלה, כחול משמאל-למטה וזהב מימין-למטה — ולכן הדהייה נחתה על
            * אפור אחיד בזמן שהעמוד סביבה מגוון, ונוצר פס בצבע שלא שייך לאף
            * אחד מהם. זה נראה כמו תקלה כי זו הייתה תקלה.
            *
            * הפתרון הוא לא דהייה מדויקת יותר אלא **להפסיק לדהות**: מילוי אטום
            * מדרגה אחת מתחת לעמוד, וקו שיער מעליו. הפרדה שמוצהרת קוראת
            * כהחלטה; הפרדה שמנסה להיעלם ולא מצליחה קוראת כשבר.
            *
            * `--workspace` ולא צבע קבוע — אותו טוקן של אזור העבודה בדאשבורד,
            * ולכן הוא מתהפך נכון: כהה מהעמוד במצב בהיר, בהיר ממנו במצב כהה.
            */}
          <div className="workspace sticky bottom-0 border-t border-border px-5 pb-6 pt-4 [box-shadow:0_-12px_28px_-24px_oklch(var(--sh)_/_0.5)]">
            <AnimatePresence>
              {notSuitable && (
                <motion.div
                  key="notsuitable"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="liquid-glass mb-3 rounded-3xl p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                      <Scale className="size-4" strokeWidth={2.2} />
                    </span>
                    <p className="text-[13px] font-bold text-foreground">
                      {t("intakeNotSuitableTitle")}
                    </p>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {notSuitable.reason}
                  </p>
                  <div className="mt-3 rounded-2xl bg-gold/8 px-3.5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gold">
                      {t("intakeNotSuitableRec")}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground/90">
                      {notSuitable.recommendation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft();
                      navigate({ to: "/" });
                    }}
                    className="liquid-glass mt-3 w-full rounded-2xl py-2.5 text-[13px] font-semibold text-foreground transition active:scale-[0.98]"
                  >
                    {t("valGoCases")}
                  </button>
                </motion.div>
              )}

              {ready && !notSuitable && confirmNoDocs && (
                <motion.div
                  key="nodocs"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 rounded-2xl border border-gold/40 bg-gold/[0.08] p-4"
                >
                  <p className="text-[13.5px] font-bold text-foreground">
                    {t("noDocsTitle")}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {t("noDocsBody")}
                  </p>
                </motion.div>
              )}

              {/*
                * הבקשה המפורשת — תיבה משלה, ברגע שלפני השליחה.
                *
                * **לא** מוטמעת בתנאי השימוש בכוונה. ההבדל בין "אישרתי
                * תקנון" לבין "ביקשתי הצעות" הוא בדיוק מה שיישאל, ותיבה
                * שיושבת לבד ברגע הנכון היא הראיה לכך שהיא נקראה.
                */}
              {ready && !notSuitable && (
                <motion.label
                  key="offers-request"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="note-gold mb-3 flex cursor-pointer items-start gap-3 rounded-2xl"
                >
                  <input
                    type="checkbox"
                    checked={requestedOffers}
                    onChange={(e) => setRequestedOffers(e.target.checked)}
                    className="mt-0.5 size-[18px] shrink-0 accent-[var(--gold-ink)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-bold leading-relaxed text-foreground">
                      {t("offersRequestLabel")}
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-muted-foreground">
                      {t("offersRequestWhy")}
                    </span>
                  </span>
                </motion.label>
              )}

              {ready && !notSuitable && (
                <motion.button
                  key="submit"
                  type="button"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  onClick={submit}
                  disabled={submitting || !requestedOffers}
                  className="btn-gold relative mb-3 w-full overflow-hidden rounded-2xl py-4 text-base font-bold disabled:opacity-60"
                >
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      repeatDelay: 1.2,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="relative">
                    {confirmNoDocs ? t("noDocsSendAnyway") : t("submitForMatch")}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* דרך יזומה להתחיל מחדש — בלי זה שיחה שנתקעה נשארת לנצח */}
            {messages.length > 2 && !ready && !notSuitable && (
              <button
                type="button"
                onClick={() => {
                  if (!restartArmed) {
                    setRestartArmed(true);
                    window.setTimeout(() => setRestartArmed(false), 5000);
                    return;
                  }
                  track("intake_restarted");
                  clearDraft();
                  setMessages(openers);
                  setStep(0);
                  setInput("");
                  firstMsgSent.current = false;
                  setRestartArmed(false);
                }}
                className={cn(
                  "mb-2 w-full py-1 text-center text-[12px] font-semibold transition",
                  restartArmed ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {restartArmed ? t("intakeRestartConfirm") : t("intakeRestart")}
              </button>
            )}

            <motion.div
              key="composer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="liquid-glass flex items-end gap-2 rounded-[28px] p-1.5 pe-2 ps-2 shadow-luxe"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={ready || notSuitable ? t("composerFixPlaceholder") : t("composerPlaceholder")}
                className="max-h-32 flex-1 resize-none bg-transparent py-3 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={send}
                disabled={!input.trim()}
                className="chip-gold grid size-11 shrink-0 place-items-center self-end rounded-full transition disabled:opacity-40 disabled:shadow-none"
                aria-label={t("sendAria")}
              >
                <ArrowUp className="size-5" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
