import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Scale, SendHorizonal, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useT } from "../lib/i18n";
import type { ChatMessage } from "../lib/types";

export const Route = createFileRoute("/intake")({
  component: Intake,
});

function Intake() {
  const navigate = useNavigate();
  const t = useT();

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

  // Keep scripted assistant messages in sync with the current language.
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
      <div className="flex min-h-screen flex-col">
        <TopBar
          title={t("intakeTitle")}
          subtitle={t("intakeSubtitle")}
          right={
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
              <ShieldCheck className="size-3.5" />
              {t("secureBadge")}
            </span>
          }
        />

        <div
          ref={scrollRef}
          className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-6"
        >
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className={
                  m.from === "assistant"
                    ? "flex items-end gap-2"
                    : "flex justify-start"
                }
              >
                {m.from === "assistant" && (
                  <span className="chip-gold grid size-7 shrink-0 place-items-center rounded-full">
                    <Scale className="size-4" strokeWidth={2} />
                  </span>
                )}
                <div
                  className={
                    m.from === "assistant"
                      ? "liquid-glass max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed text-foreground"
                      : "ms-auto max-w-[80%] rounded-2xl rounded-bl-md bg-gradient-to-b from-gold to-[#B8912B] px-4 py-3 text-sm leading-relaxed text-[#0F172A] shadow-lg shadow-gold/25"
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
                className="flex items-end gap-2"
              >
                <span className="chip-gold grid size-7 shrink-0 place-items-center rounded-full">
                  <Scale className="size-4" strokeWidth={2} />
                </span>
                <div className="liquid-glass flex gap-1 rounded-2xl rounded-br-md px-4 py-4">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-2 rounded-full bg-muted-foreground/50"
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background/80 px-5 py-4 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {ready ? (
              <motion.button
                key="submit"
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={submit}
                className="btn-gold w-full rounded-2xl py-4 text-base font-bold"
              >
                {t("submitForMatch")}
              </motion.button>
            ) : (
              <motion.div
                key="composer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="liquid-glass flex items-center gap-2 rounded-2xl p-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={t("composerPlaceholder")}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={send}
                  disabled={!input.trim()}
                  className="chip-gold grid size-10 shrink-0 place-items-center rounded-xl transition disabled:opacity-40"
                  aria-label={t("sendAria")}
                >
                  <SendHorizonal className="size-5 -scale-x-100" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
