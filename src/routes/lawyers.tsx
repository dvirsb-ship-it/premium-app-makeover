import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Check, Clock, FileText, MapPin, Scale, ShieldCheck, Users } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { CountUp } from "../components/CountUp";
import { LawyerSpinHero } from "../components/LawyerSpinHero";

import { categoryIcon } from "../lib/category-icons";
import { translate, useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";

/**
 * הדף הציבורי לעורכי דין.
 *
 * ההחלטה המרכזית: לא להבטיח מה עורך הדין יקבל — להראות לו. הגיבור הוא
 * כרטיס פנייה אמיתי, בדיוק כפי שהוא נראה בפיד, עם פתיחת התזכיר המשפטי.
 * טענה על ערך אפשר לנסח יפה; ארטיפקט אי אפשר לזייף.
 *
 * הדף ממורכז לכל אורכו ולא מיושר לימין: מרכוז מוריד את המשקל הרשמי
 * ונותן את הקלילות שביקשנו, בלי לוותר על הרצינות שהתוכן מחייב.
 *
 * הקופי קצר בכוונה. כל טענה כאן ניתנת להצבעה על מקורה באפליקציה —
 * "עברו בדיקה משפטית" ולא "לקוחות מאומתים", ולא "יש להם עילה", כי
 * התקנון אומר שהבדיקה אינה ייעוץ משפטי.
 */

export const Route = createFileRoute("/lawyers")({
  head: () => ({
    meta: [
      { title: translate("lpMetaTitle", "he") },
      { name: "description", content: translate("lpMetaDesc", "he") },
      { property: "og:title", content: translate("lpMetaTitle", "he") },
      { property: "og:description", content: translate("lpMetaDesc", "he") },
      { property: "og:locale", content: "he_IL" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LawyersLanding,
});

/** חשיפה בגלילה — עדין וארוך, כדי שירגיש כמו נשימה ולא כמו קפיצה. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const STEPS: { key: StringKey; icon: typeof Scale }[] = [
  { key: "lpStep1", icon: Scale },
  { key: "lpStep2", icon: Users },
  { key: "lpStep3", icon: Clock },
];

const INCLUDED: StringKey[] = ["lpInc1", "lpInc2", "lpInc3", "lpInc4"];
const NOT_SOLD: StringKey[] = ["lpNot1", "lpNot2", "lpNot3", "lpNot4"];

function LawyersLanding() {
  const t = useT();
  const navigate = useNavigate();
  const CaseIcon = categoryIcon("נזיקין ותאונות");
  const cta = () => navigate({ to: "/auth" });

  return (
    <div className="dark relative min-h-screen overflow-x-hidden bg-background text-center text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(212,175,55,0.16),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_120%,rgba(56,89,168,0.14),transparent_55%)]"
      />

      {/* כותרת קבועה — נשארת מעל הסצנה הקולנועית */}
      <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-background/90 to-transparent">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} glow={false} />
            <span className="text-lg font-black tracking-tight">
              Just<span className="text-gradient-gold">Ask</span>
            </span>
          </div>
          <button
            type="button"
            onClick={cta}
            className="min-h-11 rounded-full border border-gold/35 px-4 text-[13px] font-bold text-gold-ink transition active:scale-95"
          >
            {t("lpNavCta")}
          </button>
        </div>
      </header>

      {/* ---------- הגיבור הקולנועי ---------- */}
      <div className="relative z-10">
        <LawyerSpinHero onCta={cta} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-20">


        {/* ---------- הארטיפקט ---------- */}
        <Reveal delay={0.1}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("lpArtifactLabel")}
          </p>
          <div
            className="liquid-glass mx-auto mt-4 max-w-md rounded-[26px] p-4 text-start shadow-2xl"
            aria-label={t("lpArtifactAria")}
          >
            <div className="flex items-stretch gap-3">
              <span className="chip-emblem grid size-[68px] shrink-0 place-items-center rounded-2xl">
                <CaseIcon className="relative z-10 size-7 text-gold-ink" strokeWidth={1.7} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                    {t("lpCardCat")}
                  </span>
                  <span className="rounded-full bg-warning-ink/12 px-2 py-0.5 text-[10px] font-bold text-warning-ink">
                    {t("lpCardUrgent")}
                  </span>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                    {t("lpCardMatch")}
                  </span>
                </div>
                <p className="mt-1 truncate text-[15px] font-semibold">{t("lpCardTitle")}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <MapPin className="size-3" aria-hidden />
                  {t("lpCardCity")}
                </p>
              </div>
            </div>

            <div className="mt-3.5 border-t border-foreground/10 pt-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold">
                <FileText className="size-3.5" aria-hidden />
                {t("lpMemoLabel")}
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {t("lpMemoBody")}
              </p>
              <div className="relative -mt-5 h-9 bg-gradient-to-t from-background to-transparent" />
            </div>
          </div>
        </Reveal>

        {/* ---------- המספרים ---------- */}
        <section className="mt-16 grid gap-8 border-y border-foreground/10 py-10 sm:grid-cols-3">
          {(
            [
              { to: 100, suffix: "%", key: "lpStat1" },
              { to: 21, suffix: "", key: "lpStat2" },
              { to: 6, suffix: "", key: "lpStat3" },
            ] as const
          ).map((s, i) => (
            <Reveal key={s.key} delay={i * 0.12}>
              <CountUp
                to={s.to}
                suffix={s.suffix}
                duration={2200}
                className="block text-[2.6rem] font-black leading-none text-gradient-gold"
              />
              <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">
                {t(s.key as StringKey)}
              </p>
            </Reveal>
          ))}
        </section>

        {/* ---------- איך זה עובד ---------- */}
        <section className="pt-16">
          <Reveal>
            <h2 className="text-[1.8rem] font-black tracking-tight">{t("lpHowTitle")}</h2>
          </Reveal>

          <ol className="mt-8 grid gap-3 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.key} delay={i * 0.14}>
                  <li className="liquid-glass h-full rounded-[22px] p-5">
                    <span className="mx-auto grid size-10 place-items-center rounded-full bg-gold/12 ring-1 ring-gold/25">
                      <Icon className="size-4.5 text-gold-ink" strokeWidth={1.9} aria-hidden />
                    </span>
                    <p className="mt-3 text-[11px] font-black tracking-[0.2em] text-gold">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      {t(s.key)}
                    </p>
                  </li>
                </Reveal>
              );
            })}
          </ol>

          <Reveal delay={0.2}>
            <p className="mt-6 text-[11.5px] leading-relaxed text-muted-foreground/80">
              {t("lpDisclaimer")}
            </p>
          </Reveal>
        </section>

        {/* ---------- כלול / לא נמכר ---------- */}
        <section className="grid gap-3 pt-16 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[26px] border border-gold/25 bg-gold/[0.05] p-6">
              <h3 className="text-[1.15rem] font-black">{t("lpIncTitle")}</h3>
              <ul className="mt-4 space-y-2.5 text-start">
                {INCLUDED.map((k) => (
                  <li key={k} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-gold-ink" strokeWidth={3} aria-hidden />
                    <span className="text-[13.5px] leading-relaxed">{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/*
            * מה שאיננו מוכרים. סעיף לא שגרתי בעמוד שיווק, ובכוונה: מול
            * עורך דין, מה שאתה מסרב למכור אומר יותר מהרשימה שמעליו.
            */}
          <Reveal delay={0.12}>
            <div className="h-full rounded-[26px] border border-foreground/12 p-6">
              <h3 className="text-[1.15rem] font-black">{t("lpNotTitle")}</h3>
              <ul className="mt-4 space-y-2.5 text-start">
                {NOT_SOLD.map((k) => (
                  <li key={k} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-muted-foreground/50" />
                    <span className="text-[13.5px] leading-relaxed text-muted-foreground">
                      {t(k)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ---------- סיום ---------- */}
        <Reveal>
          <section className="mt-16 rounded-[28px] border border-gold/25 bg-gold/[0.05] px-6 py-12">
            <ShieldCheck className="mx-auto size-8 text-gold" strokeWidth={1.8} aria-hidden />
            <h2 className="mt-4 text-[1.7rem] font-black tracking-tight">{t("lpFinalTitle")}</h2>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
              {t("lpFinalSub")}
            </p>
            <motion.button
              type="button"
              onClick={cta}
              whileTap={{ scale: 0.97 }}
              className="btn-gold mt-7 min-h-12 rounded-2xl px-8 py-3.5 text-[15px] font-bold"
            >
              {t("lpHeroCta")}
            </motion.button>
            <p className="mt-3 text-[12px] text-muted-foreground">{t("lpFinalNote")}</p>
          </section>
        </Reveal>

        <footer className="mt-12 border-t border-foreground/10 pt-6">
          <p className="text-[12.5px] text-muted-foreground">{t("lpFooter")}</p>
          <p className="mt-2 text-[11.5px] text-muted-foreground/70">
            © 2026 JustAsk · {t("lpFooterRights")}
          </p>
        </footer>
      </div>
    </div>
  );
}
