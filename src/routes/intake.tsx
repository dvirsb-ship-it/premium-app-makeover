import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Scale, SendHorizonal, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import type { ChatMessage } from "../lib/types";

export const Route = createFileRoute("/intake")({
  component: Intake,
});

const openers: ChatMessage[] = [
  {
    id: "a1",
    from: "assistant",
    text: "שלום 👋 אני העוזר המשפטי של JustAsk. אני כאן כדי לשמוע על המקרה שלך ולבדוק התאמה ראשונית.",
  },
  {
    id: "a2",
    from: "assistant",
    text: "ספר/י לי בחופשיות מה קרה — אני אשאל שאלות תוך כדי.",
  },
];

const followUps = [
  "תודה ששיתפת. מתי בערך זה קרה, והאם יש מסמכים או תיעוד רלוונטי?",
  "הבנתי. האם כבר פנית לגורם כלשהו בנושא (ביטוח, מעסיק, רשות)?",
  "מעולה, יש לי מספיק פרטים כדי להתחיל בבדיקת ההתאמה. אפשר להמשיך 👇",
];

function Intake() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(openers);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstMsg = useRef<string>("");

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
          { id: `a-${Date.now()}`, from: "assistant", text: followUps[idx] },
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
        JSON.stringify({ summary: firstMsg.current || messages.find((m) => m.from === "user")?.text || "" }),
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
          title="שיתוף הסיפור"
          subtitle="שיחה מאובטחת"
          right={
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
              <ShieldCheck className="size-3.5" />
              מאובטח
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
                      ? "max-w-[80%] rounded-2xl rounded-br-md border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-luxe"
                      : "ms-auto max-w-[80%] rounded-2xl rounded-bl-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-luxe"
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
                <img
                  src={sealUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-full"
                />
                <div className="flex gap-1 rounded-2xl rounded-br-md border border-border bg-card px-4 py-4 shadow-luxe">
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

        {/* Composer / submit */}
        <div className="sticky bottom-0 border-t border-border/60 bg-background/90 px-5 py-4 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {ready ? (
              <motion.button
                key="submit"
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={submit}
                className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-gold"
              >
                שליחה לבדיקת התאמה
              </motion.button>
            ) : (
              <motion.div
                key="composer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-luxe"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="כתוב/י כאן…"
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={send}
                  disabled={!input.trim()}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-gold transition disabled:opacity-40"
                  aria-label="שליחה"
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
