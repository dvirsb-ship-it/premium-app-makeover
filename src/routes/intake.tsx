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

export const Route = createFileRoute("/intake")({
  component: Intake,
});

function Intake() {

  useRequireAuth();  const navigate = useNavigate();
  const t = useT();
  const { dir } = useSettings();

  const openers: ChatMessage[] = useMemo(
    () => [
      { id: "a1", from: "assistant", text: t("opener1") },
      { id: "a2", from: "assistant", text: t("opener2") },
    ],
    [t],
  );
  const followUps = useMemo(
    () => [t("followUp1"), t("followUp2"), t("followUp3")],
    [t],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(openers);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstMsg = useRef<string>("");

  useEffect(() => {
    const scripted: Record<string, string> = {
      a1: t("opener1"),
      a2: t("opener2"),
      "f-0": t("followUp1"),
      "f-1": t("followUp2"),
      "f-2": t("followUp3"),
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

  const totalSteps = followUps.length;
  const progress = Math.min(step, totalSteps);

  function send() {
    const text = input.trim();
    if (!text || typing || ready) return;
    if (!firstMsg.current) firstMsg.current = text;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const idx = step;
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      if (idx < followUps.length) {
        setMessages((prev) => [
          ...prev,
          { id: `f-${idx}`, from: "assistant", text: followUps[idx] },
        ]);
      }
      if (idx >= followUps.length - 1) setReady(true);
      setStep(idx + 1);
    }, 1100);
  }

  function submit() {
    try {
      sessionStorage.setItem(
        "justask-draft",
        JSON.stringify({
          summary:
            firstMsg.current ||
            messages.find((m) => m.from === "user")?.text ||
            "",
        }),
      );
    } catch {
      /* ignore */
    }
    navigate({ to: "/validating" });
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
                  className="btn-gold relative w-full overflow-hidden rounded-2xl py-4 text-base font-bold"
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
