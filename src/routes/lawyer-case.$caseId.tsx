import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Check, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useT } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import {
  markMilestone,
  reconcileClosedCase,
  watchMilestones,
  MILESTONE_ORDER,
  type CaseMilestone,
  type MilestoneKey,
  readCaseRaw,
} from "../lib/db";
import { normalizePhone } from "../lib/auth-service";

/*
 * ═══ המסך צומצם לתפקידו היחיד — התיק המחובר (20/8/2026) ═══
 *
 * בגרסת הפיד המסך שירת שני מצבים: תיק מהפיד (הבעת עניין, טופס הצעה
 * מלא, תזכיר, ערעור) ותיק מחובר. הפיד בוטל במעבר למודל הבחירה —
 * ההצעה מוגשת היום מכרטיס ההפניה במסך /lawyer — ומצב הפיד כאן הפך
 * לקוד מת (getFeedCase החזיר תמיד undefined). כ-700 שורות של מצב
 * הפיד הוסרו; הגרסה המלאה שמורה בתג v1-assessment-model.
 *
 * מה שנשאר: עורך דין שנבחר פותח את התיק — מהתראת "לקוח בחר בך" או
 * מרשימת התיקים הפעילים — ורואה סיכום, מסמכים מוצהרים, ציר אבני
 * דרך ופרטי קשר.
 */

const inputCls =
  "block w-full rounded-2xl border border-white/10 bg-foreground/[0.04] px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-gold/50";

export const Route = createFileRoute("/lawyer-case/$caseId")({
  /* עמוד אישי מאחורי התחברות — אין סיבה שיהיה במנוע חיפוש */
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: LawyerCaseDetail,
});

type ConnectedCase = {
  title: string;
  category: string;
  summary: string;
  clientContact?: { name: string; phone: string; email: string };
  documents?: string[];
};

function LawyerCaseDetail() {
  useRequireAuth();
  const { caseId } = Route.useParams();
  const { user } = useAppStore();
  const t = useT();

  /*
   * "עוד טוען" ו"לא קיים" הם שני מצבים שונים. עד ההפרדה המסך הציג
   * "הפנייה לא קיימת" למשך זמן הקריאה, ואם הקריאה נכשלה — לתמיד,
   * בלי להבדיל בין תקלה למחיקה.
   */
  const [connected, setConnected] = useState<ConnectedCase | null>(null);
  const [directLoad, setDirectLoad] = useState<"loading" | "done" | "failed">("loading");
  useEffect(() => {
    if (!user) return;
    setDirectLoad("loading");
    void readCaseRaw(caseId)
      .then((raw) => {
        if (raw && raw.chosenLawyerId === user.uid) {
          setConnected({
            title: raw.title,
            category: raw.category,
            summary: raw.summary,
            clientContact: raw.clientContact,
            documents: raw.documents,
          });
        }
        setDirectLoad("done");
      })
      .catch(() => setDirectLoad("failed"));
  }, [user, caseId]);

  /*
   * אבני דרך — הלקוח מקבל התראה על כל סימון, וזה גם הנתון שעליו יתבסס
   * החיוב פר-חיבור. עד היום לא היה לפלטפורמה שום מושג אם חיבור הבשיל.
   */
  const [milestones, setMilestones] = useState<CaseMilestone[]>([]);
  const [msNote, setMsNote] = useState("");
  /* כשל אינו 'אין התקדמות' — לא מאפסים ציר זמן שכבר נטען */
  useEffect(() => watchMilestones(caseId, setMilestones, () => {}), [caseId]);
  const marked = new Set(milestones.map((m) => m.key));

  /*
   * ריפוי עצמי לתיקים שנתקעו: אבן הדרך האחרונה סומנה, אבל עדכון הסטטוס
   * נכשל בשקט (לפני שהוסר ה-catch שבלע אותו) והתיק המשיך להופיע כפעיל.
   * במקום תיקון ידני במסד, הפתיחה הבאה של התיק סוגרת אותו.
   */
  useEffect(() => {
    if (!marked.has("closed")) return;
    void reconcileClosedCase(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, milestones.length]);

  /*
   * סימון אבן דרך הוא חד-כיווני: החוקים אוסרים עדכון ומחיקה, ואין
   * פונקציית ביטול בשום מקום. עבור "closed" זה אומר שלחיצה אחת מוטעית
   * סוגרת תיק חי — הוא יורד מהרשימה הפעילה, הלקוח מקבל "התיק הסתיים",
   * וגם תיקון ידני במסד יבוטל כי reconcileClosedCase כותב שוב closed
   * בכל פתיחה. לכן דווקא הסגירה מקבלת אישור.
   */
  const [confirmClose, setConfirmClose] = useState(false);

  function mark(key: MilestoneKey) {
    if (key === "closed" && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    setConfirmClose(false);
    void markMilestone(caseId, key, msNote)
      .then(() => {
        setMsNote("");
        toast.success(t("msMarked"));
      })
      .catch(() => toast.error(t("authErrGeneric")));
  }

  if (connected) {
    const c = connected.clientContact;
    return (
      <AppShell bare>
        <Page className="flex min-h-screen flex-col">
          <TopBar title={t("leadDetailsTitle")} subtitle={connected.category} />
          <div className="flex-1 px-5 pt-6">
            <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success-ink">
              {t("connectedWithLawyer")}
            </span>
            <h2 className="mt-4 text-xl font-black leading-snug text-foreground">
              {connected.title}
            </h2>
            <div className="liquid-glass mt-6 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-foreground">{t("caseDescriptionHeader")}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {connected.summary}
              </p>
            </div>

            {/*
              * סימני התיעוד — מה שהחליף את העלאת הקבצים (12/8/2026).
              *
              * עורך הדין מקבל את אותו אות שנתנה לו התמונה — "יש כאן על
              * מה לעבוד" — בלי שאיש מאיתנו מחזיק מסמך רפואי של אדם
              * פגוע. השורה התחתונה אומרת במפורש שזו הצהרה ולא אימות,
              * כדי שאיש לא יסתמך עליה כאילו ראינו את המסמך.
              */}
            {(connected.documents?.length ?? 0) > 0 && (
              <div className="liquid-glass mt-4 rounded-[26px] p-4">
                <p className="text-[13px] font-bold text-foreground">{t("docsHeader")}</p>
                <ul className="mt-2.5 grid gap-1.5">
                  {connected.documents!.map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-[color:var(--success-ink)]" strokeWidth={3} aria-hidden />
                      <span className="text-[13px] text-foreground">
                        {t(`doc${k.charAt(0).toUpperCase()}${k.slice(1)}` as never)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
                  {t("docsNote")}
                </p>
              </div>
            )}

            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-foreground">{t("timelineLawyerHeader")}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("timelineLawyerSub")}
              </p>
              <input
                className={`${inputCls} mt-3`}
                value={msNote}
                onChange={(e) => setMsNote(e.target.value)}
                placeholder={t("msNotePh")}
                aria-label={t("msNoteAria")}
              />
              {confirmClose && (
                <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-foreground">
                  {t("msCloseWarning")}
                </p>
              )}
              <div className="mt-3 space-y-2">
                {MILESTONE_ORDER.map((k) => {
                  const done = marked.has(k);
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-foreground/[0.04] px-3.5 py-2.5"
                    >
                      <span className="flex-1 text-[13px] font-semibold text-foreground">
                        {t(`ms_${k}` as never)}
                      </span>
                      {done ? (
                        <span className="rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success-ink">
                          {t("msMarked")}
                        </span>
                      ) : k === "closed" && confirmClose ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmClose(false)}
                            className="rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-bold text-muted-foreground transition active:scale-95"
                          >
                            {t("cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => mark(k)}
                            className="rounded-full bg-destructive/20 px-3 py-1 text-[11px] font-bold text-destructive-ink transition active:scale-95"
                          >
                            {t("msCloseConfirm")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => mark(k)}
                          className="rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-gold-ink transition active:scale-95"
                        >
                          {t("msMarkBtn")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-gold" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-foreground">{t("clientContactHeader")}</h3>
              </div>
              <p className="mt-2 text-[15px] font-semibold text-foreground">
                {c?.name || "—"}
              </p>
              {c?.phone && (
                <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
                  {c.phone}
                </p>
              )}
              {c?.email && (
                <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
                  {c.email}
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (c?.phone) {
                      const digits = normalizePhone(c.phone).replace("+", "");
                      window.open(`https://wa.me/${digits}`, "_blank", "noopener");
                    } else if (c?.email) {
                      window.location.href = `mailto:${c.email}`;
                    }
                  }}
                  className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                >
                  <MessageCircle className="size-4 text-gold" />
                  {t("messageAction")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (c?.phone) window.location.href = `tel:${normalizePhone(c.phone)}`;
                  }}
                  className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                >
                  <Phone className="size-4 text-gold" />
                  {t("callAction")}
                </button>
              </div>
            </div>
          </div>
        </Page>
      </AppShell>
    );
  }

  if (directLoad !== "done") {
    /* עדיין לא יודעים אם התיק קיים — שלד או שגיאה, לא "לא קיים" */
    return (
      <AppShell>
        <TopBar title={directLoad === "failed" ? t("loadFailedTitle") : ""} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          {directLoad === "failed" ? (
            <>
              <p className="text-muted-foreground">{t("loadFailedBody")}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
              >
                {t("retryBtn")}
              </button>
            </>
          ) : (
            <div className="liquid-glass h-40 w-full max-w-sm animate-pulse rounded-3xl" aria-hidden />
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title={t("leadNotFound")} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">{t("leadNotExist")}</p>
        <Link
          to="/lawyer"
          className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
        >
          {t("toLeadsList")}
        </Link>
      </div>
    </AppShell>
  );
}
