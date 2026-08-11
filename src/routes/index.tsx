import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FolderOpen,
  LifeBuoy,
  Plus,
  Scale,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "../components/AppShell";

import { Page, Pressable, Rise, Stagger } from "../components/motion";
import { NotificationBell } from "../components/NotificationBell";
import { SubmittedModal } from "../components/SubmittedModal";
import { PushPrimer } from "../components/PushPrimer";
import { usePushPrimer } from "../lib/use-push-primer";
import { MAX_OPEN_CASES, OPEN_CASE_LIMIT_ENABLED } from "../lib/limits";
import { translate, useT, type StringKey } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useAppStore } from "../lib/store";
import { toneClasses, useStatusMeta, useTimeAgo } from "../lib/status";
import { cn } from "../lib/utils";
import type { Case } from "../lib/types";


export const Route = createFileRoute("/")({
  // מזהה תיק שזה עתה נשלח — מציג את אישור הקליטה מעל הבית.
  // המפתח מושמט כשאינו קיים, כדי שניווטים רגילים ל-"/" לא ידרשו search.
  validateSearch: (search: Record<string, unknown>): { done?: string } =>
    typeof search.done === "string" ? { done: search.done } : {},
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
  const { done } = Route.useSearch();
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
  const [active, ...rest] = cases;
  const activeMeta = active ? statusMeta(active.status) : null;
  const interested = active?.interested.length ?? 0;
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
      c.status === "matching" ||
      c.status === "has_interest" ||
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
      <AnimatePresence>
        {done && (
          <SubmittedModal
            onClose={() => navigate({ to: "/", search: {}, replace: true })}
            onViewCase={() => navigate({ to: "/case/$caseId", params: { caseId: done } })}
          />
        )}
      </AnimatePresence>

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
              <Pressable
                onClick={() => navigate({ to: "/case/$caseId", params: { caseId: active.id } })}
                className={cn(
                  "anchor liquid-glass glass-raised relative w-full overflow-hidden rounded-[26px] text-start",
                  active.status === "has_interest" && "glass-warm",
                  active.status === "connected" && "glass-lit",
                )}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`tone-pill rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[activeMeta!.tone]}`}
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
                </div>

                {/*
                  * רגע ההגעה.
                  *
                  * זה מה שכל המסלול הוביל אליו: אדם שנפגע, סיפר סיפור לא
                  * קל, חיכה — ועכשיו מישהו אמר "אני יכול לעזור לך". קודם
                  * זה נאמר בפס דק בלשון סטטוס, וזה נקרא כהערת שוליים.
                  * כאן זה זהב מלא, בגובה שאי אפשר לפספס, ובלשון פעולה.
                  */}
                {active.status === "has_interest" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative overflow-hidden bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] px-5 py-4"
                  >
                    {/* פס אור איטי — סימן חיים, לא קרנבל */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.45),transparent)] motion-safe:animate-[shine_3.8s_ease-in-out_infinite]"
                    />
                    <div className="relative flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0F172A]/10">
                        <Sparkles className="size-4.5 text-[#0F172A]" strokeWidth={2.4} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-black leading-tight text-[#0F172A]">
                          {interested === 1
                            ? t("offerWaitingOne")
                            : t("offerWaitingMany").replace("{n}", String(interested))}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] font-semibold text-[#0F172A]/70">
                          {interested === 1 ? t("offerWaitingCtaOne") : t("offerWaitingCtaMany")}
                        </span>
                      </span>
                      <Arrow className="size-5 shrink-0 text-[#0F172A]/60" />
                    </div>
                  </motion.div>
                )}
              </Pressable>
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
            * ומי כבר ראה אותה. "עזרה ותמיכה" נשאר, כי הוא היחיד שלא היה
            * נגיש מכאן.
            */}
          <Rise className="mt-6">
            <ClientJourney active={active} />
          </Rise>

          <Rise className="mt-3">
            <Pressable
              onClick={() => navigate({ to: "/settings/help" })}
              className="liquid-glass glass-flat tap flex w-full items-center gap-3 rounded-[20px] px-4 py-3.5"
            >
              <span className="chip-emblem grid size-10 shrink-0 place-items-center">
                <LifeBuoy className="relative z-10 size-4 text-gold-ink" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="flex-1 text-start text-[13.5px] font-bold text-foreground">
                {t("help")}
              </span>
              <Arrow className="size-4 shrink-0 text-muted-foreground/50" />
            </Pressable>
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

/**
 * איפה הפנייה שלך נמצאת עכשיו.
 *
 * זה מה שהחליף ארבע קוביות ניווט שהובילו למקומות שכבר נגישים מהתפריט
 * התחתון ומהפעמון שלמעלה. השאלה שהלקוח באמת מחזיק בראש אינה "איפה
 * הפרופיל" אלא "מה קורה עם מה ששלחתי, ומי כבר ראה את זה".
 *
 * שלושת השלבים הם המראה של אותו הסבר שעורך הדין מקבל בסוף הפיד שלו —
 * אותו תהליך, משני צדדיו.
 */
function ClientJourney({ active }: { active?: Case }) {
  const t = useT();

  /*
   * השלב הנוכחי נגזר מהסטטוס האמיתי של התיק, לא מהערכה. בלי תיק פעיל
   * מוצגים אותם שלבים בלי סימון — כך זה נקרא כ"מה יקרה" ולא כהתקדמות
   * מדומה של תיק שלא קיים.
   */
  const step = !active
    ? -1
    : active.status === "validating"
      ? 0
      : active.status === "matching"
        ? 1
        : active.status === "has_interest"
          ? 2
          : active.status === "connected" || active.status === "closed"
            ? 3
            : -1;

  /*
   * המספר האמיתי של עורכי הדין שקיבלו את הפנייה. undefined בתיקים
   * ישנים שנפתחו לפני שהתחלנו למדוד — ואז פשוט לא נאמר מספר, במקום
   * לנחש אחד.
   */
  const notified = active?.notifiedLawyers;

  const steps: { key: StringKey; note?: string }[] = [
    { key: "journeyStep1" },
    {
      key: "journeyStep2",
      note:
        typeof notified === "number" && notified > 0
          ? `${notified} ${t("journeyNotified")}`
          : undefined,
    },
    { key: "journeyStep3" },
  ];

  /*
   * הכרטיס כהה בכוונה — היחיד בעמוד (7/8/2026).
   *
   * זה המסך שאדם פותח כדי לענות על שאלה אחת: "מה קורה עם הפנייה שלי?"
   * כשהכרטיס שעונה עליה נראה כמו כל שאר הזכוכית, הוא נבלע. דיו כהה על
   * עמוד בהיר הופך אותו לעוגן — אותו מהלך כמו רצועת "מה כלול" בדף
   * הנחיתה: רגע כהה אחד, ולכן הוא הרגע שזוכרים.
   *
   * **הכרטיס הזה שקוע, לא בולט** (9/8/2026).
   *
   * עברנו כאן דרך ‎#101a30 ואז ‎#1E2A45, ושניהם הפריעו מאותה סיבה: כרטיס
   * שבולט נקרא כמשהו שדורש פעולה. אבל זה לוח מחוונים — הוא **מדווח** לך
   * איפה הפנייה עומדת, ואי אפשר ללחוץ עליו. לכן הוא נחרט לתוך אזור
   * העבודה במקום לרחף מעליו, ובכך הוא נבדל מ"פנייה חדשה" שמורם.
   *
   * במצב כהה הוא נשאר ‎#101a30: שם אין לאן לרדת, והכהות היא השקע.
   * הזהב הוא מה שמחזיק את הזהות בשני המצבים — אבל **המנגנון שלו משתנה**:
   * על כהה הוא זוהר, על בהיר זוהר לא נראה ולכן הוא מלא ומוצק.
   */
  return (
    /*
     * ההילה היא **גרדיאנט רקע** ולא אלמנט מטושטש (10/8/2026).
     *
     * קודם ישב כאן `div` עם `blur-3xl` בתוך `overflow-hidden` + `rounded`.
     * iOS חותך שכבה שעברה `filter` לתיבת הגבול המרובעת ולא למעוגלת, ומכאן
     * פינת זהב מרובעת שבלטה מחוץ לעיגול — נצפתה בכרטיס התיק הפעיל, ואותו
     * מבנה בדיוק היה כאן. גרדיאנט רקע נחתך ע"י ה-radius בכל דפדפן.
     *
     * על כהה בלבד: על משטח בהיר הזהב אינו קורא כאור אלא ככתם חום.
     */
    /*
     * קצה הזהב (10/8/2026) — "יש כאן משהו", בלי להוסיף צבע ובלי להגביה.
     * הכרטיס נשאר שקוע, כמו שהוכרע ב-9/8; הקצה הוא הסימון היחיד שאפשר
     * להוסיף לו בלי לסתור את זה.
     */
    /*
     * `dark:ring-1 dark:ring-gold/25` ישב כאן והיה **קוד מת**.
     *
     * `ring` של Tailwind נכתב כ-box-shadow, ו-`.dark .recessed` קובע
     * box-shadow משלו ב-CSS ידני מחוץ ל-layer — שמנצח כל utility בלי
     * קשר לספציפיות. הטבעת מעולם לא רונדרה. נמדד: הצל בכהה מכיל רק את
     * שתי השכבות הפנימיות של `.recessed`.
     *
     * הוסרה במקום לתקן: `edge-gold` כבר נותן את סימון הזהב, ובשני
     * המצבים באותה צורה. טבעת מלאה **ועוד** קצה היו שני אותות זהב על
     * כרטיס אחד — בדיוק מה שדביר קרא לו "מצועצע" בלוח הכותרת.
     */
    <div className="edge-gold recessed relative overflow-hidden rounded-[26px] bg-[var(--recess-fill)] p-5 dark:bg-[image:radial-gradient(120%_85%_at_18%_-15%,oklch(0.76_0.13_85_/_0.16),transparent_58%)]">
      <p className="text-[11px] font-medium tracking-[0.2em] text-gold-ink dark:text-gold">
        {t("journeyEyebrow")}
      </p>
      <p className="mt-1 text-[15px] font-bold text-foreground dark:text-white">
        {t(active ? "journeyTitleActive" : "journeyTitleEmpty")}
      </p>

      <ol className="mt-5 space-y-0">
        {steps.map((s, i) => {
          const done = step > i;
          const current = step === i;
          const last = i === steps.length - 1;
          return (
            <li key={s.key} className="relative flex items-start gap-3 pb-5 last:pb-0">
              {/*
               * הקו המחבר יורד ממרכז העיגול אל הבא. הוא מוזהב רק כשהשלב
               * שמעליו הושלם — כך הזהב מטפס עם ההתקדמות, והחלק שטרם
               * הגיע נשאר חיוור. בלי קו ההתקדמות היא רשימה; איתו — מסע.
               */}
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-[13px] top-7 bottom-0 w-0.5 rounded-full",
                    done
                      ? "bg-gold dark:bg-gradient-to-b dark:from-gold dark:via-gold/70 dark:to-gold/25"
                      : "bg-foreground/15 dark:bg-white/10",
                  )}
                />
              )}
              <span className="relative mt-0.5 shrink-0" aria-hidden>
                {/* ההילה המהבהבת — רק על השלב שקורה עכשיו */}
                {current && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/40 dark:bg-gold/50" />
                )}
                <span
                  className={cn(
                    "relative grid size-7 place-items-center rounded-full text-[10.5px] font-black",
                    /*
                     * על כהה הזהב זוהר; על בהיר זוהר לא קיים, אז הוא **מלא**.
                     * אותו מסר בשתי פיזיקות שונות של אור.
                     *
                     * המילוי היה `gold-ink` (10/8/2026) — הדיו שנועד **לכתוב**
                     * על נייר, ‎oklch(0.52)‎. כמילוי של עיגול הוא נקרא כחום
                     * עכור ולא כזהב, וכך דביר תיאר אותו. `--gold` הוא הצבע
                     * הנכון לכל מה שהוא משטח; `--gold-ink` נשאר לטקסט בלבד,
                     * שם הוא קיים כי ‎--gold‎ נכשל AA על נייר (2.16:1).
                     *
                     * טבעת רכה במקום זוהר: על כהה ההילה היא אור שנפלט, ועל
                     * נייר אין ממה לפלוט — שם אותו תפקיד נעשה בהילה מוצקה
                     * ודקה סביב העיגול.
                     */
                    done &&
                      "bg-gold text-[#0F172A] shadow-[0_0_0_4px_oklch(0.76_0.13_85/0.16)] dark:bg-gold/15 dark:text-gold dark:shadow-[0_0_14px_rgba(212,175,55,0.45)] dark:ring-1 dark:ring-gold/50",
                    current &&
                      "bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-[0_0_0_3px_rgba(201,162,39,0.22)] dark:shadow-[0_0_18px_rgba(212,175,55,0.6)]",
                    !done &&
                      !current &&
                      "bg-background/70 text-muted-foreground ring-1 ring-foreground/12 dark:bg-white/5 dark:text-white/40 dark:ring-white/15",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p
                  className={cn(
                    "text-[12.5px] leading-relaxed",
                    current
                      ? "font-semibold text-foreground dark:text-white"
                      : done
                        ? "text-foreground/80 dark:text-white/80"
                        : "text-muted-foreground dark:text-white/45",
                  )}
                >
                  {t(s.key)}
                </p>
                {s.note && (
                  <p className="mt-1 text-[12px] font-bold text-gold-ink dark:text-gold">{s.note}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
