import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useT, type StringKey } from "../lib/i18n";
import { cn } from "../lib/utils";
import type { Case } from "../lib/types";
import { useJourneyState } from "./ClientJourney";

/**
 * לוח המסלול המלא — הלב של "התיקים שלי" (26/8/2026).
 *
 * דביר: "זה כל האפליקציה ואנחנו מפספסים את העיקר ושמים את זה בקובייה
 * על דף הבית". חמשת השלבים בגדול, הסבר אמיתי לכל שלב, והשלב הנוכחי
 * נושא את כפתור הפעולה שלו — פעולה מובילה לפעולה. בוחרים תיק למעלה,
 * הלוח מתחלף לפיו.
 */

const CLOSED_STATUSES = ["withdrawn", "closed", "rejected"];

export function JourneyBoard({ active }: { active: Case }) {
  const t = useT();
  const { step, offers, sent } = useJourneyState(active);
  const isClosed = CLOSED_STATUSES.includes(active.status);

  const steps: { key: StringKey; detail: StringKey; note?: string }[] = [
    { key: "journeyStep1", detail: "journeyDetail1" },
    {
      key: "journeyStep2",
      detail: "journeyDetail2",
      note: sent > 0 ? `${sent} ${t("journeyNoteSent")}` : undefined,
    },
    { key: "journeyStep3", detail: "journeyDetail3" },
    {
      key: "journeyStep4",
      detail: "journeyDetail4",
      note: offers > 0 ? `${offers} ${t("journeyNoteOffers")}` : undefined,
    },
    { key: "journeyStep5", detail: "journeyDetail5" },
  ];

  /* כפתור הפעולה של השלב הנוכחי — או שורת "אין מה לעשות" כשהכדור אצל עורך הדין */
  function currentAction() {
    if (isClosed) {
      return <p className="mt-3 text-[12px] text-muted-foreground dark:text-white/50">{t("journeyClosed")}</p>;
    }
    if (active.status === "validating") {
      return <p className="mt-3 text-[12px] text-muted-foreground dark:text-white/50">{t("validatingCardHint")}</p>;
    }
    const cta = (to: string, label: StringKey) => (
      <Link
        to={to}
        params={{ caseId: active.id }}
        className="btn-gold mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl px-5 text-[13px] font-bold"
      >
        {t(label)}
      </Link>
    );
    switch (step) {
      case 0:
        return cta("/summary/$caseId", "caseSummaryReadyCta");
      case 1:
        return cta("/choose/$caseId", "caseChooseCta");
      case 4:
        return cta("/case/$caseId", "journeyCtaCompare");
      case 5:
        return cta("/case/$caseId", "celebrateCta");
      default:
        /* שלבים 2-3: הכדור אצל עורך הדין */
        return <p className="mt-3 text-[12px] text-muted-foreground dark:text-white/50">{t("journeyNoAction")}</p>;
    }
  }

  return (
    <div className="edge-gold recessed relative overflow-hidden rounded-[26px] bg-[var(--recess-fill)] p-5 dark:bg-[image:radial-gradient(120%_85%_at_18%_-15%,oklch(0.76_0.13_85_/_0.16),transparent_58%)]">
      <p className="text-[11px] font-medium tracking-[0.2em] text-gold-ink dark:text-gold">
        {t("journeyEyebrow")}
      </p>
      <p className="mt-1 text-[16px] font-bold text-foreground dark:text-white">
        {active.title || t("homeCaseUntitled")}
      </p>

      <ol className="mt-6 space-y-0">
        {steps.map((s, i) => {
          const done = step > i;
          const current = step === i || (step === 5 && i === 4);
          const last = i === steps.length - 1;
          return (
            <li key={s.key} className="relative flex items-start gap-3.5 pb-7 last:pb-0">
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-[17px] top-9 bottom-0 w-0.5 rounded-full",
                    done
                      ? "bg-gold dark:bg-gradient-to-b dark:from-gold dark:via-gold/70 dark:to-gold/25"
                      : "bg-foreground/15 dark:bg-white/10",
                  )}
                />
              )}
              <span className="relative mt-0.5 shrink-0" aria-hidden>
                {current && step < 5 && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/40 dark:bg-gold/50" />
                )}
                <span
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full text-[12px] font-black",
                    done &&
                      "bg-gold text-[#0F172A] shadow-[0_0_0_4px_oklch(0.76_0.13_85/0.16)] dark:bg-gold/15 dark:text-gold dark:shadow-[0_0_14px_rgba(212,175,55,0.45)] dark:ring-1 dark:ring-gold/50",
                    current &&
                      !done &&
                      "bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-[0_0_0_3px_rgba(201,162,39,0.22)] dark:shadow-[0_0_18px_rgba(212,175,55,0.6)]",
                    !done &&
                      !current &&
                      "bg-background/70 text-muted-foreground ring-1 ring-foreground/12 dark:bg-white/5 dark:text-white/40 dark:ring-white/15",
                  )}
                >
                  {done ? <Check className="size-4.5" strokeWidth={3} /> : i + 1}
                </span>
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-[14px] font-bold leading-snug",
                    current || done
                      ? "text-foreground dark:text-white"
                      : "text-muted-foreground dark:text-white/50",
                  )}
                >
                  {t(s.key)}
                  <span className="sr-only">
                    {" · "}
                    {done ? t("stepDone") : current ? t("stepCurrent") : t("stepPending")}
                  </span>
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-[12.5px] leading-relaxed",
                    current || done
                      ? "text-foreground/70 dark:text-white/65"
                      : "text-muted-foreground/80 dark:text-white/35",
                  )}
                >
                  {t(s.detail)}
                </p>
                {s.note && (
                  <p className="mt-1.5 text-[12px] font-bold text-gold-ink dark:text-gold">{s.note}</p>
                )}
                {current && currentAction()}
              </div>
            </li>
          );
        })}
      </ol>

      <Link
        to="/case/$caseId"
        params={{ caseId: active.id }}
        className="mt-6 flex min-h-11 items-center justify-center rounded-2xl bg-foreground/[0.05] text-[12.5px] font-bold text-foreground/80 dark:bg-white/[0.07] dark:text-white/80"
      >
        {t("journeyCaseLink")}
      </Link>
    </div>
  );
}
