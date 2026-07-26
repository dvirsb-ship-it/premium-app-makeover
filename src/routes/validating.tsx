import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BrandMark } from "../components/BrandMark";
import { HandshakeMoment } from "../components/HandshakeMoment";
import { useAppStore } from "../lib/store";
import { LAWYERS } from "../lib/store";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import type { Case } from "../lib/types";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/validating")({
  component: Validating,
});

const stepKeys: StringKey[] = ["valStep1", "valStep2", "valStep3", "valStep4"];
const STEP_MS = 900;
// Watchdog: if we don't finish within this window, offer a retry.
const STUCK_MS = STEP_MS * stepKeys.length + 4000;

function Validating() {
  useRequireAuth();
  const navigate = useNavigate();
  const { addCase } = useAppStore();
  const t = useT();
  const [current, setCurrent] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [runToken, setRunToken] = useState(0);
  const created = useRef(false);

  const finish = useCallback(() => {
    if (created.current) return;
    created.current = true;
    let summary = "";
    try {
      const raw = sessionStorage.getItem("justask-draft");
      if (raw) summary = JSON.parse(raw).summary || "";
    } catch {
      /* ignore */
    }
    if (!summary) summary = t("defaultSummary");
    const newCase: Case = {
      id: `c-${Date.now()}`,
      title: summary.length > 42 ? summary.slice(0, 42) + "…" : summary,
      category: t("defaultCategory"),
      summary,
      createdAt: Date.now(),
      status: "matching",
      interested: [LAWYERS[1]],
    };
    addCase(newCase);
    navigate({ to: "/submitted", search: { id: newCase.id } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addCase, navigate]);

  useEffect(() => {
    const timers: number[] = [];
    setStuck(false);
    setSealing(false);
    setCurrent(0);
    stepKeys.forEach((_, i) => {
      timers.push(window.setTimeout(() => setCurrent(i + 1), STEP_MS * (i + 1)));
    });
    // Reveal the handshake overlay once all steps complete...
    timers.push(
      window.setTimeout(() => setSealing(true), STEP_MS * stepKeys.length + STEP_MS),
    );
    // ...then complete the flow after the handshake plays.
    timers.push(
      window.setTimeout(finish, STEP_MS * stepKeys.length + STEP_MS + 2200),
    );
    timers.push(window.setTimeout(() => setStuck(true), STUCK_MS));

    return () => timers.forEach((tm) => window.clearTimeout(tm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  function retry() {
    created.current = false;
    setRunToken((n) => n + 1);
  }

  const progress = Math.min(current / stepKeys.length, 1);

  return (
    <AppShell className="items-center justify-center">
      <div className="flex min-h-screen w-full flex-col items-center justify-center py-16">
        <BrandMark size={96} />

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-7 text-2xl font-black text-foreground"
        >
          {t("valTitle")}
        </motion.h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("valSub")}</p>

        <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gold"
            animate={{ width: `${progress * 100}%` }}
            transition={{ ease: "easeOut", duration: 0.6 }}
          />
        </div>

        <div className="mt-10 w-full max-w-xs space-y-3">
          {stepKeys.map((key, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: done || active ? 1 : 0.4, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <span className="relative grid size-6 shrink-0 place-items-center">
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.span
                        key="done"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        className="grid size-6 place-items-center rounded-full bg-gold"
                      >
                        <Check className="size-4 text-gold-foreground" strokeWidth={3} />
                      </motion.span>
                    ) : active ? (
                      <Loader2 className="size-5 animate-spin text-gold" />
                    ) : (
                      <span className="size-4 rounded-full border-2 border-border" />
                    )}
                  </AnimatePresence>
                </span>
                <span className="text-sm font-medium text-foreground">{t(key)}</span>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {stuck && !created.current && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 w-full max-w-xs space-y-3 text-center"
              role="alert"
            >
              <div className="liquid-glass rounded-2xl px-4 py-4">
                <p className="text-sm font-bold text-foreground">
                  {t("valStuckTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("valStuckSub")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retry}
                  className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <RefreshCw className="size-4" />
                  {t("valRetry")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/cases" })}
                  className="liquid-glass flex flex-1 items-center justify-center rounded-2xl py-3 text-sm font-semibold text-foreground min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                >
                  {t("valGoCases")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
