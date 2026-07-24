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
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useSettings } from "../lib/settings";

export const Route = createFileRoute("/lawyer-subscription")({
  head: () => ({
    meta: [
      { title: "JustAsk Pro — מנוי לעורכי דין" },
      {
        name: "description",
        content:
          "פתחו גישה מלאה ללידים איכותיים, כלי AI ותכונות מתקדמות לעורכי דין.",
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
    <AppShell>
      <TopBar title="JustAsk Pro" onBack={() => navigate({ to: "/lawyer" })} />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-center"
      >
        <p className="text-[11px] font-semibold tracking-[0.28em] text-gold">
          LAWYER MEMBERSHIP
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.05] tracking-tight text-foreground">
          הפכו את הלידים
          <br />
          <span className="text-gradient-gold">ללקוחות</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
          גישה בלתי מוגבלת לפניות איכותיות, כלי AI מתקדמים והתראות בזמן אמת —
          הכל במקום אחד.
        </p>
      </motion.div>

      {/* Features */}
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="liquid-glass mt-7 space-y-3 rounded-[24px] p-5"
      >
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.li
              key={f.label}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.3 + i * 0.06,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex items-center gap-3"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-gold/12 ring-1 ring-gold/25">
                <Icon className="size-4 text-gold" strokeWidth={1.8} />
              </span>
              <span className="text-[14px] font-medium text-foreground">
                {f.label}
              </span>
            </motion.li>
          );
        })}
      </motion.ul>

      {/* Pricing cards */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          type="button"
          onClick={() => setPlan("monthly")}
          className={`relative overflow-hidden rounded-[22px] p-4 text-start transition ${
            plan === "monthly" ? "liquid-glass-selected" : "liquid-glass"
          }`}
        >
          <p className="text-[12px] font-medium text-muted-foreground">חודשי</p>
          <p className="mt-2 text-[22px] font-bold tracking-tight text-foreground">
            ₪199
          </p>
          <p className="mt-4 text-[11px] text-muted-foreground">חיוב חודשי</p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          type="button"
          onClick={() => setPlan("yearly")}
          className={`relative overflow-hidden rounded-[22px] p-4 text-start transition ${
            plan === "yearly" ? "liquid-glass-selected" : "liquid-glass"
          }`}
        >
          <p className="text-[12px] font-medium text-muted-foreground">שנתי</p>
          <p className="mt-2 text-[22px] font-bold tracking-tight text-foreground">
            ₪1,990
          </p>
          <p className="mt-4 text-[11px] text-muted-foreground">חיוב שנתי</p>
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.95,
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="btn-gold absolute end-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold"
          >
            חסכו 17%
          </motion.span>
        </motion.button>
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        type="button"
        className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-[22px] py-4 text-[15px] font-bold"
      >
        <Check className="size-5" strokeWidth={2.4} />
        הצטרפו ל-Pro
        <ChevronLeft className={`size-4 ${flip}`} strokeWidth={2.4} />
      </motion.button>

      <p className="mt-4 pb-10 text-center text-[11px] leading-relaxed text-muted-foreground">
        ניתן לבטל בכל עת · תמיכה 24/7 · חשבונית מס כדין
      </p>
    </AppShell>
  );
}
