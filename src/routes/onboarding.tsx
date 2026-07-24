import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Check, FileCheck2, Lock, ScrollText, Sparkles } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const terms = [
  {
    icon: FileCheck2,
    text: "המידע שאשתף הוא אמיתי ומדויק למיטב ידיעתי.",
  },
  {
    icon: ScrollText,
    text: "הבדיקה הראשונית אינה ייעוץ משפטי ואינה מהווה ייצוג.",
  },
  {
    icon: Lock,
    text: "פרטי הפנייה יישמרו ויועברו רק לעורכי דין מתאימים.",
  },
  {
    icon: Sparkles,
    text: "אני פונה מתוך כוונה אמיתית לקבל סיוע משפטי.",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  return (
    <AppShell bare>
      <Page className="flex min-h-screen flex-col">
        <TopBar title="לפני שמתחילים" subtitle="הסכמה קצרה להמשך" />

        <div className="flex-1 px-5 pt-6">
          <Stagger className="space-y-6">
            <Rise>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                כדי שנוכל לעזור לך בצורה הטובה ביותר, חשוב שנסכים על כמה דברים:
              </p>
            </Rise>

            <div className="space-y-3">
              {terms.map((t) => {
                const Icon = t.icon;
                return (
                  <Rise key={t.text}>
                    <div className="liquid-glass flex items-start gap-3 rounded-2xl p-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
                        <Icon className="size-5" />
                      </span>
                      <p className="pt-1 text-sm leading-relaxed text-foreground">
                        {t.text}
                      </p>
                    </div>
                  </Rise>
                );
              })}
            </div>
          </Stagger>
        </div>

        {/* Sticky footer */}
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
                  : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.3)" }
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
              קראתי ואני מתחייב/ת לאמור לעיל
            </span>
          </button>

          <motion.button
            type="button"
            disabled={!agreed}
            onClick={() => navigate({ to: "/intake" })}
            whileTap={agreed ? { scale: 0.98 } : undefined}
            className="btn-gold w-full rounded-2xl py-4 text-base font-bold transition disabled:opacity-40"
          >
            אני מאשר/ת וממשיך/ה
          </motion.button>
        </div>
      </Page>
    </AppShell>
  );
}
