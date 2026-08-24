import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Plus, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { EmptyState } from "../components/EmptyState";
import { NotificationBell } from "../components/NotificationBell";
import { CaseListSkeleton } from "../components/Skeleton";
import { Page, Stagger, Rise, Pressable } from "../components/motion";
import { useAppStore } from "../lib/store";
import { toneClasses, useStatusMeta, useTimeAgo } from "../lib/status";
import { CaseWhatsNew } from "../components/CaseWhatsNew";
import { useSettings } from "../lib/settings";
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
  const navigate = useNavigate();
  const { cases, casesError, casesLoaded } = useAppStore();
  const { dir } = useSettings();
  const t = useT();
  const statusMeta = useStatusMeta();
  const timeAgo = useTimeAgo();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  /*
   * השלד נגמר כשהנתונים באמת הגיעו — לא אחרי 280ms שרירותיות. הטיימר
   * הישן הציג למי שיש לו תיקים את מסך "עדיין לא שיתפת מקרה" בכל רשת
   * שאיטית מרבע שנייה, ואז הקפיץ את הרשימה מעליו.
   */
  const loading = !casesLoaded;

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
          <Stagger className="space-y-4">
            {cases.map((c) => {
              const meta = statusMeta(c.status);
              return (
                <Rise key={c.id}>
                  <Pressable
                    onClick={() =>
                      navigate({ to: "/case/$caseId", params: { caseId: c.id } })
                    }
                    className={`liquid-glass w-full rounded-3xl p-5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[meta.tone]}`}
                      >
                        {meta.label}
                      </span>
                      <Chevron className="size-5 shrink-0 text-muted-foreground/50" />
                    </div>
                    <h3 className="mt-3 text-base font-bold leading-snug text-foreground">
                      {c.title || t("homeCaseUntitled")}
                    </h3>
                    {/*
                      * התחום הוא **סיווג**, ולכן שבב דיו — אותו כלל שכבר
                      * נאכף בפיד עורך הדין (lawyer.tsx). כאן הוא היה טקסט
                      * אפור נספח לחותמת הזמן, כלומר אותה עובדה בדיוק נראתה
                      * כמו מלל אצל הלקוח וכמו עובדה מוטבעת אצל עורך הדין.
                      * זה ההבדל שדביר זיהה בין שני הצדדים (17/8/2026).
                      *
                      * בזמן הוולידציה אין עדיין קטגוריה — ואז אין שבב ואין
                      * נקודה יתומה, רק הזמן.
                      */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {c.category && (
                        <span className="chip-navy rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {c.category}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <CaseWhatsNew caseId={c.id} status={c.status} />
                    {/*
                      * הבדיקה רצה עכשיו — 10-15 שניות של עבודת AI אמיתית.
                      * בלי השורה הזו הכרטיס נראה ריק ושבור; איתה הוא נראה
                      * כמו מה שהוא: עבודה שמתבצעת ברגעים אלה.
                      */}
                    {c.status === "validating" && (
                      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gold/8 px-3 py-2">
                        <span className="relative flex size-2.5">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
                          <span className="relative inline-flex size-2.5 rounded-full bg-gold" />
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {t("validatingCardHint")}
                        </span>
                      </div>
                    )}
                    {c.status === "connected" && (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-success/10 px-3 py-2">
                        <Users className="size-4 text-success" />
                        <span className="text-xs font-semibold text-success">
                          {t("connectedWithLawyer")}
                        </span>
                      </div>
                    )}
                  </Pressable>
                </Rise>
              );
            })}
          </Stagger>
        )}
        </div>
      </Page>
    </AppShell>
  );
}
