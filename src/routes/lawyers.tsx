import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Clock, FileText, MapPin, Scale, ShieldCheck, Users } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { categoryIcon } from "../lib/category-icons";
import { translate, useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";

/**
 * הדף הציבורי לעורכי דין.
 *
 * זה הדף היחיד באפליקציה שנועד למי שאינו מחובר, והוא נבנה למטרה אחת:
 * שעורך דין שקיבל קישור בוואטסאפ יבין תוך שלושים שניות מה הוא מקבל,
 * ויסמוך מספיק כדי להירשם.
 *
 * ההחלטה המרכזית בעיצוב: לא להבטיח מה הוא יקבל — אלא להראות לו את זה.
 * הגיבור של הדף הוא כרטיס פנייה אמיתי, בדיוק כפי שהוא נראה בפיד, עם
 * התזכיר המשפטי שנכתב עליו. טענה על ערך אפשר לנסח יפה; ארטיפקט אי אפשר
 * לזייף, והוא זה שמשכנע.
 *
 * כל מספר בדף הזה נכון מילולית. "100% מהפניות עברו בדיקה משפטית" — ולא
 * "לקוחות מאומתים", כי איננו מאמתים לקוחות; ולא "יש להם עילה", כי
 * התקנון שלנו אומר שהבדיקה אינה ייעוץ משפטי, ואסור לנו לסתור את עצמנו
 * בעמוד השיווק.
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

/* אותם שלבים שהעו"ד רואה בסוף הפיד — אותו סיפור, אותן מילים */
const STEPS: { key: StringKey; icon: typeof Scale }[] = [
  { key: "lpStep1", icon: Scale },
  { key: "lpStep2", icon: Users },
  { key: "lpStep3", icon: Clock },
];

const INCLUDED: StringKey[] = [
  "lpInc1",
  "lpInc2",
  "lpInc3",
  "lpInc4",
  "lpInc5",
];

/* מה שאיננו מוכרים — הסעיף שמייצר את האמון, לא הרשימה שמעליו */
const NOT_SOLD: StringKey[] = ["lpNot1", "lpNot2", "lpNot3", "lpNot4"];

function LawyersLanding() {
  const t = useT();
  const navigate = useNavigate();
  const CaseIcon = categoryIcon("נזיקין ותאונות");

  const cta = () => navigate({ to: "/auth" });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* אווירת הסטודיו של האפליקציה — הדף הוא המשך שלה, לא אתר נפרד */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(212,175,55,0.14),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_120%,rgba(56,89,168,0.14),transparent_55%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-20">
        {/* ---------- כותרת ---------- */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} glow={false} />
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
        </header>

        {/* ---------- גיבור: הטענה משמאל, הארטיפקט מימין ---------- */}
        <section className="grid items-center gap-10 pb-16 pt-8 md:grid-cols-2 md:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-3.5 py-1.5 text-[12px] font-bold text-gold-ink">
              <span className="size-1.5 rounded-full bg-gold" />
              {t("lpBadge")}
            </span>

            <h1 className="mt-5 text-[2.6rem] font-black leading-[1.08] tracking-tight md:text-[3.2rem]">
              {t("lpH1a")}
              <br />
              <span className="text-gradient-gold">{t("lpH1b")}</span>
            </h1>

            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted-foreground">
              {t("lpSub")}
            </p>

            <button
              type="button"
              onClick={cta}
              className="btn-gold mt-7 min-h-12 w-full rounded-2xl px-7 py-3.5 text-[15px] font-bold sm:w-auto"
            >
              {t("lpHeroCta")}
            </button>
            <p className="mt-2.5 text-[12px] text-muted-foreground">
              {t("lpHeroNote")}
            </p>
          </motion.div>

          {/*
            * הארטיפקט. זה בדיוק מה שנוחת אצלו בפיד — אותו כרטיס, אותם
            * תגים, ומתחתיו פתיחה של התזכיר. אין כאן טענה שיווקית אחת.
            */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: -1.5 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
            aria-label={t("lpArtifactAria")}
          >
            <div className="liquid-glass rounded-[26px] p-4 shadow-2xl">
              <div className="flex items-stretch gap-3">
                <span className="chip-emblem grid size-[72px] shrink-0 place-items-center rounded-2xl">
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
                  <p className="mt-1 truncate text-[15px] font-semibold">
                    {t("lpCardTitle")}
                  </p>
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
                {/* דהייה — התזכיר ממשיך, וזה מה שהוא מקבל בפנים */}
                <div className="relative -mt-4 h-8 bg-gradient-to-t from-background to-transparent" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ---------- שלוש עובדות ---------- */}
        <section className="grid gap-3 border-y border-foreground/10 py-8 sm:grid-cols-3">
          {(
            [
              ["100%", "lpStat1"],
              [t("lpStat2Val"), "lpStat2"],
              [t("lpStat3Val"), "lpStat3"],
            ] as const
          ).map(([val, key]) => (
            <div key={key} className="text-center">
              {/* dir=ltr — אחרת ₪ ומספר מתהפכים זה מול זה בעברית */}
              <p dir="ltr" className="text-[2rem] font-black leading-none text-gradient-gold">
                {val}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                {t(key as StringKey)}
              </p>
            </div>
          ))}
        </section>

        {/* ---------- איך זה עובד ---------- */}
        <section className="pt-14">
          <h2 className="text-[1.7rem] font-black tracking-tight">{t("lpHowTitle")}</h2>
          <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed text-muted-foreground">
            {t("lpHowSub")}
          </p>

          <ol className="mt-7 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.key} className="liquid-glass rounded-[22px] p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-full bg-gold/12 text-[13px] font-black text-gold-ink ring-1 ring-gold/25">
                      {i + 1}
                    </span>
                    <Icon className="size-5 text-gold/50" strokeWidth={1.8} aria-hidden />
                  </div>
                  <p className="mt-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {t(s.key)}
                  </p>
                </li>
              );
            })}
          </ol>

          <p className="mt-5 rounded-2xl border border-foreground/10 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            {t("lpDisclaimer")}
          </p>
        </section>

        {/* ---------- מה כלול, ומה איננו מוכרים ---------- */}
        <section className="grid gap-4 pt-14 md:grid-cols-2">
          <div className="rounded-[26px] border border-gold/25 bg-gold/[0.05] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
              {t("lpIncEyebrow")}
            </p>
            <h3 className="mt-2 text-[1.3rem] font-black">{t("lpIncTitle")}</h3>
            <ul className="mt-4 space-y-2.5">
              {INCLUDED.map((k) => (
                <li key={k} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold-ink" strokeWidth={3} aria-hidden />
                  <span className="text-[13.5px] leading-relaxed">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/*
            * מה שאיננו מוכרים. סעיף לא שגרתי בעמוד שיווק, והוא כאן בכוונה:
            * מול עורך דין, מה שאתה מסרב למכור אומר יותר מהרשימה שמעליו.
            */}
          <div className="rounded-[26px] border border-foreground/12 p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("lpNotEyebrow")}
            </p>
            <h3 className="mt-2 text-[1.3rem] font-black">{t("lpNotTitle")}</h3>
            <ul className="mt-4 space-y-2.5">
              {NOT_SOLD.map((k) => (
                <li key={k} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-2 h-px w-3 shrink-0 bg-muted-foreground/50"
                  />
                  <span className="text-[13.5px] leading-relaxed text-muted-foreground">
                    {t(k)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- סיום ---------- */}
        <section className="mt-14 rounded-[28px] border border-gold/25 bg-gold/[0.05] px-6 py-10 text-center">
          <ShieldCheck className="mx-auto size-8 text-gold" strokeWidth={1.8} aria-hidden />
          <h2 className="mt-4 text-[1.6rem] font-black tracking-tight">
            {t("lpFinalTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            {t("lpFinalSub")}
          </p>
          <button
            type="button"
            onClick={cta}
            className="btn-gold mt-6 min-h-12 rounded-2xl px-8 py-3.5 text-[15px] font-bold"
          >
            {t("lpHeroCta")}
          </button>
          <p className="mt-3 text-[12px] text-muted-foreground">{t("lpFinalNote")}</p>
        </section>

        <footer className="mt-12 border-t border-foreground/10 pt-6 text-center">
          <p className="text-[12.5px] text-muted-foreground">{t("lpFooter")}</p>
          <p className="mt-2 text-[11.5px] text-muted-foreground/70">
            © 2026 JustAsk · {t("lpFooterRights")}
          </p>
        </footer>
      </div>
    </div>
  );
}
