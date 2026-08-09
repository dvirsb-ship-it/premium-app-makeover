import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useT } from "../lib/i18n";
import { useAppStore } from "../lib/store";
import { useRequireAuth } from "../lib/require-auth";
import { readLawyerProfile, updateLawyerSpecialties } from "../lib/db";
import type { SpecId } from "../lib/specialties";
import type { Lang } from "../lib/settings";
import { SpecialtiesStep } from "./lawyer-onboarding";

/**
 * עריכת תחומי עיסוק — מסך נפרד, ובכוונה.
 *
 * עד היום הדרך היחידה לשנות תחום הייתה טופס האימות המלא: זהות, רישיון,
 * השכלה, העלאת מסמכים — ובסופו כתיבה של `status: "pending"`. כלומר עורך
 * דין **מאומת** שהוסיף תחום איבד את האימות ויצא מהפיד עד לאישור חוזר.
 * והאפליקציה עצמה שולחת אותו לשם, עם ההודעה "פניות בתחומים שלא סימנת"
 * וכפתור לידה. הפרס על ציות להנחיה היה איבוד הגישה.
 *
 * תחום עיסוק אינו טענת הסמכה. הוא לא דורש בדיקת מסמכים מחדש, ולכן הוא
 * לא צריך לעבור דרך האימות בכלל.
 *
 * המסך נבנה כמסך נפרד ולא כמצב בתוך טופס האימות, כדי שהזרימה הרגישה
 * ההיא לא תיגע בכלל. הבורר עצמו הוא אותה קומפוננטה — עורך דין רואה את
 * המסך שהוא כבר מכיר.
 */
export const Route = createFileRoute("/settings/specialties")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: EditSpecialties,
});

function EditSpecialties() {
  useRequireAuth();
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAppStore();

  const [selected, setSelected] = useState<Set<SpecId>>(new Set());
  const [langs, setLangs] = useState<Set<Lang>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void readLawyerProfile(user.uid)
      .then((p) => {
        if (cancelled) return;
        setSelected(new Set((p?.specialties ?? []) as SpecId[]));
        setLangs(new Set((p?.languages ?? []) as Lang[]));
        setLoaded(true);
      })
      /*
       * כשל קריאה אינו "אין לו תחומים". שמירה על סמך מצב ריק שנוצר
       * מתקלת רשת הייתה **מוחקת** את התחומים שלו — ולכן הכפתור נשאר
       * מושבת עד שהמצב האמיתי נטען.
       */
      .catch(() => {
        if (!cancelled) toast.error(t("loadFailedTitle"));
      });
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  function toggle(id: SpecId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLang(l: Lang) {
    setLangs((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }

  function save() {
    if (!user || saving || !loaded) return;
    setSaving(true);
    void updateLawyerSpecialties(user.uid, [...selected], [...langs])
      .then(() => {
        toast.success(t("savedToast"));
        navigate({ to: "/lawyer" });
      })
      .catch(() => {
        setSaving(false);
        toast.error(t("actionFailedRetry"));
      });
  }

  return (
    <AppShell>
      <TopBar title={t("stepSpecTitle")} subtitle={t("stepSpecDesc")} />
      <Page>
        <div className="pb-28 pt-4">
          <SpecialtiesStep
            selected={selected}
            toggle={toggle}
            langs={langs}
            toggleLang={toggleLang}
          />
        </div>
        {/*
          * הכפתור מוצמד לתחתית: 21 תחומים בשש קבוצות הם מסך ארוך, ומי
          * שסימן תחום בראש הרשימה לא אמור לגלול עד הסוף כדי לשמור.
          */}
        <div className="sticky bottom-[var(--nav-inset)] border-t border-border bg-background/80 px-1 py-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={save}
            disabled={saving || !loaded || selected.size === 0}
            className="btn-gold min-h-11 w-full rounded-2xl py-3.5 text-[15px] font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("saveAction")}
          </button>
        </div>
      </Page>
    </AppShell>
  );
}
