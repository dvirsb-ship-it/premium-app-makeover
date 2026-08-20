import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Check, FileText, ListChecks } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { fbDb, fbAuth } from "../lib/firebase";
import { SPECIALTIES } from "../lib/specialties";
import { categoryIcon } from "../lib/category-icons";
import { cn } from "../lib/utils";
import { haptic } from "../lib/haptics";

export const Route = createFileRoute("/summary/$caseId")({
  head: () => ({
    meta: [
      { title: "הסיכום שלך — JustAsk" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SummaryReview,
});

/**
 * אישור הסיכום ובחירת התחום.
 *
 * ═══ המסך שהחליף את ההכרעה — 20/8/2026 ═══
 *
 * כאן עמד קודם מסך שהודיע לפונה אם "עבר את הבדיקה". הסקירה המשפטית
 * קבעה שהכרעה כזו היא ייחוד מקצוע, ולכן אין יותר מה להודיע — יש מה
 * **להראות**: את מה שנרשם ממנו, כדי שיתקן ויאשר.
 *
 * זה גם מה שהופך את הסיכום למותר: 4.1 מתיר סיכום עובדתי בתנאי
 * שהפונה בודק ומאשר אותו. המסך הזה הוא התנאי.
 *
 * ובחירת התחום כאן ולא במודל: 4.2 מתיר ניתוב לפי קטגוריה **שהמשתמש
 * בחר**. לכן אין הצעה מסומנת מראש ואין "מומלץ" — רשימה, והוא בוחר.
 */
function SummaryReview() {
  useRequireAuth();
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(fbDb(), "cases", caseId));
        if (cancelled || !snap.exists()) return;
        const d = snap.data();
        setTitle(String(d.title ?? ""));
        setSummary(String(d.summary ?? ""));
        setChecklist(Array.isArray(d.clientChecklist) ? d.clientChecklist : []);
        /* כבר אושר — אין מה לאשר שוב */
        if (d.status !== "summary_ready") navigate({ to: "/case/$caseId", params: { caseId } });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, user, navigate]);

  async function approve() {
    if (!category || saving) return;
    setSaving(true);
    setErr(false);
    try {
      const { approveSummaryFn } = await import("../lib/ai/intake.functions");
      const idToken = await fbAuth().currentUser?.getIdToken();
      await approveSummaryFn({ data: { caseId, idToken, summary, category } });
      haptic("success");
      // ישר לבחירה — זה הצעד הבא היחיד, ואין סיבה לעצור בדרך
      navigate({ to: "/choose/$caseId", params: { caseId } });
    } catch {
      setErr(true);
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <TopBar title={t("sumTitle")} subtitle={t("sumSub")} />
      <Page>
        <Stagger className="space-y-4 pb-28 pt-4">
          <Rise>
            {/* צבע מפורש: .note-gold אינו מגדיר צבע טקסט, וכל שאר הצרכנים
                  שלו באפליקציה קובעים אותו בעצמם. הסתמכות על ירושה כאן
                  נתנה 1.06:1 בכהה בבדיקה. /75 נותן 7.71 ו-10.31. */}
            <p className="note-gold rounded-2xl text-[12.5px] leading-relaxed text-foreground/75">
              {t("sumIntro")}
            </p>
          </Rise>

          {loading ? (
            <Rise>
              <div className="liquid-glass h-40 animate-pulse rounded-3xl" />
            </Rise>
          ) : (
            <>
              <Rise>
                <div className="liquid-glass rounded-3xl p-5">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-gold-ink dark:text-gold" aria-hidden />
                    <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("sumEdit")}
                    </span>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={9}
                      aria-label={t("sumTitle")}
                      className="w-full resize-none rounded-2xl border border-border bg-background/60 p-3.5 text-[14px] leading-relaxed text-foreground"
                    />
                  </label>
                </div>
              </Rise>

              {checklist.length > 0 && (
                <Rise>
                  <div className="recessed rounded-3xl bg-[var(--recess-fill)] p-5">
                    <div className="flex items-center gap-2">
                      <ListChecks className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <h3 className="text-[13px] font-bold text-foreground">{t("sumBring")}</h3>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {checklist.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground/75">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-gold-ink dark:text-gold" strokeWidth={3} aria-hidden />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Rise>
              )}

              <Rise>
                <div className="liquid-glass rounded-3xl p-5">
                  <h3 className="text-[14px] font-bold text-foreground">{t("sumPickField")}</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">{t("sumPickHint")}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {SPECIALTIES.map((s) => {
                      const label = t(s.labelKey);
                      const Icon = categoryIcon(label);
                      const on = category === label;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setCategory(label)}
                          aria-pressed={on}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2.5 text-start text-[12.5px] font-semibold transition",
                            on
                              ? "chip-gold"
                              : "border border-border bg-background/50 text-foreground/80",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Rise>
            </>
          )}
        </Stagger>
      </Page>

      {/* פס הפעולה — נשאר בהישג יד גם ברשימה ארוכה */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {err && <p className="mb-2 text-center text-[12px] text-destructive-ink">{t("sumErr")}</p>}
        <button
          type="button"
          onClick={() => void approve()}
          disabled={!category || saving}
          className="btn-gold min-h-12 w-full rounded-2xl text-[15px] font-bold disabled:opacity-45"
        >
          {saving ? t("sumSaving") : category ? t("sumApprove") : t("sumNeedField")}
        </button>
      </div>
    </AppShell>
  );
}
