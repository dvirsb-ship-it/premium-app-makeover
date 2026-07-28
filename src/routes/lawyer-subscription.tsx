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
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/lawyer-subscription")({
  head: () => ({
    meta: [
      { title: "JustAsk Pro — Lawyer membership" },
      {
        name: "description",
        content:
          "Unlock full access to quality leads, AI tools and advanced features for lawyers.",
      },
      { property: "og:title", content: "JustAsk Pro — Lawyer membership" },
      {
        property: "og:description",
        content: "Monthly or yearly membership for lawyers on JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LawyerSubscription,
});

const features: { icon: typeof Layers; key: StringKey }[] = [
  { icon: Layers, key: "subFeat1" },
  { icon: Smartphone, key: "subFeat2" },
  { icon: InfinityIcon, key: "subFeat3" },
  { icon: Sparkles, key: "subFeat4" },
  { icon: Users, key: "subFeat5" },
];

function LawyerSubscription() {

  useRequireAuth();  const navigate = useNavigate();
  const { dir } = useSettings();
  const t = useT();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const flip = dir === "rtl" ? "" : "rotate-180";

  return (
    <AppShell>
      <TopBar title="JustAsk Pro" onBack={() => navigate({ to: "/lawyer" })} />

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
          {t("subHeroTitle1")}
          <br />
          <span className="text-gradient-gold">{t("subHeroTitle2")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
          {t("subHeroDesc")}
        </p>
      </motion.div>

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
              key={f.key}
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
                {t(f.key)}
              </span>
            </motion.li>
          );
        })}
      </motion.ul>

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
          <p className="text-[12px] font-medium text-muted-foreground">{t("planMonthly")}</p>
          <p className="mt-2 text-[22px] font-bold tracking-tight text-foreground">
            ₪249
          </p>
          <p className="mt-4 text-[11px] text-muted-foreground">{t("monthlyBill")}</p>
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
          <p className="text-[12px] font-medium text-muted-foreground">{t("planYearly")}</p>
          <p className="mt-2 text-[22px] font-bold tracking-tight text-foreground">
            ₪2,490
          </p>
          <p className="mt-4 text-[11px] text-muted-foreground">{t("yearlyBill")}</p>
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
            {t("save17")}
          </motion.span>
        </motion.button>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        type="button"
        className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-[22px] py-4 text-[15px] font-bold"
      >
        <Check className="size-5" strokeWidth={2.4} />
        {t("joinPro")}
        <ChevronLeft className={`size-4 ${flip}`} strokeWidth={2.4} />
      </motion.button>

      <p className="mt-4 pb-10 text-center text-[11px] leading-relaxed text-muted-foreground">
        {t("subFineText")}
      </p>
    </AppShell>
  );
}
