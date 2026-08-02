import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Award, Briefcase, GraduationCap, Scale } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useAppStore } from "../lib/store";
import { useT } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { avgResponseLabel, readLawyerStats } from "../lib/db";
import { SPECIALTIES, type SpecId } from "../lib/specialties";
import { SPEC_ICON } from "../lib/category-icons";

export const Route = createFileRoute("/lawyer-profile/$lawyerId")({
  head: () => ({
    meta: [
      { title: "JustAsk — Lawyer profile" },
      {
        name: "description",
        content: "Lawyer profile: expertise, experience, reviews and contact.",
      },
      { property: "og:title", content: "JustAsk — Lawyer profile" },
      {
        property: "og:description",
        content: "Full profile card for the lawyer you chose on JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LawyerProfile,
});

function LawyerProfile() {

  useRequireAuth();  const { lawyerId } = Route.useParams();
  const navigate = useNavigate();
  const { cases } = useAppStore();
  const t = useT();

  const chosenCase = cases.find((c) => c.chosenLawyerId === lawyerId);
  const lawyer =
    chosenCase?.interested.find((l) => l.id === lawyerId) ??
    cases.flatMap((c) => c.interested).find((l) => l.id === lawyerId);

  /*
   * ה-hooks האלה חייבים להיקרא לפני כל return מוקדם.
   *
   * הם ישבו מתחת ל-if (!lawyer), ולכן ברינדור שבו עורך הדין עוד לא נטען
   * הם לא נקראו כלל, וברינדור הבא — אחרי שהתיקים הגיעו מ-Firestore — כן.
   * זה בדיוק המצב ש-React זורק עליו "Rendered more hooks than during the
   * previous render", כלומר קריסה של הדף. וזה המסלול הרגיל: התיקים
   * נטענים בזמן אמת, אז הרינדור הראשון כמעט תמיד בלי עורך דין.
   */
  const [responseLabel, setResponseLabel] = useState<string | null>(null);
  useEffect(() => {
    void readLawyerStats(lawyerId)
      .then((st) => setResponseLabel(avgResponseLabel(st)))
      .catch(() => {});
  }, [lawyerId]);

  if (!lawyer) {
    return (
      <AppShell>
        <TopBar title={t("profileTitle")} onBack={() => navigate({ to: "/cases" })} />
        <div className="grid flex-1 place-items-center py-24 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {t("lawyerNotFound")}
            </p>
            <Link
              to="/cases"
              className="btn-gold mt-4 inline-flex rounded-full px-5 py-2 text-sm font-bold"
            >
              {t("toMyCases")}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  /*
   * "תיקים שנוהלו" היה Math.round(years * 8.4) — מספר מומצא שהוצג כעובדה.
   * דירוג וביקורות היו תמיד אפס כי אין עדיין מנגנון משוב. הוסרו.
   * נשאר רק מה שנמדד או ידוע: ותק, ומדד תגובתיות שהפלטפורמה מדדה בעצמה.
   */
  const stats = [
    ...(lawyer.years > 0
      ? [{ n: `${lawyer.years}`, label: t("yearsExperience"), icon: Award }]
      : []),
    ...(responseLabel ? [{ n: responseLabel, label: t("responseTimeLabel"), icon: Briefcase }] : []),
  ];

  return (
    <AppShell>
      <TopBar title={t("lawyerProfileTitle")} onBack={() => navigate({ to: "/cases" })} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="liquid-glass relative mt-5 overflow-hidden rounded-[28px] p-4"
      >
        <div className="flex items-center gap-4">
          {/* קודם הוצגה כאן תמונת סטוק עם alt של שם עורך הדין — כלומר תמונה
              של אדם אחר שהוצגה כמוהו. ראשי תיבות הם אמת. */}
          <div className="grid size-24 shrink-0 place-items-center rounded-3xl bg-gold/12 text-2xl font-black text-gold-ink ring-1 ring-gold/30">
            {lawyer.initials || lawyer.name.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            {lawyer.city && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
                {lawyer.city}
              </p>
            )}
            <h1 className="mt-1 truncate text-[22px] font-bold text-foreground">
              {lawyer.name.replace(/^עו״ד\s*/, "")}
            </h1>
            {lawyer.firm && (
              <p className="truncate text-[13px] text-muted-foreground">{lawyer.firm}</p>
            )}
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold">
              <Award className="size-3.5" strokeWidth={2.2} />
              {lawyer.years} {t("yearsExperience")}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15 + i * 0.08,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="liquid-glass flex flex-col items-center rounded-[24px] px-2 py-4 text-center"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-gold/12 ring-1 ring-gold/25">
                <Icon className="size-4 text-gold" strokeWidth={2} />
              </span>
              <p className="mt-2 text-[20px] font-bold leading-none text-foreground">
                {s.n}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                {s.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="liquid-glass mt-3 rounded-[24px] p-4"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
          {t("expertiseHeader")}
        </p>
        {/*
          * קודם ישבה כאן כותרת עם מחרוזת ריקה מתחתיה, כי specialty היה
          * מקודד "". עכשיו: התחומים שעורך הדין באמת סימן, כל אחד עם הסמל
          * שלו — אותו סמל שהלקוח כבר ראה על כרטיס התיק.
          */}
        {lawyer.specialties && lawyer.specialties.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {lawyer.specialties.map((id) => {
              const spec = SPECIALTIES.find((x) => x.id === id);
              const Icon = SPEC_ICON[id as SpecId] ?? Scale;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-3 py-1.5 text-[12.5px] font-semibold text-gold-ink ring-1 ring-gold/25"
                >
                  <Icon className="size-3.5" strokeWidth={2.1} aria-hidden />
                  {spec ? t(spec.labelKey) : id}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">{t("expertiseNone")}</p>
        )}

        {lawyer.university && (
          <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gold/10 ring-1 ring-gold/20">
              <GraduationCap className="size-4 text-gold-ink" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="text-[13px] text-foreground">{lawyer.university}</span>
          </div>
        )}
      </motion.div>

      {/* שני הכפתורים כאן לא היו מחוברים לכלום. פרטי הקשר נחשפים בדף התיק
          אחרי החיבור, ולכן ההפניה היא לשם — במקום כפתור שלא עושה דבר. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 pb-10"
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/cases" })}
          className="liquid-glass flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold text-foreground"
        >
          {t("toMyCases")}
        </button>
      </motion.div>
    </AppShell>
  );
}
