import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ChevronLeft, ShieldCheck, Scale, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { Seal } from "../components/Seal";
import { Page, Stagger, Rise, Pressable } from "../components/motion";
import { useAppStore } from "../lib/store";
import type { Role } from "../lib/types";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { setRole } = useAppStore();

  function choose(role: Role) {
    setRole(role);
    navigate({ to: role === "client" ? "/onboarding" : "/lawyer" });
  }

  return (
    <AppShell withNav bare>
      <Page>
        {/* Hero */}
        <div className="relative overflow-hidden rounded-b-[2.5rem] bg-primary px-6 pb-12 pt-14 text-primary-foreground shadow-luxe">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-gold/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 size-52 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <Seal size={104} />
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 text-4xl font-black tracking-tight"
            >
              Just<span className="text-gradient-gold">Ask</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-2 text-sm font-light text-gold-light/80"
            >
              הגישה הישירה שלך לצדק
            </motion.p>
          </div>
        </div>

        {/* Role selection */}
        <div className="px-5">
          <Stagger className="-mt-6 space-y-4">
            <Rise>
              <h2 className="px-1 pb-1 pt-2 text-center text-sm font-semibold text-muted-foreground">
                כיצד נוכל לסייע לך היום?
              </h2>
            </Rise>

            <Rise>
              <Pressable
                onClick={() => choose("client")}
                className="w-full rounded-3xl border border-border bg-card p-5 shadow-luxe"
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold/12 text-gold">
                    <UserRound className="size-7" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold leading-tight text-foreground">
                      אני זקוק/ה לייעוץ משפטי
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      שתפו את המקרה וקבלו הצעות מעורכי דין מומחים
                    </p>
                  </div>
                  <ChevronLeft className="size-5 shrink-0 text-gold" />
                </div>
              </Pressable>
            </Rise>

            <Rise>
              <Pressable
                onClick={() => choose("lawyer")}
                className="w-full rounded-3xl border border-border bg-card p-5 shadow-luxe"
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/8 text-primary">
                    <Scale className="size-7" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold leading-tight text-foreground">
                      אני עורך/ת דין
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      קבלו פניות רלוונטיות ומצאו לקוחות חדשים
                    </p>
                  </div>
                  <ChevronLeft className="size-5 shrink-0 text-muted-foreground/50" />
                </div>
              </Pressable>
            </Rise>

            <Rise>
              <div className="flex items-center justify-center gap-2 pt-3 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-success" />
                <span>הפרטים שלך מאובטחים ומועברים רק לעורכי דין מתאימים</span>
              </div>
            </Rise>
          </Stagger>
        </div>
      </Page>
      <BottomNav />
    </AppShell>
  );
}
