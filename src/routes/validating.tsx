import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BrandMark } from "../components/BrandMark";
import { useAppStore } from "../lib/store";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import type { Case } from "../lib/types";
import { useRequireAuth } from "../lib/require-auth";
import { haptic } from "../lib/haptics";
import { fanOutNewCase, notify, readCaseRaw } from "../lib/db";
import { fbAuth } from "../lib/firebase";
import { validateCaseFn, type ValidateResult } from "../lib/ai/intake.functions";

export const Route = createFileRoute("/validating")({
  component: Validating,
});

const stepKeys: StringKey[] = ["valStep1", "valStep2", "valStep3", "valStep4"];
const STEP_MS = 1150;
// הבדיקה המעמיקה (תזכיר + שופט) אורכת עד ~דקה — הכלב-שמירה מחכה בהתאם.
const STUCK_MS = STEP_MS * stepKeys.length + 90000;

function Validating() {
  useRequireAuth();
  const navigate = useNavigate();
  const { addCase } = useAppStore();
  const t = useT();
  const [current, setCurrent] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const [runToken, setRunToken] = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const finished = useRef(false);

  // הוולידציה האמיתית: קריאת התיק → Gemini → כתיבת התוצאה למסד
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setStuck(false);
    setRejected(null);

    let caseId = "";
    try {
      caseId = sessionStorage.getItem("justask-active-case") ?? "";
    } catch {
      /* ignore */
    }
    if (!caseId) {
      navigate({ to: "/intake", replace: true });
      return;
    }

    (async () => {
      const raw = await readCaseRaw(caseId);
      if (!raw) throw new Error("case not found");
      const idToken = (await fbAuth().currentUser?.getIdToken()) ?? "";
      // השרת מאמת את הטוקן, קורא את התיק (כולל התמונות) וכותב את התוצאה בעצמו
      const res = await validateCaseFn({ data: { caseId, idToken } });
      if (res.validated) {
        // הזמנת עורכי הדין בתחום — לא חוסם את המסך אם נכשל
        void fanOutNewCase(caseId, res.title, res.category).catch(() => {});
      }
      // התראה ללקוח — כך התוצאה מחכה לו גם אם עזב את המסך באמצע
      void notify(raw.clientId, res.validated
        ? {
            type: "case_validated",
            title: "התיק שלך עבר את הבדיקה המשפטית ✓",
            body: `"${res.title}" אושר — עורכי דין מתאימים בתחום קיבלו התראה`,
            caseId,
          }
        : {
            type: "case_rejected",
            title: "הבדיקה המשפטית הושלמה",
            body: res.recommendation || res.summary,
            caseId,
          },
      ).catch(() => {});
      if (!cancelled) setResult(res);
    })().catch(() => {
      if (!cancelled) setStuck(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken, navigate]);

  // האנימציה המדורגת — השלב האחרון ממשיך להסתובב עד שהבדיקה המעמיקה מסתיימת
  useEffect(() => {
    const timers: number[] = [];
    setAnimDone(false);
    setCurrent(0);
    stepKeys.slice(0, -1).forEach((_, i) => {
      timers.push(window.setTimeout(() => setCurrent(i + 1), STEP_MS * (i + 1)));
    });
    timers.push(
      window.setTimeout(() => setAnimDone(true), STEP_MS * stepKeys.length),
    );
    timers.push(window.setTimeout(() => setStuck((s) => s || !finished.current), STUCK_MS));

    return () => timers.forEach((tm) => window.clearTimeout(tm));
  }, [runToken]);

  const finish = useCallback(
    (res: ValidateResult) => {
      if (finished.current) return;
      finished.current = true;
      let caseId = "";
      try {
        caseId = sessionStorage.getItem("justask-active-case") ?? "";
      } catch {
        /* ignore */
      }
      if (!res.validated) {
        const parts = [res.summary || t("valRejectedSub")];
        if (res.recommendation) parts.push(res.recommendation);
        haptic("warning");
        setRejected(parts.join("\n\n"));
        return;
      }
      const newCase: Case = {
        id: caseId,
        title: res.title,
        category: res.category,
        summary: res.summary,
        createdAt: Date.now(),
        status: "matching",
        interested: [],
      };
      addCase(newCase);
      haptic("success");
      navigate({ to: "/", search: { done: caseId } });
    },
    [addCase, navigate, t],
  );

  // האנימציה נגמרה והתוצאה כבר כאן — מציגים אותה
  useEffect(() => {
    if (animDone && result) {
      setCurrent(stepKeys.length);
      finish(result);
    }
  }, [animDone, result, finish]);

  /*
   * האנימציה נגמרה והבדיקה המעמיקה עדיין רצה — לא מחזיקים את המשתמש מול המסך.
   * הבקשה ממשיכה ברקע (אותה לשונית), הסטטוס בדף התיק מתעדכן בזמן אמת,
   * ובסיום נשלחת התראה. כך נשמר הרגע הנעים בלי דקה של המתנה מיותרת.
   */
  useEffect(() => {
    if (!animDone || result || rejected || stuck) return;
    let caseId = "";
    try {
      caseId = sessionStorage.getItem("justask-active-case") ?? "";
    } catch {
      /* ignore */
    }
    if (!caseId) return;
    /*
     * הבדיקה המעמיקה עדיין רצה, אבל שומר הסף כבר אישר את הפנייה — ולכן
     * הלקוח מקבל את אישור הקליטה במקום ספינר. שאר העדכונים מגיעים בהתראה.
     */
    const tm = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      navigate({ to: "/", search: { done: caseId } });
    }, 1200);
    return () => window.clearTimeout(tm);
  }, [animDone, result, rejected, stuck, navigate]);

  function retry() {
    finished.current = false;
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
          {rejected && (
            <motion.div
              key="rejected"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 w-full max-w-xs space-y-3 text-center"
              role="alert"
            >
              <div className="liquid-glass rounded-2xl px-4 py-4">
                <p className="text-sm font-bold text-foreground">
                  {t("valRejectedTitle")}
                </p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{rejected}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/intake" })}
                  className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {t("valNewRequest")}
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

          {stuck && !rejected && !finished.current && !result && (
            <motion.div
              key="stuck"
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
