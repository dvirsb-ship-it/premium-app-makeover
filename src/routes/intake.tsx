import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import type { ChatMessage } from "../lib/types";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { intakeTurn, type IntakeReady } from "../lib/ai/intake.functions";
import { createCase } from "../lib/db";

export const Route = createFileRoute("/intake")({
  component: Intake,
});

function Intake() {

  useRequireAuth();  const navigate = useNavigate();
  const t = useT();
  const { dir } = useSettings();
  const { user } = useAppStore();

  const openers: ChatMessage[] = useMemo(
    () => [
      { id: "a1", from: "assistant", text: t("opener1") },
      { id: "a2", from: "assistant", text: t("opener2") },
    ],
    [t],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(openers);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readyData = useRef<IntakeReady | null>(null);

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

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  // ארבעה פרטים נאספים בשיחה: תיאור, תאריך, סוג נזק, תיעוד
  const totalSteps = 3;
  const progress = Math.min(step, totalSteps);

  async function send() {
    const text = input.trim();
    if (!text || typing || ready) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text,
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setTyping(true);

    try {
      const res = await intakeTurn({
        data: { messages: history.map((m) => ({ from: m.from, text: m.text })) },
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
      const caseId = await createCase({
        clientId: uid,
        description,
        incidentDate: data?.incident_date,
        damageType: data?.damage_type,
        hasDocumentation: data?.has_documentation,
        city: data?.city,
      });
      try {
        sessionStorage.setItem("justask-active-case", caseId);
      } catch {
        /* ignore */
      }
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
            <AnimatePresence mode="wait">
              {ready ? (
                <motion.button
                  key="submit"
                  type="button"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  onClick={submit}
                  disabled={submitting}
                  className="btn-gold relative w-full overflow-hidden rounded-2xl py-4 text-base font-bold disabled:opacity-60"
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
              ) : (
                <motion.div
                  key="composer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="liquid-glass flex items-end gap-2 rounded-[28px] p-1.5 pe-2 ps-4 shadow-luxe"
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
                    placeholder={t("composerPlaceholder")}
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
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
