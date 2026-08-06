import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Check, Cpu, FileCheck2, Lock, ScrollText, Sparkles, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";
import { Spinner } from "../components/Spinner";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { SealMoment } from "../components/SealMoment";

export const Route = createFileRoute("/onboarding")({
  /* עמוד אישי מאחורי התחברות — אין סיבה שיהיה במנוע חיפוש */
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

/*
 * הסדר אינו שרירותי: קודם מה שהפונה מתחייב לו, ואז מה שהוא מאשר
 * שייעשה במידע שלו. term5 הוא הסכמה מדעת להעברת מידע אל מחוץ לגבולות
 * המדינה — אחד הבסיסים המותרים בתקנות — ולכן הוא אומר במפורש לאן
 * (האיחוד האירופי), לשם מה (הבדיקה בלבד), ומה לא נשלח.
 *
 * זה המקום שבו התפתינו להוסיף ויתור גורף, ולא הוספנו. ההנמקה יושבת
 * ליד המחרוזות ב-i18n.ts.
 */
const terms: { icon: typeof FileCheck2; key: StringKey }[] = [
  { icon: FileCheck2, key: "term1" },
  { icon: ScrollText, key: "term2" },
  { icon: Lock, key: "term3" },
  { icon: Sparkles, key: "term4" },
  { icon: Cpu, key: "term5" },
  { icon: UserRound, key: "term6" },
];

function Onboarding() {

  useRequireAuth();  const navigate = useNavigate();
  const { markOnboarded } = useAppStore();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const t = useT();

  const [sealing, setSealing] = useState(false);

  /*
   * לחיצת היד מנגנת כאן — אחרי האישור — ולא במסך הפתיחה.
   *
   * זה הרגע שבו ההסכמה באמת נכרתה: תפקיד נבחר, התחברות הושלמה, והתנאים
   * אושרו זה עתה. במסך הפתיחה היא חגגה הסכם שעוד לא קרה, ולפני
   * ההתחברות — מסלול ה-redirect שכבר נשבר פעם — לא נוגעים.
   */
  function handleContinue() {
    if (!agreed || submitting) return;
    setSubmitting(true);
    // האישור נחתם בשרת — בלעדיו הכניסה הבאה תחזור לכאן במקום הביתה
    void markOnboarded();
    setSealing(true);
  }

  if (sealing) return <SealMoment onDone={() => navigate({ to: "/" })} />;


  return (
    <AppShell bare>
      <Page className="flex min-h-screen flex-col">
        <TopBar title={t("onboardTitle")} subtitle={t("onboardSubtitle")} />

        <div className="flex-1 px-5 pt-6">
          <Stagger className="space-y-6">
            <Rise>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {t("onboardIntro")}
              </p>
            </Rise>

            <div className="space-y-3">
              {terms.map((term) => {
                const Icon = term.icon;
                return (
                  <Rise key={term.key}>
                    <div className="liquid-glass flex items-start gap-3 rounded-2xl p-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
                        <Icon className="size-5" />
                      </span>
                      <p className="pt-1 text-sm leading-relaxed text-foreground">
                        {t(term.key)}
                      </p>
                    </div>
                  </Rise>
                );
              })}
            </div>
          </Stagger>
        </div>

        <div className="sticky bottom-0 space-y-4 border-t border-border bg-background/80 px-5 py-5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setAgreed((v) => !v)}
            role="switch"
            aria-checked={agreed}
            className="liquid-glass flex w-full items-center gap-3 rounded-2xl p-4 text-start transition min-h-11 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            <motion.span
              animate={
                agreed
                  ? { backgroundColor: "var(--gold)", borderColor: "var(--gold)" }
                  : { backgroundColor: "rgba(0,0,0,0)", borderColor: "rgba(255,255,255,0.3)" }
              }
              className="grid size-6 shrink-0 place-items-center rounded-md border-2"
              aria-hidden
            >
              {agreed && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Check className="size-4 text-gold-foreground" strokeWidth={3} />
                </motion.span>
              )}
            </motion.span>
            <span className="text-sm font-semibold text-foreground">
              {t("agreeText")}
            </span>
          </button>

          <motion.button
            type="button"
            disabled={!agreed || submitting}
            onClick={handleContinue}
            aria-busy={submitting}
            whileTap={agreed && !submitting ? { scale: 0.98 } : undefined}
            className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold min-h-11 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Spinner className="text-navy" />
                <span>{t("loading")}</span>
              </>
            ) : (
              <span>{t("confirmContinue")}</span>
            )}
          </motion.button>
        </div>
      </Page>
    </AppShell>
  );
}

