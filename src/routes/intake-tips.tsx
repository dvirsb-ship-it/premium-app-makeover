import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarDays, Camera, MessageCircle, Sparkles, FileText } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Rise, Stagger, Pressable } from "../components/motion";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/intake-tips")({
  head: () => ({
    meta: [
      { title: "JustAsk — How to share your case" },
      {
        name: "description",
        content:
          "Quick tips to share your case with JustAsk AI — speak naturally, add dates, photos and details for the best match.",
      },
      { property: "og:title", content: "JustAsk — How to share your case" },
      {
        property: "og:description",
        content: "Speak naturally, add dates and photos — get the best legal match.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntakeTips,
});

function IntakeTips() {
  useRequireAuth();
  const navigate = useNavigate();
  const t = useT();
  const { dir } = useSettings();
  const ArrowNext = dir === "rtl" ? ArrowLeft : ArrowRight;

  const tips = [
    {
      icon: MessageCircle,
      title: t("tipTalkTitle"),
      body: t("tipTalkBody"),
    },
    {
      icon: CalendarDays,
      title: t("tipDatesTitle"),
      body: t("tipDatesBody"),
    },
    {
      icon: Camera,
      title: t("tipPhotosTitle"),
      body: t("tipPhotosBody"),
    },
    {
      icon: FileText,
      title: t("tipDetailsTitle"),
      body: t("tipDetailsBody"),
    },
  ];

  return (
    <AppShell>
      <TopBar title={t("intakeTipsTitle")} subtitle={t("intakeTipsSubtitle")} />

      <div className="flex-1 pb-8 pt-4">
        <Rise>
          <div className="liquid-glass mb-6 flex items-start gap-3 rounded-3xl p-4 shadow-luxe">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-lg shadow-gold/25">
              <Sparkles className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-foreground">
                {t("tipsHeroTitle")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("tipsHeroBody")}
              </p>
            </div>
          </div>
        </Rise>

        <Stagger className="space-y-3">
          {tips.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <Rise key={i}>
                <div className="liquid-glass flex items-start gap-3 rounded-2xl p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-foreground/5 text-foreground">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold leading-tight text-foreground">
                      {tip.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {tip.body}
                    </p>
                  </div>
                </div>
              </Rise>
            );
          })}
        </Stagger>

        <Rise>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("tipsFooterNote")}
          </p>
        </Rise>
      </div>

      <div className="sticky bottom-0 -mx-5 px-5 pb-6 pt-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-8 h-10 bg-gradient-to-b from-transparent to-background"
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Pressable
            onClick={() => navigate({ to: "/intake" })}
            className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold"
          >
            <span>{t("tipsStartCta")}</span>
            <ArrowNext className="size-5" />
          </Pressable>
        </motion.div>
      </div>
    </AppShell>
  );
}
