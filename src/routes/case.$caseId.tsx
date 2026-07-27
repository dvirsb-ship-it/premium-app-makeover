import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Phone, Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Stagger, Rise } from "../components/motion";
import { useAppStore } from "../lib/store";
import { readLawyerProfile, type LawyerProfileDoc } from "../lib/db";
import { normalizePhone } from "../lib/auth-service";
import { toneClasses, useStatusMeta } from "../lib/status";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { Lawyer } from "../lib/types";
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

  // פרטי הקשר של עורך הדין הנבחר — מהמדריך הציבורי
  const chosenId = item?.chosenLawyerId;
  const [chosenProfile, setChosenProfile] = useState<LawyerProfileDoc | null>(null);
  useEffect(() => {
    if (!chosenId) return;
    void readLawyerProfile(chosenId).then(setChosenProfile).catch(() => {});
  }, [chosenId]);

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
                    {t("connectedWith")} {chosen.name}
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
  onChoose,
}: {
  lawyer: Lawyer;
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
