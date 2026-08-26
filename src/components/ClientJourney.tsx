import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useT, type StringKey } from "../lib/i18n";
import { cn } from "../lib/utils";
import { watchCaseReferrals, type ReferralDoc } from "../lib/db";
import type { Case } from "../lib/types";

/**
 * הסרגל הגדול — כל המסע, לפני הביצוע ובזמנו (23/8/2026).
 *
 * דביר: "ששני הצדדים יבינו טוב מאוד מול איזה צעדים הם עומדים... סרגל
 * גדול וברור שמתמלא לפי הביצוע". הגרסה הקודמת גזרה את השלב מסטטוסים
 * של מודל הפיד (matching/has_interest) — ולכן מעולם לא התמלאה נכון.
 *
 * חמישה שלבים, נגזרים מהתיק ומההפניות עצמן. בלי תיק — אותם שלבים בלי
 * סימון, כהסבר "מה יקרה"; עם תיק — הזהב מטפס עם ההתקדמות האמיתית.
 */
/**
 * מצב המסע של תיק — מנוי אחד, שני צרכנים: הקובייה בבית ולוח המסלול
 * המלא ב"התיקים שלי" (26/8/2026).
 */
export function useJourneyState(active?: Case) {
  /* ההפניות של התיק הפעיל — מהן נגזרים שלבים 2-4 */
  const [refs, setRefs] = useState<ReferralDoc[]>([]);
  const wantRefs =
    active?.status === "awaiting_selection" || active?.status === "connected";
  useEffect(() => {
    if (!active || !wantRefs) {
      setRefs([]);
      return;
    }
    return watchCaseReferrals(active.id, setRefs, () => {});
  }, [active?.id, wantRefs]);

  const summaryDone =
    !!active && active.status !== "validating" && active.status !== "summary_ready";
  const anySent = refs.length > 0;
  const anyAnswered = refs.some((r) =>
    ["cleared", "details_shared", "connected"].includes(r.status),
  );
  const anyOffer = refs.some((r) => !!r.offerAmount);
  const connected = active?.status === "connected";

  const doneFlags = [summaryDone, anySent, anyAnswered, anyOffer, connected];
  /* השלב הנוכחי: הראשון שטרם הושלם; תיק מחובר = הכול מלא */
  const step = !active ? -1 : connected ? 5 : doneFlags.findIndex((d) => !d);
  const offers = refs.filter((r) => !!r.offerAmount).length;

  return { refs, doneFlags, step, offers, sent: refs.length };
}

export function ClientJourney({ active }: { active?: Case }) {
  const t = useT();
  const { refs, step, offers } = useJourneyState(active);
  const anySent = refs.length > 0;
  const steps: { key: StringKey; note?: string }[] = [
    { key: "journeyStep1" },
    {
      key: "journeyStep2",
      note: anySent ? `${refs.length} ${t("journeyNoteSent")}` : undefined,
    },
    { key: "journeyStep3" },
    {
      key: "journeyStep4",
      note: offers > 0 ? `${offers} ${t("journeyNoteOffers")}` : undefined,
    },
    { key: "journeyStep5" },
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
                  {/*
                    מצב השלב היה ויזואלי בלבד (17/8/2026): וי מול מספר,
                    ועיגול המחוון מסומן aria-hidden. קורא מסך קיבל שלושה
                    שמות שלבים בלי לדעת איפה התיק עומד — WCAG 1.3.1.
                    מילה נסתרת פותרת בלי לגעת בעיצוב.
                  */}
                  <span className="sr-only">
                    {" · "}
                    {done ? t("stepDone") : current ? t("stepCurrent") : t("stepPending")}
                  </span>
                </p>
                {s.note && (
                  <p className="mt-1 text-[12px] font-bold text-gold-ink dark:text-gold">{s.note}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/*
        * השער ללוח המלא: הקובייה נשארת לוח מחוונים, אבל מ-26/8 המסלול
        * כולו — עם ההסברים — גר ב"התיקים שלי", וזו הדלת אליו.
        */}
      <Link
        to="/cases"
        className="mt-4 flex min-h-10 items-center justify-center rounded-2xl bg-foreground/[0.05] text-[12px] font-bold text-gold-ink dark:bg-white/[0.07] dark:text-gold"
      >
        {t("journeyOpenFull")}
      </Link>
    </div>
  );
}