import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FolderOpen,
  Plus,
  Scale,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "../components/AppShell";

import { Page, Pressable, Rise, Stagger } from "../components/motion";
import { NotificationBell } from "../components/NotificationBell";
import { PushPrimer } from "../components/PushPrimer";
import { usePushPrimer } from "../lib/use-push-primer";
import { MAX_OPEN_CASES, OPEN_CASE_LIMIT_ENABLED } from "../lib/limits";
import { translate, useT, type StringKey } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useAppStore } from "../lib/store";
import { toneClasses, useStatusMeta, useTimeAgo } from "../lib/status";
import { cn } from "../lib/utils";
import type { Case } from "../lib/types";
import { ClientJourney, JourneyGateway } from "../components/ClientJourney";
import { CaseWhatsNew, WhatsNewStrip, useWhatsNewKey, cardMood, caseActionRank } from "../components/CaseWhatsNew";


export const Route = createFileRoute("/")({
  // מזהה תיק שזה עתה נשלח — מציג את אישור הקליטה מעל הבית.
  // המפתח מושמט כשאינו קיים, כדי שניווטים רגילים ל-"/" לא ידרשו search.
  /*
   * ה-meta בעברית — זה מה שנשלח בוואטסאפ ומה שגוגל מאנדקס, על עמוד
   * שמוגש כ-lang="he" dir="rtl". תצוגה מקדימה באנגלית לקהל ישראלי היא
   * שריד מהתבנית. הקופי נשלף מ-i18n כדי שלא יהיו שתי גרסאות לתחזק.
   */
  head: () => ({
    meta: [
      { title: translate("rootMetaTitle", "he") },
      { name: "description", content: translate("rootMetaDesc", "he") },
      { property: "og:title", content: translate("rootMetaTitle", "he") },
      { property: "og:description", content: translate("rootOgDesc", "he") },
      { property: "og:locale", content: "he_IL" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { role, user, onboarded, authReady } = useAppStore();
  const t = useT();
  const [gateChecked, setGateChecked] = useState(false);

  // First-run welcome tour gate — runs once per browser.
  useEffect(() => {
    try {
      if (!localStorage.getItem("justask-welcomed")) {
        navigate({ to: "/welcome", replace: true });
        return;
      }
    } catch {
      /* ignore */
    }
    setGateChecked(true);
  }, [navigate]);

  // עורך דין שלוחץ "ראשי" קיבל עד כה את מסך הבחירה — יש לו בית משלו
  useEffect(() => {
    if (gateChecked && role === "lawyer") navigate({ to: "/lawyer", replace: true });
  }, [gateChecked, role, navigate]);

  /*
   * מחובר שטרם אישר את התנאים לא רואה את הבית — גם אם הקליד "/" ידנית.
   * בלי זה מסך ההתחייבות הוא המלצה בלבד: כתובת ישירה עוקפת אותו.
   */
  useEffect(() => {
    if (gateChecked && user && onboarded === false && role !== "lawyer") {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [gateChecked, user, onboarded, role, navigate]);

  /*
   * הבוחר הישן שישב כאן הוסר: בחירת התפקיד גרה עכשיו בסוף מסך הדלתות,
   * וקיומם של שני מסכי בחירה שונים יצר בדיוק את מה שדביר ראה בטלפון —
   * "לפעמים העיצוב הישן". מי שמגיע לכאן בלי תפקיד מופנה לדלתות.
   *
   * לפני כל ה-early-returns — hooks חייבים לרוץ בכל רינדור.
   */
  useEffect(() => {
    /*
     * authReady הוא חלק מהתנאי: לפני שהאימות הוכרע, role=null פירושו
     * "עוד לא יודעים" ולא "אין תפקיד". בלעדיו, משתמש חוזר שהקריאה
     * מהשרת שלו התעכבה הוקפץ לבחירת תפקיד שכבר בחר.
     */
    if (authReady && gateChecked && role === null) navigate({ to: "/welcome", replace: true });
  }, [authReady, gateChecked, role, navigate]);

  if (!gateChecked) return null;

  // המערכת כבר יודעת מי אתה — אין סיבה לשאול שוב בכל כניסה
  if (role === "client" && user) return <ClientHome />;

  return null;
}

/**
 * הבית של הלקוח.
 *
 * התפקיד הרגשי כאן הוא לא תפריט — אלא תחושה שמישהו מחזיק את התיק בשבילך.
 * לכן התיק הפעיל הוא האלמנט הגדול והיחיד שמושך תשומת לב, והשאר מסודר
 * בקוביות זכוכית שקטות.
 */
function ClientHome() {
  const navigate = useNavigate();
  const t = useT();
  const { cases, casesError, user } = useAppStore();
  const { dir } = useSettings();
  const statusMeta = useStatusMeta();
  const ago = useTimeAgo();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const firstName = (user?.displayName ?? "").trim().split(" ")[0];
  /* ברכה לפי שעת היום — הדבר הקטן שגורם למסך להרגיש חי ולא תבנית */
  const hour = new Date().getHours();
  const greetKey =
    hour >= 5 && hour < 12
      ? "greetMorning"
      : hour >= 12 && hour < 17
        ? "greetAfternoon"
        : hour >= 17 && hour < 22
          ? "greetEvening"
          : "greetNight";
  /*
   * הכרטיס הראשי — לפי מה שדורש פעולה, לא לפי מי שנוצר אחרון (21/8):
   * תיק מחובר מאתמול דחק תיק עם הצעה ממתינה ל"התיקים שלי" בלי סימן.
   */
  const ordered = [...cases].sort((a, b) => caseActionRank(a.status) - caseActionRank(b.status) || b.createdAt - a.createdAt);
  const [active, ...rest] = ordered;
  const activeMeta = active ? statusMeta(active.status) : null;
  /* המפתח נשלף ברמת הכרטיס: המצב קובע מסגרת, הילה ומילוי (שלושת המצבים) */
  const activeKey = useWhatsNewKey(active?.id ?? null, active?.status ?? "validating");
  const mood = cardMood(activeKey);
  /* תיקים שעדיין דורשים משהו — לא כולל סגורים ונדחים */
  const openCount = cases.filter(
    (c) => c.status !== "closed" && c.status !== "rejected",
  ).length;
  /*
   * אותה ספירה בדיוק כמו בשרת (countOpenCases): רק סטטוסים שמתחרים על
   * תשומת לב, ובלי תיקים שנתקעו בבדיקה — אחרת המסך היה חוסם על תיק
   * שהשרת עצמו כבר מתעלם ממנו.
   */
  const competingCount = cases.filter(
    (c) =>
      c.status === "summary_ready" ||
      c.status === "awaiting_selection" ||
      (c.status === "validating" &&
        Date.now() - c.createdAt < 30 * 60 * 1000) ||
      /* נמשכה — נספרת שבוע, כדי שמשיכה לא תשמש לעקיפת המכסה */
      (c.status === "withdrawn" &&
        !!c.withdrawnAt &&
        Date.now() - c.withdrawnAt < 7 * 24 * 60 * 60 * 1000),
  ).length;
  const atCaseLimit = OPEN_CASE_LIMIT_ENABLED && competingCount >= MAX_OPEN_CASES;

  /*
   * ההסבר מוצג ללקוח רק כשיש לו תיק פעיל — לפני זה אין לו על מה לקבל
   * התראה, והבקשה תישרף על אדם שעדיין לא הבין מה האפליקציה עושה.
   */
  const primer = usePushPrimer(user?.uid, cases.length > 0);

  return (
    <AppShell>
      <PushPrimer
        open={primer.open}
        role="client"
        onAllow={() => void primer.allow()}
        onDismiss={primer.dismiss}
      />

      <Page>
        {/*
          * אותה שפה עיצובית כמו בצד עורך הדין: תווית-גג בזהב עם ריווח
          * אותיות, כותרת גדולה מתחתיה, ושורת שבבי זכוכית עם אייקוני
          * זהב. עד עכשיו לצד עורך הדין הייתה שפה ולצד הלקוח היו רק
          * כרטיסים — וזה נקרא כשתי אפליקציות.
          */}
        {/*
          * כותרת העמוד — שורה אחת וקו זהב (10/8/2026).
          *
          * הגלגול המלא: כותרת לבנה עם קו שיער → לוח נייבי מנוגד → קו זהב
          * בלבד. את הלוח דביר הציע, ואחרי שראה אותו על המכשיר אמר
          * "מצועצע"; ההנמקה למה הוא צדק נמצאת ב-`.masthead` ב-styles.css.
          *
          * התוכן עבר מסלול מקביל: שלוש שורות (ברכה, שם, הבטחה) → שתיים →
          * אחת. הברכה חזרה **לתוך** הכותרת במקום מעליה, וכך "בוקר טוב,
          * Dvir" אומר את שניהם במחיר של שורה. הפסיק הוא חלק מהמחרוזת ולא
          * מהקוד — יש שפות שאינן מפסיקות כאן.
          *
          * ה-`-mx-5 px-5` מבטל את הריפוד של AppShell כדי שקו הזהב יימתח
          * מקצה לקצה; בלעדיו הוא נגמר באוויר ונקרא כקישוט ולא כהפרדה.
          *
          * **בלי `sticky`, בכוונה.** ל-AppShell יש `overflow-clip`, ולכן
          * הוא אינו מכל־גלילה ו-sticky כן שורד בו היום — אבל כותרת
          * שנדבקת רודפת אחרי הקורא בכל גלילה, וזה בדיוק מה שפתיח לא אמור
          * לעשות. הוא נאמר פעם אחת ונשאר מאחור.
          */}
        {/*
          * `items-start` ולא `items-center` — יישור לשאר הלשוניות.
          *
          * הכותרת כאן היא שורה אחת (32px) והפעמון 44px. עם `items-center`
          * הפלקס מרכז את שניהם מול הגבוה מביניהם, והכותרת נדחפת 6px
          * למטה: היא התחילה ב-38 בעוד ב"התיקים שלי" ובפרופיל היא ב-32.
          * מעבר בין שלוש הלשוניות הקפיץ אותה. זה לא היה עיצוב אלא תוצר
          * לוואי של הפלקס, ולכן היישור לראש.
          */}
        <header className="masthead -mx-5 flex items-start justify-between gap-3 px-5 pb-4 pt-8">
          <div className="min-w-0">
            {/*
              * זהה לכותרות של "התיקים שלי" ו"פרופיל" — text-2xl במשקל 800.
              *
              * הברכה נשארת בזהב החי שהיה לה כשישבה בשורה נפרדת; רק השם
              * הוא דיו. פיצול לפי התבנית ולא `replace` על מחרוזת אחת, כדי
              * שסדר המילים והפיסוק יישארו של השפה: בערבית הפסיק הוא ‎،‎,
              * ויש שפות שבהן השם מקדים את הברכה.
              */}
            <h1 className="truncate text-2xl font-extrabold text-foreground">
              {t("greetNamed")
                .split(/(\{greet\}|\{name\})/)
                .map((part, i) =>
                  part === "{greet}" ? (
                    <span key={i} className="eyebrow-live">
                      {t(greetKey)}
                    </span>
                  ) : part === "{name}" ? (
                    <span key={i}>{firstName || t("meBadge")}</span>
                  ) : (
                    part
                  ),
                )}
            </h1>
          </div>
          <NotificationBell />
        </header>

        {/*
          * כל מה שמתחת לכותרת יושב על אזור עבודה — מישור אחד למטה מהדף.
          *
          * הכרטיסים הלבנים היו לבן על כמעט־לבן (הפרש 4% בלבד) ולכן נבלעו.
          * הפתרון אינו להכהות את הכרטיסים אלא לתת להם על מה לעמוד.
          * הכותרת נשארת על מפלס הדף, וכך נוצרת ההפרדה שהקו והצל רק רמזו
          * עליה. ה-`-mx-5 px-5` מבטל את הריפוד של AppShell כדי שהמישור
          * יימתח מקצה לקצה; `min-h` מונע ממנו להיגמר באוויר במסך ריק.
          */}
        <div className="workspace -mx-5 min-h-screen px-5 pt-6">
        {/* שבב אחד, ועובדה אחת: כמה פתוח. "חינם, תמיד" עלה ללוח הכותרת —
            הבטחה נושאת אינה שבב ליד מונה. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex gap-2"
        >
          <span className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-foreground">
            <FolderOpen className="size-3.5 text-gold" strokeWidth={2} />
            {OPEN_CASE_LIMIT_ENABLED
              ? t("homeChipOpen")
                  .replace("{n}", String(competingCount))
                  .replace("{m}", String(MAX_OPEN_CASES))
              : competingCount === 1
                ? t("homeChipOneCase")
                : `${competingCount} ${t("homeChipCases")}`}
          </span>
        </motion.div>

        <Stagger className="pb-12">
          {active ? (
            <Rise>
              {/* ההילה על עטיפה: הכרטיס חתוך ב-overflow ואינו יכול לזהור בעצמו */}
              <div
                className={cn(
                  (mood === "process" || mood === "good") && "good-halo",
                  mood === "offer" && "good-halo halo-gold",
                )}
              >
              <Pressable
                onClick={() => navigate({ to: "/case/$caseId", params: { caseId: active.id } })}
                className={cn(
                  "anchor liquid-glass glass-raised relative w-full overflow-hidden rounded-[26px] text-start",
                  /* מסגרת כהה מרגע ששלחת פנייה; מילוי זהב כשהתקבלה הצעה */
                  mood !== null && "glass-good",
                  mood === "offer" && "glass-offer",
                )}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold",
                        /* על מילוי הזהב צ'יפ זהב נבלע — דיו כהה כמו טקסט כפתור הזהב */
                        mood === "offer"
                          ? "bg-[#0f172a]/85 text-[#f1e4c3]"
                          : toneClasses[activeMeta!.tone],
                      )}
                    >
                      {activeMeta!.label}
                    </span>
                    {/* היה `text-white` בבהיר, כי הכרטיס היה נייבי. עכשיו
                        הוא בהיר בשני המצבים ולכן גם הטקסט אחד. */}
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {ago(active.createdAt)}
                    </span>
                  </div>

                  <h2 className="mt-3.5 text-[1.35rem] font-extrabold leading-[1.2] tracking-tight text-foreground">
                    {active.title || t("homeCaseUntitled")}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {active.summary}
                  </p>
                  <WhatsNewStrip k={activeKey} onGold={mood === "offer"} />
                </div>

              </Pressable>
              </div>
            </Rise>
          ) : (
            <Rise>
              {/* "עוד לא שיתפת מקרה" מול "לא הצלחנו לטעון" — לא אותו דבר */}
              <div className={casesError
                ? "rounded-[26px] border border-destructive/30 bg-destructive/[0.05] p-6 text-center"
                : "liquid-glass rounded-[26px] p-6 text-center"}>
                <span className="chip-emblem mx-auto grid size-14 place-items-center">
                  <Scale className="relative z-10 size-6 text-gold-ink" strokeWidth={2} />
                </span>
                <h2 className="mt-4 text-base font-bold text-foreground">
                  {t(casesError ? "loadFailedTitle" : "homeEmptyTitle")}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(casesError ? "casesErrorSub" : "homeEmptySub")}
                </p>
              </div>
            </Rise>
          )}

          {/*
            * התקרה נאמרת *לפני* שמישהו מספר את סיפורו, ולא אחרי.
            *
            * הגרסה הראשונה שלי חסמה רק בשרת, בסוף הראיון — כלומר אדם
            * השקיע עשר דקות בלספר מה קרה לו ורק אז גילה שאי אפשר.
            * האכיפה נשארת בשרת (שם היא אמיתית); כאן היא רק נאמרת בזמן.
            */}
          {atCaseLimit ? (
            <Rise className="mt-3">
              <div className="rounded-[26px] border border-gold/35 bg-gold/[0.07] p-4 text-center">
                <p className="text-[13.5px] font-bold text-foreground">
                  {t("tooManyOpenTitle").replace("{n}", String(MAX_OPEN_CASES))}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {t("tooManyOpenBody").replace(/\{n\}/g, String(MAX_OPEN_CASES))}
                </p>
              </div>
            </Rise>
          ) : (
            <Rise className="mt-3">
              <Pressable
                onClick={() => navigate({ to: "/intake-tips" })}
                className={cn(
                  "tap flex w-full items-center justify-center gap-2 rounded-full font-bold",
                  active
                    ? "surface-sunken py-3.5 text-[15px] text-foreground ring-1 ring-inset ring-gold/35"
                    : "btn-gold py-4 text-base",
                )}
              >
                <Plus className={cn("size-[18px]", active && "text-gold-ink")} strokeWidth={2.5} />
                {active ? t("homeNewCase") : t("homeFirstCase")}
              </Pressable>
            </Rise>
          )}

          {/*
            * כאן היו ארבע קוביות ניווט, ושלוש מהן היו כפילות: "התיקים שלי"
            * ו"פרופיל" יושבים בתפריט התחתון, ו"התראות" הוא הפעמון שבראש
            * המסך הזה ממש. קובייה שמובילה למקום שכבר נגיש בשני מגעים אינה
            * עוזרת — היא רק מרעישה את המסך.
            *
            * במקומן: מה שהלקוח באמת לא יודע. איפה הפנייה שלו נמצאת עכשיו,
            * ומי כבר ראה אותה. "עזרה ותמיכה" ירד גם הוא (26/8/2026,
            * דביר: "סתם מיותר בדף הבית") — הוא יושב בפרופיל, מקומו הטבעי.
            */}
          <Rise className="mt-6">
            {/*
              * עם תיק — שורת-שער דקה למרכז המסלול; בלי תיק — הקובייה
              * המלאה נשארת כהסבר "מה יקרה" (כי "התיקים שלי" ריק אצלו).
              */}
            {active ? <JourneyGateway active={active} /> : <ClientJourney />}
          </Rise>

          {rest.length > 0 && (
            <Rise className="mt-6">
              <div className="liquid-glass glass-quiet overflow-hidden rounded-[26px]">
                <p className="px-5 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("homeOtherCases")}
                </p>
                {rest.slice(0, 3).map((c, i) => {
                  const m = statusMeta(c.status);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate({ to: "/case/$caseId", params: { caseId: c.id } })}
                      className={`flex w-full items-center gap-3 p-4 text-start ${i !== Math.min(rest.length, 3) - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {c.title || t("homeCaseUntitled")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{m.label}</p>
                        <CaseWhatsNew caseId={c.id} status={c.status} compact />
                      </div>
                      <Arrow className="size-4 shrink-0 text-muted-foreground/40" />
                    </button>
                  );
                })}
              </div>
            </Rise>
          )}
        </Stagger>
        </div>
      </Page>
    </AppShell>
  );
}

