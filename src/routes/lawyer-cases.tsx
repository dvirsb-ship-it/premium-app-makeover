import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { watchLawyerCases, type LawyerCase } from "../lib/db";
import { categoryIcon } from "../lib/category-icons";

export const Route = createFileRoute("/lawyer-cases")({
  /* עמוד אישי מאחורי התחברות — אין סיבה שיהיה במנוע חיפוש */
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: LawyerCases,
});

/**
 * התיקים הפעילים של עורך הדין — אלה שלקוח בחר בו לטפל בהם.
 *
 * עד עכשיו המסך הזה לא היה קיים. ברגע שלקוח בחר, התיק יצא מהפיד (נכון,
 * הוא כבר לא ליד) ולא הופיע בשום מקום אחר — הדרך היחידה להגיע אליו הייתה
 * ההתראה. עורך דין עם כמה לקוחות פעילים נשאר בלי מסך עבודה בכלל.
 */
function LawyerCases() {
  useRequireAuth();
  const navigate = useNavigate();
  const { dir } = useSettings();
  const t = useT();
  const { user } = useAppStore();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const [rows, setRows] = useState<LawyerCase[]>([]);
  const [loaded, setLoaded] = useState(false);
  /* כשל טעינה אינו "אין תיקים" — לעורך דין זה נראה כאילו הלקוחות נעלמו */
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchLawyerCases(
      user.uid,
      (r) => {
        setRows(r);
        setLoaded(true);
        setFailed(false);
      },
      () => {
        setFailed(true);
        setLoaded(true);
      },
    );
  }, [user]);

  return (
    <AppShell withNav>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="pt-6"
      >
        <p className="text-xs font-medium tracking-[0.22em] text-gold">
          JUSTASK · PRO
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {t("lawyerActiveTitle")}
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {t("lawyerActiveSub")}
        </p>
      </motion.header>

      <div className="mt-6 space-y-3 pb-4">
        {failed ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/[0.05] p-6 text-center" role="alert">
            <p className="text-sm font-bold text-foreground">{t("loadFailedTitle")}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t("loadFailedSub")}
            </p>
          </div>
        ) : loaded && rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold/10 ring-1 ring-gold/20">
              <Briefcase className="size-5 text-gold-ink" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-[14px] font-bold text-foreground">
              {t("lawyerActiveEmpty")}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {t("lawyerActiveEmptySub")}
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/lawyer" })}
              className="btn-gold mt-5 inline-flex rounded-2xl px-5 py-2.5 text-[13px] font-bold"
            >
              {t("lawyerActiveToFeed")}
            </button>
          </div>
        ) : (
          rows.map((c, i) => {
            const Icon = categoryIcon(c.category);
            return (
              <motion.button
                key={c.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                onClick={() =>
                  navigate({ to: "/lawyer-case/$caseId", params: { caseId: c.id } })
                }
                className="liquid-glass flex w-full items-stretch gap-3 rounded-[24px] p-3 text-start"
              >
                <span className="chip-emblem grid size-[72px] shrink-0 place-items-center rounded-2xl">
                  <Icon className="relative z-10 size-7 text-gold-ink" strokeWidth={1.7} aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                        {c.category}
                      </span>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                        {t("lawyerActiveBadge")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[15px] font-semibold text-foreground">
                      {c.title}
                    </p>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {c.clientName || t("lawyerActiveClient")}
                    {c.location ? ` · ${c.location}` : ""}
                  </p>
                </div>
                <Chevron className="my-auto size-5 shrink-0 text-muted-foreground/50" />
              </motion.button>
            );
          })
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
