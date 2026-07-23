import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import {
  ChevronLeft,
  Layers,
  Smartphone,
  Infinity as InfinityIcon,
  Sparkles,
  Users,
  Check,
  ArrowLeft,
} from "lucide-react";
import { useSettings } from "../lib/settings";

export const Route = createFileRoute("/lawyer-subscription")({
  head: () => ({
    meta: [
      { title: "JustAsk Pro — מנוי לעורכי דין" },
      {
        name: "description",
        content: "פתחו גישה מלאה ללידים איכותיים, כלי AI ותכונות מתקדמות לעורכי דין.",
      },
      { property: "og:title", content: "JustAsk Pro — מנוי לעורכי דין" },
      {
        property: "og:description",
        content: "מנוי חודשי או שנתי לעורכי דין ב-JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LawyerSubscription,
});

const features = [
  { icon: Layers, label: "גישה מלאה לכל הפניות" },
  { icon: Smartphone, label: "התראות בזמן אמת ללידים חדשים" },
  { icon: InfinityIcon, label: "הבעות עניין ללא הגבלה" },
  { icon: Sparkles, label: "כלי AI לניתוח תיקים" },
  { icon: Users, label: "פרופיל מקצועי מודגש" },
];

function LawyerSubscription() {
  const navigate = useNavigate();
  const { dir } = useSettings();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const flip = dir === "rtl" ? "" : "rotate-180";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0b0d14] text-white">
      {/* Cinematic background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-[#d4af37]/20 blur-[140px]" />
        <div className="absolute -right-24 top-[30%] h-[420px] w-[420px] rounded-full bg-[#4a6ba8]/25 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[#1a2340]/60 blur-[120px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-5">
        <button
          type="button"
          onClick={() => navigate({ to: "/lawyer" })}
          className="grid size-10 place-items-center rounded-full bg-white/10 backdrop-blur-xl transition hover:bg-white/15"
          aria-label="חזרה"
        >
          <ArrowLeft className={`size-5 text-white ${flip}`} />
        </button>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur">
          JustAsk · Pro
        </span>
        <div className="size-10" />
      </div>

      {/* Hero */}
      <div className="relative z-10 px-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="text-[13px] font-medium tracking-[0.28em] text-[#d4af37]">
            LAWYER MEMBERSHIP
          </p>
          <h1
            className="mt-4 text-[54px] font-light leading-[0.95] tracking-tight text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            הפכו את הלידים
            <br />
            <span
              className="italic text-white"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                textShadow:
                  "0 0 24px rgba(255,235,190,0.35), 0 0 60px rgba(212,175,55,0.25)",
              }}
            >
              ללקוחות
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-white/60">
            גישה בלתי מוגבלת לפניות איכותיות, כלי AI מתקדמים והתראות בזמן אמת — הכל במקום אחד.
          </p>
        </motion.div>
      </div>

      {/* Features */}
      <div className="relative z-10 mt-10 px-6">
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto h-px w-full max-w-md origin-center bg-gradient-to-l from-transparent via-white/30 to-transparent"
        />
        <ul className="mx-auto mt-6 max-w-md space-y-3.5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.li
                key={f.label}
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.7,
                  delay: 0.4 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center gap-3"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white/8 ring-1 ring-white/10 backdrop-blur-xl">
                  <Icon className="size-4 text-[#f1e4c3]" strokeWidth={1.8} />
                </span>
                <span className="text-[15px] font-normal text-white/90">
                  {f.label}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Pricing cards */}
      <div className="relative z-10 mt-10 px-6">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {/* Monthly */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            type="button"
            onClick={() => setPlan("monthly")}
            className={`relative overflow-hidden rounded-2xl border p-4 text-start transition ${
              plan === "monthly"
                ? "border-[#d4af37]/70 bg-white/8 shadow-[0_10px_40px_-10px_rgba(212,175,55,0.5)]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#d4af37]/20 blur-2xl" />
            </div>
            <div className="relative">
              <p className="text-[13px] text-white/70">חודשי</p>
              <p className="mt-2 text-[22px] font-medium tracking-tight text-white">
                ₪199
              </p>
              <p className="mt-6 text-[11px] text-white/50">חיוב חודשי</p>
            </div>
          </motion.button>

          {/* Yearly */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            type="button"
            onClick={() => setPlan("yearly")}
            className={`relative overflow-hidden rounded-2xl border p-4 text-start transition ${
              plan === "yearly"
                ? "border-[#d4af37]/70 bg-white/8 shadow-[0_10px_40px_-10px_rgba(212,175,55,0.5)]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="relative">
              <p className="text-[13px] text-white/70">שנתי</p>
              <p className="mt-2 text-[22px] font-medium tracking-tight text-white">
                ₪1,990
              </p>
              <p className="mt-6 text-[11px] text-white/50">חיוב שנתי</p>
            </div>
            <motion.span
              initial={{ opacity: 0, scale: 0.7, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 1.25,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="absolute end-3 top-3 rounded-full bg-gradient-to-b from-[#f1e4c3] via-[#d4af37] to-[#a8862a] px-2 py-1 text-[10px] font-bold tracking-wide text-[#1a1305] shadow-lg"
            >
              חסכו 17%
            </motion.span>
          </motion.button>
        </div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.15, ease: [0.16, 1, 0.3, 1] }}
          type="button"
          className="mx-auto mt-4 flex w-full max-w-md items-center justify-center gap-2 rounded-[26px] bg-white py-4 text-[16px] font-semibold text-[#0c0c0e] shadow-[0_16px_40px_-12px_rgba(255,255,255,0.35)] transition active:scale-[0.98]"
        >
          <Check className="size-5" strokeWidth={2.4} />
          הצטרפו ל-Pro
          <ChevronLeft className={`size-4 ${flip}`} strokeWidth={2.4} />
        </motion.button>

        <p className="mx-auto mt-4 max-w-md text-center text-[11px] leading-relaxed text-white/45">
          ניתן לבטל בכל עת · תמיכה 24/7 · חשבונית מס כדין
        </p>
      </div>

      <div className="h-12" />
    </div>
  );
}
