import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Check, FileCheck2, Lock, ScrollText, Sparkles } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const terms: { icon: typeof FileCheck2; key: StringKey }[] = [
  { icon: FileCheck2, key: "term1" },
  { icon: ScrollText, key: "term2" },
  { icon: Lock, key: "term3" },
  { icon: Sparkles, key: "term4" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const t = useT();

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
            className="liquid-glass flex w-full items-center gap-3 rounded-2xl p-4 text-start transition active:scale-[0.99]"
          >
            <motion.span
              animate={
                agreed
                  ? { backgroundColor: "var(--gold)", borderColor: "var(--gold)" }
                  : { backgroundColor: "rgba(0,0,0,0)", borderColor: "rgba(255,255,255,0.3)" }
              }
              className="grid size-6 shrink-0 place-items-center rounded-md border-2"
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
            disabled={!agreed}
            onClick={() => navigate({ to: "/intake" })}
            whileTap={agreed ? { scale: 0.98 } : undefined}
            className="btn-gold w-full rounded-2xl py-4 text-base font-bold transition disabled:opacity-40"
          >
            {t("confirmContinue")}
          </motion.button>
        </div>
      </Page>
    </AppShell>
  );
}
