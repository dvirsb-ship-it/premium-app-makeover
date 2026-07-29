import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircle, Phone, Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";
import { useAppStore } from "../lib/store";
import {
  avgResponseLabel,
  caseImageUrl,
  watchMilestones,
  type CaseMilestone,
  readCaseLawyerContact,
  readCaseRaw,
  readLawyerStats,
  type CaseImage,
  type LawyerContactDoc,
} from "../lib/db";
import { BadgeCheck } from "lucide-react";
import { normalizePhone } from "../lib/auth-service";
import { toneClasses, useStatusMeta } from "../lib/status";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { CaseOffer, Lawyer } from "../lib/types";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/case/$caseId")({
  component: CaseDetail,
});

function CaseDetail() {

  useRequireAuth();  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const { getCase, chooseLawyer } = useAppStore();
  const { dir } = useSettings();
  const t = useT();
  const statusMeta = useStatusMeta();
  const item = getCase(caseId);
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  // הבסיס המשפטי מהוולידציה — הלקוח רואה על מה התיק אושר
  const [legalBasis, setLegalBasis] = useState<string>("");
  // בדחייה: ההמלצה מה כן לעשות
  const [recommendation, setRecommendation] = useState<string>("");
  // רשימת ההכנה שנגזרה מהראיון — התוצר שהלקוח לא קיבל עד היום
  const [checklist, setChecklist] = useState<string[]>([]);
  // ציר הזמן שאחרי החיבור — כדי שלא ישאל "מה קורה עם התיק שלי"
  const [milestones, setMilestones] = useState<CaseMilestone[]>([]);
  useEffect(() => watchMilestones(caseId, setMilestones), [caseId]);
  // תמונות המקור — ללקוח בלבד (עו"ד רואה גרסה מצונזרת)
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  useEffect(() => {
    void readCaseRaw(caseId)
      .then(async (raw) => {
        setLegalBasis(raw?.legalBasis ?? "");
        setRecommendation(raw?.recommendation ?? "");
        setChecklist((raw?.clientChecklist as string[] | undefined) ?? []);
        const imgs = (raw?.images ?? []) as CaseImage[];
        const urls = await Promise.all(
          imgs.map((im) => caseImageUrl(im.origPath).catch(() => "")),
        );
        setImageUrls(urls.filter(Boolean));
      })
      .catch(() => {});
  }, [caseId]);

  /*
   * מדד התגובתיות של כל עו"ד שהביע עניין — הפלטפורמה מדדה אותו בעצמה,
   * ולכן הוא אמת ולא הצהרה שיווקית.
   */
  const interestedIdsKey = item?.interested.map((l) => l.id).join(",") ?? "";
  const [responseLabels, setResponseLabels] = useState<Record<string, string | null>>({});
  useEffect(() => {
    const ids = interestedIdsKey ? interestedIdsKey.split(",") : [];
    if (!ids.length) return;
    let cancelled = false;
    void Promise.all(
      ids.map(async (id) => [id, avgResponseLabel(await readLawyerStats(id))] as const),
    ).then((pairs) => {
      if (!cancelled) setResponseLabels(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [interestedIdsKey]);

  // פרטי הקשר של עורך הדין הנבחר — נחשפים רק אחרי הבחירה (תת-אוסף מוגן)
  const chosenId = item?.chosenLawyerId;
  const [chosenProfile, setChosenProfile] = useState<LawyerContactDoc | null>(null);
  useEffect(() => {
    if (!chosenId) return;
    void readCaseLawyerContact(caseId, chosenId).then(setChosenProfile).catch(() => {});
  }, [caseId, chosenId]);

  function contactMessage() {
    if (chosenProfile?.phone) {
      const digits = normalizePhone(chosenProfile.phone).replace("+", "");
      window.open(`https://wa.me/${digits}`, "_blank", "noopener");
    } else if (chosenProfile?.email) {
      window.location.href = `mailto:${chosenProfile.email}`;
    } else {
      toast.info(t("contactUnavailable"));
    }
  }

  function contactCall() {
    if (chosenProfile?.phone) {
      window.location.href = `tel:${normalizePhone(chosenProfile.phone)}`;
    } else {
      toast.info(t("contactUnavailable"));
    }
  }

  if (!item) {
    return (
      <AppShell>
        <TopBar title={t("caseNotFound")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">{t("caseNotExist")}</p>
          <Link
            to="/cases"
            className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
          >
            {t("toMyCases")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const meta = statusMeta(item.status);
  const chosen = item.interested.find((l) => l.id === item.chosenLawyerId);

  return (
    <AppShell bare>
      <Page className="min-h-screen">
        <TopBar title={t("caseDetailsTitle")} subtitle={item.category} />

        <div className="px-5 pt-6">
          <div className="liquid-glass rounded-3xl p-5">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[meta.tone]}`}
            >
              {meta.label}
            </span>
            <h2 className="mt-3 text-lg font-bold leading-snug text-foreground">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          {item.status === "validating" && (
            <div className="liquid-glass mt-3 rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 shrink-0 animate-spin text-gold" />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">
                    {t("deepCheckRunning")}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {t("deepCheckRunningSub")}
                  </p>
                </div>
              </div>
              {/* מוצג רק אם הבדיקה נתקעה — למשל אם הדפדפן נסגר באמצע */}
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem("justask-active-case", item.id);
                  } catch {
                    /* ignore */
                  }
                  navigate({ to: "/validating" });
                }}
                className="mt-4 w-full rounded-2xl border border-border py-2.5 text-[12px] font-semibold text-muted-foreground transition active:scale-[0.98]"
              >
                {t("resumeValidation")}
              </button>
            </div>
          )}

          {item.status !== "validating" && item.status !== "rejected" && legalBasis && (
            <div className="liquid-glass mt-3 flex items-start gap-3 rounded-3xl px-4 py-3.5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                <BadgeCheck className="size-4.5" strokeWidth={2.2} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground">{t("caseValidatedChip")}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  {legalBasis}
                </p>
              </div>
            </div>
          )}

          {item.status === "rejected" && (
            <div className="liquid-glass mt-3 rounded-3xl p-4">
              <p className="text-[13px] font-bold text-foreground">{t("intakeNotSuitableTitle")}</p>
              {legalBasis && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {legalBasis}
                </p>
              )}
              {recommendation && (
                <div className="mt-3 rounded-2xl bg-gold/8 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gold">
                    {t("intakeNotSuitableRec")}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">
                    {recommendation}
                  </p>
                </div>
              )}
            </div>
          )}

          {milestones.length > 0 && (
            <div className="liquid-glass mt-3 rounded-3xl p-5">
              <p className="text-[13px] font-bold text-foreground">{t("timelineHeader")}</p>
              <ol className="mt-3 space-y-3">
                {milestones.map((m) => (
                  <li key={m.key} className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-foreground">
                        {t(`ms_${m.key}` as never)}
                      </p>
                      {m.note && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          {m.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                        {new Date(m.at).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {checklist.length > 0 && item.status !== "rejected" && (
            <div className="liquid-glass mt-3 rounded-3xl p-4">
              <p className="text-[13px] font-bold text-foreground">{t("checklistHeader")}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {t("checklistSub")}
              </p>
              <ul className="mt-3 space-y-2">
                {checklist.map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                    <span className="text-[13px] leading-relaxed text-foreground/90">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {imageUrls.length > 0 && (
            <div className="liquid-glass mt-3 rounded-3xl p-4">
              <p className="text-[13px] font-bold text-foreground">{t("caseImagesHeader")}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {t("caseImagesSub")}
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {imageUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img
                      src={url}
                      alt=""
                      className="h-24 w-24 rounded-2xl border border-border object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {chosen ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="liquid-glass rounded-3xl p-5 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-success text-success-foreground shadow-lg shadow-success/30">
                    <Check className="size-6" strokeWidth={3} />
                  </span>
                  <h3 className="mt-3 text-base font-bold text-foreground">
                    {t("connectedWith")} {chosenProfile?.fullName || chosen.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("orDirectContact")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/lawyer-profile/$lawyerId",
                        params: { lawyerId: chosen.id },
                      })
                    }
                    className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
                  >
                    {t("viewFullProfile")}
                    <Arrow className="size-4" />
                  </button>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={contactMessage}
                      className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                    >
                      <MessageCircle className="size-4 text-gold" />
                      {t("messageAction")}
                    </button>
                    <button
                      type="button"
                      onClick={contactCall}
                      className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
                    >
                      <Phone className="size-4 text-gold" />
                      {t("callAction")}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : item.status === "rejected" ? (
              // תיק שנדחה לא יגיע לעורכי דין — הבטחת "נעדכן אותך" כאן היא שקר
              <motion.div key="rejected-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
            ) : (
              <motion.div
                key="choose"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    {t("lawyersInterestedHeader")}
                  </h3>
                  <span className="text-sm font-bold text-gold">
                    {item.interested.length}
                  </span>
                </div>

                {item.interested.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
                    {t("noInterestYet")}
                  </div>
                ) : (
                  <Stagger className="space-y-4">
                    {item.interested.map((l) => (
                      <Rise key={l.id}>
                        <LawyerChoiceCard
                          lawyer={l}
                          offer={item.offers?.[l.id]}
                          responseLabel={responseLabels[l.id]}
                          onChoose={() => chooseLawyer(item.id, l.id)}
                        />
                      </Rise>
                    ))}
                  </Stagger>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Page>
    </AppShell>
  );
}

function LawyerChoiceCard({
  lawyer,
  offer,
  responseLabel,
  onChoose,
}: {
  lawyer: Lawyer;
  offer?: CaseOffer;
  /** מדד תגובתיות שהפלטפורמה מדדה — לא הצהרה של עורך הדין */
  responseLabel?: string | null;
  onChoose: () => void;
}) {
  const t = useT();
  return (
    <div className="liquid-glass rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="chip-gold grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black">
          {lawyer.initials}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-bold leading-tight text-foreground">
            {lawyer.name}
          </h4>
          <p className="truncate text-xs text-muted-foreground">{lawyer.firm}</p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-0.5 font-bold text-foreground">
              <Star className="size-3.5 fill-gold text-gold" />
              {lawyer.rating}
            </span>
            <span className="text-muted-foreground">
              ({lawyer.reviews}) · {lawyer.years} {t("yearsExperience")}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {lawyer.blurb}
      </p>
      {offer && (offer.amount > 0 || offer.fee) && (
        <div className="mt-3 rounded-2xl border border-gold/25 bg-gold/[0.06] p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
            {t("offerHeader")}
          </p>

          {/* המספר הגדול — מה שמשווים */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground" dir="ltr">
              {offer.model === "contingency"
                ? `${offer.amount}%`
                : `\u20aa${offer.amount.toLocaleString("he-IL")}`}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">
              {t(
                offer.model === "contingency"
                  ? "offerOfAward"
                  : offer.model === "hourly"
                    ? "offerPerHour"
                    : "offerFixedTotal",
              )}
            </span>
          </div>

          {responseLabel && (
            <p className="mt-1.5 text-[12px] text-foreground">
              <span className="text-muted-foreground">{t("responseTimeLabel")} </span>
              <span className="font-bold">{responseLabel}</span>
              <span className="text-muted-foreground"> {t("responseTimeAvg")}</span>
            </p>
          )}

          {offer.noWinNoFee && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success">
              <Check className="size-3" strokeWidth={3} />
              {t("offerNoWinBadge")}
            </p>
          )}

          {/* ההוצאות הנלוות — הפער שבו לקוחות נכווים */}
          <div className="mt-2.5 border-t border-gold/15 pt-2.5">
            <p className="text-[12px] text-foreground">
              <span className="text-muted-foreground">{t("offerExpensesShort")}: </span>
              <span className="font-bold">
                {t(
                  offer.expenses === "included"
                    ? "expensesIncluded"
                    : offer.expenses === "advanced"
                      ? "expensesAdvanced"
                      : "expensesClient",
                )}
              </span>
              {offer.expensesEstimate ? ` \u00b7 ${offer.expensesEstimate}` : ""}
            </p>
            {offer.duration && (
              <p className="mt-1 text-[12px] text-foreground">
                <span className="text-muted-foreground">{t("offerDurationShort")}: </span>
                <span className="font-bold">{offer.duration}</span>
              </p>
            )}
          </div>

          {offer.note && (
            <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
              \u05f4{offer.note}\u05f4
            </p>
          )}

          <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground/80">
            {t("offerNonBindingShort")}
          </p>
        </div>
      )}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onChoose}
        className="btn-gold mt-4 w-full rounded-2xl py-3 text-sm font-bold"
      >
        {t("chooseThisLawyer")}
      </motion.button>
    </div>
  );
}
