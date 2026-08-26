import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { NotificationBell } from "../components/NotificationBell";
import { CaseListSkeleton } from "../components/Skeleton";
import { Page, Rise } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useStatusMeta } from "../lib/status";
import { caseActionRank } from "../components/CaseWhatsNew";
import { JourneyBoard } from "../components/JourneyBoard";
import { cn } from "../lib/utils";
import { useT } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "My cases — JustAsk" },
      { name: "description", content: "Track your legal cases and lawyer offers in one place." },
      { property: "og:title", content: "My cases — JustAsk" },
      { property: "og:description", content: "Track your legal cases and lawyer offers in one place." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cases,
});

function Cases() {

  useRequireAuth();
  const { cases, casesError, casesLoaded } = useAppStore();
  const t = useT();
  const statusMeta = useStatusMeta();
  /*
   * השלד נגמר כשהנתונים באמת הגיעו — לא אחרי 280ms שרירותיות. הטיימר
   * הישן הציג למי שיש לו תיקים את מסך "עדיין לא שיתפת מקרה" בכל רשת
   * שאיטית מרבע שנייה, ואז הקפיץ את הרשימה מעליו.
   */
  const loading = !casesLoaded;

  /*
   * ═══ ממחסן קוביות למרכז המסלול — 26/8/2026 ═══
   *
   * דביר: "לשלב את התיקים שלי ואת דף המסלול ביחד — בוחרים תיק,
   * והלוח משתנה לפי השלב, במקום סתם קוביות אחת אחרי השנייה".
   * למעלה בוחר-תיק; מתחתיו לוח המסלול המלא של התיק הנבחר, עם הסבר
   * לכל שלב וכפתור הפעולה של השלב הנוכחי.
   */
  const ordered = [...cases].sort(
    (a, b) => caseActionRank(a.status) - caseActionRank(b.status) || b.createdAt - a.createdAt,
  );
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = ordered.find((c) => c.id === pickedId) ?? ordered[0];

  /* נקודת סטטוס על השבב — אותה שפת צבע: זהב=תורך, ירוק=בשורה, אפור=ממתין/סגור */
  const toneDot: Record<string, string> = {
    gold: "bg-gold",
    success: "bg-success",
    navy: "bg-foreground/60",
    muted: "bg-muted-foreground/50",
  };

  return (
    <AppShell>
      <Page>
        {/* אותו לוח כותרת כמו בבית — ראה את ההנמקה ב-`.masthead` */}
        <div className="masthead -mx-5 flex items-center justify-between px-5 pb-4 pt-8">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">{t("myCasesTitle")}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("myCasesSub")}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {/*
              * ל-/intake-tips, לא ל-/onboarding.
              *
              * /onboarding הוא מסך אישור התנאים מההרשמה, וסופו navigate("/").
              * כלומר לחיצה על "מקרה חדש" כאן שלחה את הלקוח לאשר תנאים שכבר
              * אישר, ומשם החזירה אותו למסך הבית — בלי שפתח מקרה. שני
              * המקומות במסך הזה היו היחידים באפליקציה שהצביעו לשם.
              */}
            <Link
              to="/intake-tips"
              className="chip-gold grid size-11 place-items-center rounded-2xl transition active:scale-95"
              aria-label={t("newCaseAria")}
            >
              <Plus className="size-5" />
            </Link>
          </div>
        </div>

        <div className="workspace -mx-5 min-h-screen px-5 pb-4 pt-6">
        {/* כשל טעינה אינו "אין תיקים" — ללקוח זה נראה כאילו הפנייה שלו נעלמה */}
        {casesError ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/[0.05] p-6 text-center" role="alert">
            <p className="text-sm font-bold text-foreground">{t("loadFailedTitle")}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t("casesErrorSub")}
            </p>
          </div>
        ) : loading ? (
          <CaseListSkeleton count={3} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={t("noCases")}
            action={
              <Link
                to="/intake-tips"
                className="btn-gold inline-flex rounded-2xl px-6 py-3 text-sm font-bold"
              >
                {t("shareNewCase")}
              </Link>
            }
          />
        ) : (
          <>
            {/* בוחר התיק — שבבים נגללים; הנבחר בדיו מלא */}
            {ordered.length > 1 && (
              <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
                {ordered.map((c) => {
                  const meta = statusMeta(c.status);
                  const picked = selected?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPickedId(c.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-bold transition",
                        picked
                          ? "bg-foreground text-background"
                          : "liquid-glass text-foreground/75",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("size-2 shrink-0 rounded-full", toneDot[meta.tone])}
                      />
                      <span className="max-w-[38vw] truncate">
                        {c.title || t("homeCaseUntitled")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selected && (
              <Rise key={selected.id}>
                <JourneyBoard active={selected} />
              </Rise>
            )}
          </>
        )}
        </div>
      </Page>
    </AppShell>
  );
}
