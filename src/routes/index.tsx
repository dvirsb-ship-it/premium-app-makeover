import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Scale, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { BrandMark } from "../components/BrandMark";
import { Pressable, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import { useAppStore } from "../lib/store";
import type { Role } from "../lib/types";
import heroBg from "../assets/hero/hero-columns.jpg";

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
    <AppShell withNav bare className="dark" outerClassName="bg-[#050915]">
      {/* Cinematic blurred photographic backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${heroBg})`, filter: "blur(14px) saturate(120%)", transform: "scale(1.15)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[#050915]/70"
      />
      {/* Gold glow from above */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 -z-10 h-[70vh] w-[140vw] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.16)_0%,rgba(5,9,21,0)_65%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#050915] to-transparent"
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-6 pb-6 pt-12">
        {/* Brand block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center"
        >
          <BrandMark size={96} />

          <h1 className="mt-6 text-5xl font-black tracking-tight text-white">
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

        {/* Role selection cards — liquid glass */}
        <Stagger className="w-full max-w-sm space-y-4 pb-4">
          <Rise>
            <Pressable
              onClick={() => choose("client")}
              className="liquid-glass group block w-full rounded-[26px] p-5 text-right"
            >
              <div className="relative flex items-center gap-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white">
                  <UserRound className="size-6" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold leading-tight text-white">
                    {t("clientCTA")}
                  </h3>
                  <p className="mt-1 text-sm text-blue-100/60">{t("clientCTASub")}</p>
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
                  <h3 className="text-lg font-bold leading-tight text-gold">
                    {t("lawyerCTA")}
                  </h3>
                  <p className="mt-1 text-sm text-gold/60">{t("lawyerCTASub")}</p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <p className="pt-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400/80">
              {t("trustBadge")}
            </p>
          </Rise>
        </Stagger>
      </div>

      <BottomNav />
    </AppShell>
  );
}
