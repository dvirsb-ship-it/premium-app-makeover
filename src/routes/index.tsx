import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Scale, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { GlassLogo } from "../components/GlassLogo";
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
    navigate({ to: role === "client" ? "/onboarding" : "/lawyer" });
  }

  return (
    <AppShell withNav bare className="dark" outerClassName="bg-[#020617]">
      {/* Cinematic gold glow from above */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 -z-10 h-[70vh] w-[140vw] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.14)_0%,rgba(15,23,42,0)_65%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#020617] to-transparent"
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-6 pb-6 pt-10">
        {/* Brand block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center"
        >
          <GlassLogo size={120} />

          <h1 className="mt-5 text-5xl font-black tracking-tight text-white">
            Just
            <span className="text-gradient-gold">Ask</span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-3 max-w-[18rem] text-lg font-light leading-snug text-blue-100/60"
          >
            {t("heroTagline")}
          </motion.p>
        </motion.div>

        {/* Role selection cards */}
        <Stagger className="w-full max-w-sm space-y-4 pb-4">
          <Rise>
            <Pressable
              onClick={() => choose("client")}
              className="group relative block w-full rounded-2xl p-px"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 to-transparent" />
              <div className="relative flex items-center gap-5 rounded-[15px] bg-[#1E293B]/80 p-5 text-right backdrop-blur-xl transition-colors group-hover:bg-[#1E293B]/95">
                <div className="absolute inset-0 rounded-[15px] bg-gradient-to-r from-gold/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                  <UserRound className="size-6" strokeWidth={1.8} />
                </span>
                <div className="relative min-w-0 flex-1">
                  <h3 className="text-lg font-bold leading-tight text-white">
                    {t("clientCTA")}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">{t("clientCTASub")}</p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <Pressable
              onClick={() => choose("lawyer")}
              className="group relative block w-full rounded-2xl p-px"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gold/40 to-transparent" />
              <div className="relative flex items-center gap-5 rounded-[15px] border border-gold/20 bg-[#0F172A] p-5 text-right shadow-[0_10px_30px_-10px_rgba(212,175,55,0.3)]">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold text-[#0F172A] shadow-lg shadow-gold/20">
                  <Scale className="size-6" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold leading-tight text-gold">
                    {t("lawyerCTA")}
                  </h3>
                  <p className="mt-1 text-sm text-gold/60">{t("lawyerCTASub")}</p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <p className="pt-3 text-center text-xs font-medium tracking-wider text-slate-500/80 uppercase">
              {t("trustBadge")}
            </p>
          </Rise>
        </Stagger>
      </div>

      <BottomNav />
    </AppShell>
  );
}
