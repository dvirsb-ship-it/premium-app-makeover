import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BrandMark } from "../components/BrandMark";
import handshake from "../../public/videos/handshake.mp4.asset.json";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to JustAsk" },
      { name: "description", content: "A quick tour of your premium legal concierge." },
      { property: "og:title", content: "Welcome to JustAsk" },
      { property: "og:description", content: "A quick tour of your premium legal concierge." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Welcome,
});

const WELCOMED_KEY = "justask-welcomed";

const slides: {
  icon: typeof Sparkles;
  title: StringKey;
  body: StringKey;
}[] = [
  { icon: Sparkles, title: "welcomeSlide1Title", body: "welcomeSlide1Body" },
  { icon: Users, title: "welcomeSlide2Title", body: "welcomeSlide2Body" },
  { icon: ShieldCheck, title: "welcomeSlide3Title", body: "welcomeSlide3Body" },
];

function Welcome() {
  const navigate = useNavigate();
  const t = useT();
  const [i, setI] = useState(0);
  const [sealing, setSealing] = useState(false);
  const isLast = i === slides.length - 1;

  function finish() {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      /* ignore */
    }
    navigate({ to: "/" });
  }

  function next() {
    if (isLast) {
      setSealing(true);
      return;
    }
    setI((v) => v + 1);
  }

  // Safety net: navigate away even if the video stalls.
  useEffect(() => {
    if (!sealing) return;
    const id = window.setTimeout(finish, 2600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealing]);

  const Slide = slides[i];
  const Icon = Slide.icon;

  return (
    <AppShell bare outerClassName="bg-[#04060b]">
      {/* Cinematic dark backdrop — subtle looping handshake as ambient light */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <video
          src={handshake.url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 scale-110 object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(212,175,55,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_60%,transparent_35%,rgba(2,4,8,0.85)_100%)]" />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      <AnimatePresence mode="wait">
        {!sealing ? (
          <motion.div
            key="tour"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex min-h-screen w-full flex-col px-6 pb-8 pt-10"
          >
            <div className="flex items-center justify-between">
              <BrandMark size={44} />
              <button
                type="button"
                onClick={finish}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                {t("welcomeSkip")}
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="mx-auto flex max-w-xs flex-col items-center text-center"
                >
                  <div className="relative mb-8">
                    <div
                      aria-hidden
                      className="absolute inset-0 -m-8 rounded-full bg-gold/20 blur-3xl"
                    />
                    <div className="liquid-glass relative grid size-24 place-items-center rounded-[28px] ring-1 ring-gold/30">
                      <Icon className="size-11 text-gold" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h1 className="text-2xl font-black leading-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]">
                    {t(Slide.title)}
                  </h1>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/80">
                    {t(Slide.body)}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-center gap-2">
                {slides.map((_, idx) => (
                  <motion.span
                    key={idx}
                    animate={{
                      width: idx === i ? 28 : 8,
                      opacity: idx === i ? 1 : 0.4,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="h-2 rounded-full bg-gold"
                  />
                ))}
              </div>

              <motion.button
                type="button"
                onClick={next}
                whileTap={{ scale: 0.98 }}
                className="btn-gold flex w-full items-center justify-center rounded-2xl py-4 text-base font-bold min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {isLast ? t("welcomeStart") : t("welcomeNext")}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="seal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 grid min-h-screen w-full place-items-center"
          >
            <video
              src={handshake.url}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_55%,transparent_0%,rgba(0,0,0,0.7)_100%)]" />
            <motion.div
              aria-hidden
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.4, 1.1], opacity: [0, 0.6, 0] }}
              transition={{ duration: 2.2, times: [0, 0.5, 1], ease: "easeOut" }}
              className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/40 blur-3xl"
            />
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 whitespace-nowrap text-sm font-bold uppercase tracking-[0.32em] text-gold drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]"
            >
              {t("handshakeWelcome")}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
