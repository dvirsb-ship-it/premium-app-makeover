import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, Scale, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { Seal } from "../components/Seal";
import { Stagger, Rise, Pressable } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { Role } from "../lib/types";
import heroColumns from "../assets/hero/hero-columns.jpg";
import heroScales from "../assets/hero/hero-scales.jpg";
import heroLibrary from "../assets/hero/hero-library.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

const HERO_IMAGES = [heroColumns, heroScales, heroLibrary];

function Index() {
  const navigate = useNavigate();
  const { setRole } = useAppStore();
  const { dir } = useSettings();
  const t = useT();

  function choose(role: Role) {
    setRole(role);
    navigate({ to: role === "client" ? "/onboarding" : "/lawyer" });
  }

  // ---- Cross-fading background slideshow ----
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % HERO_IMAGES.length),
      4200,
    );
    return () => clearInterval(id);
  }, []);

  // ---- 3D pointer parallax ----
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), {
    stiffness: 120,
    damping: 18,
  });
  const glareX = useTransform(px, [-0.5, 0.5], ["30%", "70%"]);
  const glareY = useTransform(py, [-0.5, 0.5], ["25%", "75%"]);

  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function resetPointer() {
    px.set(0);
    py.set(0);
  }

  return (
    <AppShell withNav bare>
      {/* ============ CINEMATIC 3D HERO ============ */}
      <div
        className="relative px-4 pt-4"
        style={{ perspective: 1400 }}
        onPointerMove={handlePointer}
        onPointerLeave={resetPointer}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative aspect-[3/4.05] w-full overflow-hidden rounded-[2.25rem] shadow-luxe"
        >
          {/* Cross-fading images with slow Ken-Burns zoom */}
          <AnimatePresence>
            <motion.img
              key={active}
              src={HERO_IMAGES[active]}
              alt=""
              width={1024}
              height={1280}
              initial={{ opacity: 0, scale: 1.12 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.4 }, scale: { duration: 6 } }}
              className="absolute inset-0 size-full object-cover"
            />
          </AnimatePresence>

          {/* Navy + gold cinematic overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary via-primary/45 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_55%)]" />

          {/* Moving glare that follows pointer */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light"
            style={{
              background: useTransform(
                [glareX, glareY],
                ([x, y]) =>
                  `radial-gradient(60% 50% at ${x} ${y}, rgba(255,255,255,0.5), transparent 60%)`,
              ),
            }}
          />

          {/* Floating content lifted in 3D space */}
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-9 text-center"
            style={{ transform: "translateZ(60px)" }}
          >
            <Seal size={92} />
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-4 rounded-full border border-gold/40 bg-primary/30 px-3 py-1 text-[11px] font-semibold tracking-wide text-gold-light backdrop-blur-sm"
            >
              {t("heroKicker")}
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 text-4xl font-black leading-[1.1] tracking-tight text-primary-foreground drop-shadow-[0_2px_16px_rgba(0,0,0,0.4)]"
            >
              Just<span className="text-gradient-gold">Ask</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75, duration: 0.6 }}
              className="mt-2 max-w-[16rem] text-sm font-light text-primary-foreground/80"
            >
              {t("heroHeadline")}
            </motion.p>

            {/* slideshow progress dots */}
            <div className="mt-5 flex items-center gap-1.5">
              {HERO_IMAGES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === active ? "w-6 bg-gold" : "w-1.5 bg-primary-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ============ ROLE SELECTION ============ */}
      <div className="px-5">
        <Stagger className="mt-6 space-y-4">
          <Rise>
            <h2 className="px-1 pb-1 text-center text-sm font-semibold text-muted-foreground">
              {t("howCanWeHelp")}
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
                <div className="min-w-0 flex-1 text-start">
                  <h3 className="text-lg font-bold leading-tight text-foreground">
                    {t("clientTitle")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("clientSub")}
                  </p>
                </div>
                <ChevronLeft
                  className={`size-5 shrink-0 text-gold ${dir === "ltr" ? "rotate-180" : ""}`}
                />
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
                <div className="min-w-0 flex-1 text-start">
                  <h3 className="text-lg font-bold leading-tight text-foreground">
                    {t("lawyerTitle")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("lawyerSub")}
                  </p>
                </div>
                <ChevronLeft
                  className={`size-5 shrink-0 text-muted-foreground/50 ${dir === "ltr" ? "rotate-180" : ""}`}
                />
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <div className="flex items-center justify-center gap-2 pt-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-success" />
              <span>{t("secureNote")}</span>
            </div>
          </Rise>
        </Stagger>
      </div>
      <BottomNav />
    </AppShell>
  );
}
