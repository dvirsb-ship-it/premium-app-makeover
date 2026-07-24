import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Scale,
  MessageSquare,
  ShieldCheck,
  Star,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

/**
 * A photorealistic 3D iPhone, lit like a studio product shot, slowly floating
 * and rotating while cycling through mock screens of the JustAsk app.
 */

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-4 pt-2 text-[7px] font-semibold text-slate-500">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-3 rounded-[2px] bg-slate-400" />
        <span className="h-1.5 w-2.5 rounded-[2px] bg-slate-400" />
        <span className="h-1.5 w-3 rounded-[2px] bg-slate-600" />
      </div>
    </div>
  );
}

function GoldChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-b from-[#F1E4C3] via-[#D4AF37] to-[#B8912B] text-[#0F172A] shadow-sm">
      {children}
    </span>
  );
}

function ScreenHome() {
  return (
    <div className="flex h-full flex-col bg-[#f4f6fa]">
      <StatusBar />
      <div className="flex flex-1 flex-col gap-2.5 px-3 pb-3 pt-3">
        <div className="flex flex-col items-center">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-b from-[#F1E4C3] via-[#D4AF37] to-[#B8912B] text-[#0F172A] shadow-md">
            <Scale className="size-4" strokeWidth={2} />
          </span>
          <p className="mt-1.5 text-[11px] font-black tracking-tight text-slate-800">
            Just<span className="text-[#B8912B]">Ask</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-900/[0.06] bg-white p-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <GoldChip>
              <Sparkles className="size-3" />
            </GoldChip>
            <div className="flex-1">
              <div className="h-1.5 w-14 rounded-full bg-slate-300" />
              <div className="mt-1 h-1 w-10 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border-2 border-[#D4AF37]/50 bg-white p-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <GoldChip>
              <Scale className="size-3" />
            </GoldChip>
            <div className="flex-1">
              <div className="h-1.5 w-16 rounded-full bg-[#D4AF37]/60" />
              <div className="mt-1 h-1 w-12 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="mt-auto rounded-xl bg-white p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3 text-[#B8912B]" />
            <div className="h-1 w-20 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenChat() {
  return (
    <div className="flex h-full flex-col bg-[#f4f6fa]">
      <StatusBar />
      <div className="flex items-center gap-1.5 px-3 py-2">
        <MessageSquare className="size-3 text-[#B8912B]" />
        <div className="h-1.5 w-16 rounded-full bg-slate-300" />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white p-2 shadow-sm">
          <div className="h-1 w-20 rounded-full bg-slate-200" />
          <div className="mt-1 h-1 w-14 rounded-full bg-slate-200" />
        </div>
        <div className="ms-auto max-w-[80%] rounded-2xl rounded-tl-sm bg-gradient-to-b from-[#D4AF37] to-[#B8912B] p-2 shadow-sm">
          <div className="h-1 w-16 rounded-full bg-white/70" />
          <div className="mt-1 h-1 w-10 rounded-full bg-white/60" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white p-2 shadow-sm">
          <div className="h-1 w-24 rounded-full bg-slate-200" />
          <div className="mt-1 h-1 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="mt-auto flex items-center gap-2 rounded-full bg-white p-1.5 shadow-sm">
          <div className="h-1.5 flex-1 rounded-full bg-slate-200" />
          <span className="size-4 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B8912B]" />
        </div>
      </div>
    </div>
  );
}

function ScreenCases() {
  return (
    <div className="flex h-full flex-col bg-[#f4f6fa]">
      <StatusBar />
      <div className="px-3 py-2">
        <div className="h-2 w-20 rounded-full bg-slate-400" />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-900/[0.06] bg-white p-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-1.5 w-16 rounded-full bg-slate-300" />
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[6px] font-bold text-emerald-600">
                Active
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              <Star className="size-2.5 fill-[#D4AF37] text-[#D4AF37]" />
              <div className="h-1 w-24 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenSuccess() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#f4f6fa] px-4">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="grid size-12 place-items-center rounded-full bg-gradient-to-b from-[#F1E4C3] via-[#D4AF37] to-[#B8912B] text-[#0F172A] shadow-lg"
      >
        <CheckCircle2 className="size-6" strokeWidth={2.2} />
      </motion.span>
      <div className="h-1.5 w-20 rounded-full bg-slate-300" />
      <div className="h-1 w-28 rounded-full bg-slate-200" />
      <div className="mt-2 h-4 w-24 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B8912B]" />
    </div>
  );
}

const screens = [ScreenHome, ScreenChat, ScreenCases, ScreenSuccess];

export function PhoneShowcase({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % screens.length),
      3200,
    );
    return () => window.clearInterval(id);
  }, []);

  const Screen = screens[index];

  return (
    <div
      className={className}
      style={{ perspective: "1400px" }}
      aria-hidden
    >
      <motion.div
        initial={{ opacity: 0, y: 40, rotateY: -22 }}
        animate={{
          opacity: 1,
          y: [0, -14, 0],
          rotateY: [-16, -9, -16],
          rotateX: [7, 4, 7],
          rotateZ: [-1.5, 0.5, -1.5],
        }}
        transition={{
          opacity: { duration: 1 },
          y: { duration: 9, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 14, repeat: Infinity, ease: "easeInOut" },
          rotateX: { duration: 14, repeat: Infinity, ease: "easeInOut" },
          rotateZ: { duration: 14, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative mx-auto"
      >
        {/* floor contact shadow */}
        <div
          aria-hidden
          className="absolute -bottom-8 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-2xl"
        />

        {/* Titanium phone body */}
        <div className="relative h-[440px] w-[214px] rounded-[3rem] bg-gradient-to-br from-[#3a3d44] via-[#17191d] to-[#2c2f35] p-[3px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.7)]">
          {/* rim light highlights */}
          <div className="pointer-events-none absolute inset-0 rounded-[3rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.55)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.35)_100%)]" />
          <div className="pointer-events-none absolute inset-y-8 -left-[1px] w-[3px] rounded-full bg-white/40 blur-[1px]" />
          <div className="pointer-events-none absolute inset-y-8 -right-[1px] w-[3px] rounded-full bg-white/20 blur-[1px]" />

          {/* inner bezel */}
          <div className="relative h-full w-full overflow-hidden rounded-[2.7rem] bg-black p-[3px]">
            <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-[#f4f6fa]">
              {/* dynamic island */}
              <div className="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-black" />

              {/* screen glare */}
              <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(115deg,rgba(255,255,255,0.35)_0%,transparent_28%,transparent_100%)]" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <Screen />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
