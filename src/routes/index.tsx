import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Scale, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { BrandMark } from "../components/BrandMark";
import { HeroVideo } from "../components/HeroVideo";
import { Pressable, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import { useAppStore } from "../lib/store";
import type { Role } from "../lib/types";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { setRole } = useAppStore();
  const t = useT();

  function choose(role: Role) {
    setRole(role);
    navigate({ to: role === "client" ? "/auth" : "/lawyer" });
  }

  return (
    <AppShell withNav bare outerClassName="studio-stage">
      {/* Cinematic studio backdrop — two clips cross-fading behind the phone */}
      <HeroVideo className="z-0" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen flex-col px-6 pb-6 pt-12">
        {/* Centered brand lockup in the studio spotlight */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <BrandMark size={84} />

            <h1 className="mt-5 text-[2.75rem] font-black leading-none tracking-tight text-foreground drop-shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
              Just<span className="text-gradient-gold">Ask</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mt-3 max-w-[17rem] text-base font-light leading-snug text-muted-foreground"
            >
              {t("heroTagline")}
            </motion.p>
          </motion.div>
        </div>


        {/* Role selection cards — liquid glass */}
        <Stagger className="w-full max-w-sm space-y-4 self-center pb-4">
          <Rise>
            <Pressable
              onClick={() => choose("client")}
              className="liquid-glass group block w-full rounded-[26px] p-5 text-right"
            >
              <div className="relative flex items-center gap-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border bg-foreground/5 text-foreground">
                  <UserRound className="size-6" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold leading-tight text-foreground">
                    {t("clientCTA")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("clientCTASub")}
                  </p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <Pressable
              onClick={() => choose("lawyer")}
              className="liquid-glass-selected group block w-full rounded-[26px] p-5 text-right"
            >
              <div className="relative flex items-center gap-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-lg shadow-gold/25">
                  <Scale className="size-6" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold leading-tight text-foreground">
                    {t("lawyerCTA")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("lawyerCTASub")}
                  </p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <p className="pt-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("trustBadge")}
            </p>
          </Rise>
        </Stagger>
      </div>

      <BottomNav />
    </AppShell>
  );
}
