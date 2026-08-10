import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BellRing, Check, FileText, Gauge, Layers, Tag } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
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
          "What's included for verified lawyers on JustAsk during the launch period.",
      },
      { property: "og:title", content: "JustAsk Pro — Lawyer membership" },
      {
        property: "og:description",
        content: "Everything is open and free for verified lawyers during launch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LawyerSubscription,
});

/*
 * המסך הזה הציג ₪249 ו-₪2,490 ו"חסכו 17%" — ומיד מתחתם הודעה שהכול חינם.
 * שני המסרים ביחד קוראים כמו טריק, לא כמו מתנה. מחיר שאי אפשר לשלם אותו
 * אינו מחיר; הוא רק מלמד את עורך הדין שלא כל מה שכתוב כאן נכון.
 * במקומו: מה באמת פתוח לו היום, ומה יקרה כשהתקופה תסתיים.
 */
const included: { icon: typeof Layers; key: StringKey }[] = [
  { icon: Layers, key: "proNow1" },
  { icon: FileText, key: "proNow2" },
  { icon: BellRing, key: "proNow3" },
  { icon: Tag, key: "proNow4" },
  { icon: Gauge, key: "proNow5" },
];

function LawyerSubscription() {
  useRequireAuth();
  const navigate = useNavigate();
  const t = useT();

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
          {t("proHeroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
          {t("subHeroDesc")}
        </p>
      </motion.div>

      {/* ההודעה קודם — היא הכותרת האמיתית של הדף, לא הערת שוליים */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mt-7 rounded-[24px] border border-gold/30 bg-gold/[0.07] p-5 text-center"
      >
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] shadow-[0_10px_28px_-10px_rgba(212,175,55,0.7)]">
          <Check className="size-6 text-[#0F172A]" strokeWidth={3} />
        </span>
        <p className="mt-3 text-[15px] font-bold text-foreground">
          {t("proLaunchFree")}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {t("proLaunchFreeSub")}
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        className="mt-7"
      >
        <h2 className="rule-gold px-1 text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("proNowHeader")}
        </h2>
        <ul className="liquid-glass mt-3 space-y-3.5 rounded-[24px] p-5">
          {included.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.li
                key={f.key}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.34 + i * 0.06,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-gold/12 ring-1 ring-gold/25">
                  <Icon className="size-4 text-gold" strokeWidth={1.8} />
                </span>
                <span className="text-[13.5px] font-medium leading-relaxed text-foreground">
                  {t(f.key)}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-6 pb-10"
      >
        <h2 className="rule-gold px-1 text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("proLaterHeader")}
        </h2>
        <p className="mt-3 rounded-[22px] border border-border bg-card p-5 text-[13px] leading-relaxed text-muted-foreground">
          {t("proLaterSub")}
        </p>

        {/*
          * "תשלום לא קונה מקום בתור" — נאמר כאן ולא רק במסמכים.
          *
          * זו הטענה החזקה ביותר שיש לנו מול שאלת התיווך, והמוצר עצמו לא
          * אמר אותה לאיש. עורך דין ששוקל להצטרף שואל בדיוק את זה, ומי
          * שנכווה מחברות לידים מניח שהתשובה היא כן. מוטב שיקרא אותה
          * בעצמו לפני שהוא מקליד כרטיס, ולא ימצא אותה בתקנון בדיעבד.
          */}
        <div className="note-gold mt-3 rounded-[22px] p-5">
          <p className="text-[13px] font-bold text-foreground">
            {/* סימון על הכותרת בלבד — זו הטענה, וכל השאר הוא ההסבר שלה */}
            <span className="mark-gold">{t("proNoPriorityTitle")}</span>
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("proNoPriority")}
          </p>
        </div>
      </motion.section>
    </AppShell>
  );
}
