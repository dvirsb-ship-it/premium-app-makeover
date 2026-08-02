import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import type { ChatMessage } from "../lib/types";
import { useRequireAuth } from "../lib/require-auth";
import { haptic } from "../lib/haptics";
import { useAppStore } from "../lib/store";
import {
  detectSensitiveRegionsFn,
  intakeTurn,
  type IntakeNotSuitable,
  type IntakeReady,
} from "../lib/ai/intake.functions";
import { createCase, uploadCaseImages } from "../lib/db";
import { identify, initAnalytics, track } from "../lib/analytics";
import { fbAuth } from "../lib/firebase";
import { censorImage, prepareImage, type PendingImage } from "../lib/image-censor";
import { Scale } from "lucide-react";

export const Route = createFileRoute("/intake")({
  /* עמוד אישי מאחורי התחברות — אין סיבה שיהיה במנוע חיפוש */
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: Intake,
});

function Intake() {

  useRequireAuth();  const navigate = useNavigate();
  const t = useT();
  const { dir } = useSettings();
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
  // תמונות שממתינות לצירוף להודעה הבאה
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  // כל התמונות שכבר נשלחו בשיחה — הן שיעלו ל-Storage כשייווצר התיק
  const sentImages = useRef<PendingImage[]>([]);
  const [censoring, setCensoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readyData = useRef<IntakeReady | null>(null);

  const MAX_IMAGES = 3;

  async function attachImages(files: FileList | null) {
    if (!files?.length || censoring) return;
    const used = pendingImages.length + sentImages.current.length;
    const room = MAX_IMAGES - used;
    if (room <= 0) {
      pushAssistant(t("imageLimitMsg"));
      return;
    }
    setCensoring(true);
    try {
      const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
      for (const file of Array.from(files).slice(0, room)) {
        const prepared = await prepareImage(file);
        const { regions, description } = await detectSensitiveRegionsFn({
          data: { imageBase64: prepared.base64, mimeType: "image/jpeg", idToken },
        });
        const censBlob = await censorImage(prepared, regions);
        const img: PendingImage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          origBlob: prepared.origBlob,
          censBlob,
          previewUrl: URL.createObjectURL(censBlob),
          regionCount: regions.length,
          description,
        };
        setPendingImages((prev) => [...prev, img]);
        haptic("success");
      }
    } catch {
      pushAssistant(t("imageCensorFailed"));
    } finally {
      setCensoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(id: string) {
    setPendingImages((prev) => {
      const img = prev.find((p) => p.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

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
      const saved = JSON.parse(raw) as { at?: number; messages?: ChatMessage[] };
      const stale = !saved.at || Date.now() - saved.at > DRAFT_MAX_AGE_MS;
      if (stale || !Array.isArray(saved.messages)) {
        clearDraft();
        return;
      }
      // תמונות אינן נשמרות (blob מקומי שפג) — משחזרים טקסט בלבד
      if (saved.messages.length > openers.length) {
        setMessages(saved.messages.map((m) => ({ ...m, images: undefined })));
      }
    } catch {
      clearDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (messages.length > openers.length) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: Date.now(), messages }));
      }
    } catch {
      /* ignore */
    }
  }, [messages, openers.length]);

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
    const attached = pendingImages;
    // אפשר לשלוח תמונה גם בלי טקסט
    if ((!text && !attached.length) || typing || censoring) return;

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

    // ה-AI לא מקבל את הקובץ עצמו בכל תור — התיאור העובדתי נשמר על ההודעה
    // ונשלח כטקסט, כך שהוא "רואה" את התמונה גם בתורות הבאים
    const aiNote = attached
      .map((img) => img.description)
      .filter(Boolean)
      .map((d) => `[המשתמש צירף תמונה: ${d}]`)
      .join("\n");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text,
      images: attached.map((i) => i.previewUrl),
      aiNote: aiNote || undefined,
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    // התמונות עברו להודעה — הן כבר לא ממתינות, אבל נשמרות להעלאה בעת יצירת התיק
    if (attached.length) {
      sentImages.current = [...sentImages.current, ...attached];
      setPendingImages([]);
    }
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
        incidentDate: data?.incident_date,
        damageType: data?.damage_type,
        hasDocumentation: data?.has_documentation || sentImages.current.length > 0,
        city: data?.city,
      });
      // התמונות אינן חוסמות: נכשלה העלאה — התיק ממשיך בלעדיה
      if (sentImages.current.length) {
        try {
          await uploadCaseImages(caseId, sentImages.current);
        } catch {
          /* ignore */
        }
      }
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
        {/* Ambient glass aura specific to the intake stage */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute bottom-0 -left-16 h-64 w-64 rounded-full bg-[color:oklch(0.55_0.15_260/0.25)] blur-3xl" />
          <div className="absolute bottom-24 -right-16 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
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
              <span className="ms-auto text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                        : "liquid-glass max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-luxe " +
                          (dir === "rtl"
                            ? "rounded-br-lg"
                            : "rounded-bl-lg")
                    }
                    style={
                      m.from === "user"
                        ? {
                            borderInlineEnd:
                              "1.5px solid oklch(0.76 0.13 85 / 0.55)",
                          }
                        : undefined
                    }
                  >
                    {m.images?.length ? (
                      <div className={`flex flex-wrap gap-1.5 ${m.text ? "mb-2" : ""}`}>
                        {m.images.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="h-28 w-28 rounded-xl border border-white/15 object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
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

          <div className="sticky bottom-0 px-5 pb-6 pt-3">
            {/* fade the messages behind the composer */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-8 h-10 bg-gradient-to-b from-transparent to-background"
            />
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
                  disabled={submitting}
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
                  <span className="relative">{t("submitForMatch")}</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* דרך יזומה להתחיל מחדש — בלי זה שיחה שנתקעה נשארת לנצח */}
            {messages.length > 2 && !ready && !notSuitable && (
              <button
                type="button"
                onClick={() => {
                  track("intake_restarted");
                  clearDraft();
                  sentImages.current = [];
                  setPendingImages([]);
                  setMessages(openers);
                  setStep(0);
                  setInput("");
                  firstMsgSent.current = false;
                }}
                className="mb-2 w-full py-1 text-center text-[12px] font-semibold text-muted-foreground"
              >
                {t("intakeRestart")}
              </button>
            )}

            {/* תמונות שצורפו — תצוגה של הגרסה המצונזרת, כפי שעו"ד יראה */}
            <AnimatePresence>
              {(pendingImages.length > 0 || censoring) && (
                <motion.div
                  key="image-strip"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-2 flex items-center gap-2 overflow-x-auto px-1 pb-1"
                >
                  {pendingImages.map((img) => (
                    <div key={img.id} className="relative shrink-0">
                      <img
                        src={img.previewUrl}
                        alt=""
                        className="h-16 w-16 rounded-2xl border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        aria-label={t("removeImageAria")}
                        className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-background text-foreground shadow"
                      >
                        <X className="size-3" />
                      </button>
                      <span className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-black/60 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                        {img.regionCount > 0
                          ? `${img.regionCount} ${t("imageRegionsHidden")}`
                          : t("imageNoRegions")}
                      </span>
                    </div>
                  ))}
                  {censoring && (
                    <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-border px-3 py-2 text-[11px] text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin text-gold" />
                      {t("imageCensoring")}
                    </div>
                  )}
                  {!censoring && pendingImages.length > 0 && (
                    <span className="shrink-0 self-center text-[11px] font-semibold text-gold">
                      {t("imageReadyToSend")}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* המקלדת נשארת תמיד — אפשר לתקן פרטים גם אחרי הסיכום */}
            <motion.div
              key="composer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="liquid-glass flex items-end gap-2 rounded-[28px] p-1.5 pe-2 ps-2 shadow-luxe"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => void attachImages(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={censoring || pendingImages.length >= MAX_IMAGES}
                aria-label={t("attachImageAria")}
                className="grid size-11 shrink-0 place-items-center self-end rounded-full text-muted-foreground transition hover:text-gold disabled:opacity-40"
              >
                <ImagePlus className="size-5" />
              </button>
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
                disabled={(!input.trim() && !pendingImages.length) || censoring}
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
