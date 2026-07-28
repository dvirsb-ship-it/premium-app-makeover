import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BadgeCheck, Check, Flag, MapPin, MessageCircle, Phone, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useT, translate } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { readCaseRaw, submitAppeal } from "../lib/db";
import { normalizePhone } from "../lib/auth-service";
import {
  watchMyVerification,
  type VerificationStatus,
} from "../lib/verification-queue";

const offerInputCls =
  "block w-full rounded-2xl border border-white/10 bg-foreground/[0.04] px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-gold/50";

export const Route = createFileRoute("/lawyer-case/$caseId")({
  component: LawyerCaseDetail,
});

type ConnectedCase = {
  title: string;
  category: string;
  summary: string;
  clientContact?: { name: string; phone: string; email: string };
};

function LawyerCaseDetail() {

  useRequireAuth();  const { caseId } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const { getFeedCase, expressInterest, user } = useAppStore();
  const t = useT();
  const item = getFeedCase(caseId);
  const urgentSeed = translate("urgent", "he");

  // סטטוס האימות — הבעת עניין פתוחה רק לעו"ד מאושר (נאכף גם בחוקי השרת)
  const [verStatus, setVerStatus] = useState<VerificationStatus | null>(null);
  useEffect(() => {
    if (!user) return;
    return watchMyVerification(user.uid, (rec) => setVerStatus(rec?.status ?? null));
  }, [user]);

  // תיק שכבר חובר אליי לא מופיע בפיד — נטען ישירות כדי להציג את פרטי הלקוח
  const [connected, setConnected] = useState<ConnectedCase | null>(null);
  useEffect(() => {
    if (item || !user) return;
    void readCaseRaw(caseId)
      .then((raw) => {
        if (raw && raw.chosenLawyerId === user.uid) {
          setConnected({
            title: raw.title,
            category: raw.category,
            summary: raw.summary,
            clientContact: raw.clientContact,
          });
        }
      })
      .catch(() => {});
  }, [item, user, caseId]);

  // פרטי הוולידציה המלאים — הבסיס המשפטי, תאריך, נזק ותיעוד
  const [details, setDetails] = useState<{
    legalBasis?: string;
    incidentDate?: string;
    damageType?: string;
    hasDocumentation?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!item) return;
    void readCaseRaw(caseId)
      .then((raw) => {
        if (raw) {
          setDetails({
            legalBasis: raw.legalBasis,
            incidentDate: raw.incidentDate,
            damageType: raw.damageType,
            hasDocumentation: raw.hasDocumentation,
          });
        }
      })
      .catch(() => {});
  }, [item, caseId]);

  // טופס ההצעה שנשלחת עם הבעת העניין
  const [offerOpen, setOfferOpen] = useState(false);
  const [fee, setFee] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");

  // ערעור על הוולידציה
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSent, setAppealSent] = useState(false);

  function sendAppeal() {
    const reason = appealReason.trim();
    if (!reason || !user || !item) return;
    void submitAppeal({
      caseId: item.id,
      caseTitle: item.title,
      lawyerId: user.uid,
      lawyerName: user.displayName || "עורך דין",
      reason,
    })
      .then(() => {
        setAppealSent(true);
        setAppealOpen(false);
        toast.success(t("appealSentMsg"));
      })
      .catch(() => toast.error(t("authErrGeneric")));
  }

  function damageLabel(v?: string) {
    if (v === "financial") return t("damageFinancial");
    if (v === "both") return t("damageBoth");
    return t("damageBody");
  }

  if (!item && connected) {
    const c = connected.clientContact;
    return (
      <AppShell bare>
        <Page className="flex min-h-screen flex-col">
          <TopBar title={t("leadDetailsTitle")} subtitle={connected.category} />
          <div className="flex-1 px-5 pt-6">
            <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success">
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

  if (!item) {
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

  const canExpress = verStatus === "approved";

  return (
    <AppShell bare>
      <Page className="flex min-h-screen flex-col">
        <TopBar title={t("leadDetailsTitle")} subtitle={item.category} />

        <div className="flex-1 px-5 pt-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
              {item.category}
            </span>
            {item.urgency === urgentSeed && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold text-destructive">
                {t("urgent")}
              </span>
            )}
          </div>

          <h2 className="mt-4 text-xl font-black leading-snug text-foreground">
            {item.title}
          </h2>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-gold" />
              {item.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-gold" />
              {item.interestedCount} {t("interestedSuffix")}
            </span>
            <span>{item.postedAgo}</span>
          </div>

          <div className="liquid-glass mt-6 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-foreground">{t("caseDescriptionHeader")}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          {details && (details.legalBasis || details.incidentDate) && (
            <div className="liquid-glass mt-4 rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-gold" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-foreground">{t("whyApprovedHeader")}</h3>
              </div>
              {details.legalBasis && (
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {details.legalBasis}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("incidentDateLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground" dir="ltr">{details.incidentDate || "—"}</dd>
                </div>
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("damageTypeLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground">{damageLabel(details.damageType)}</dd>
                </div>
                <div className="rounded-2xl bg-foreground/[0.04] px-2 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("documentationLabel")}</dt>
                  <dd className="mt-0.5 text-[12px] font-bold text-foreground">{details.hasDocumentation ? t("docYes") : t("docNo")}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/8 px-4 py-3 text-xs leading-relaxed text-foreground">
            <Scale className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{t("interestNotice")}</span>
          </div>

          {/* ערעור על הוולידציה — הוולידציה הכפולה של קהילת עורכי הדין */}
          {!appealSent && (
            <div className="mt-3 pb-2">
              {appealOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="liquid-glass rounded-2xl p-4"
                >
                  <p className="text-[13px] font-bold text-foreground">{t("appealLink")}</p>
                  <textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    rows={3}
                    placeholder={t("appealPlaceholder")}
                    className={`${offerInputCls} mt-2 resize-none`}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={sendAppeal}
                      disabled={!appealReason.trim()}
                      className="btn-gold flex-1 rounded-2xl py-2.5 text-[13px] font-bold disabled:opacity-40"
                    >
                      {t("appealSend")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppealOpen(false)}
                      className="liquid-glass flex-1 rounded-2xl py-2.5 text-[13px] font-semibold text-foreground"
                    >
                      {t("cancelAction")}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAppealOpen(true)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <Flag className="size-3.5" strokeWidth={2.2} />
                  {t("appealLink")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border/60 bg-background/90 px-5 py-5 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {item.expressed ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-success/12 py-4 text-sm font-bold text-success"
              >
                <Check className="size-5" strokeWidth={3} />
                {t("interestSent")}
              </motion.div>
            ) : canExpress && offerOpen ? (
              <motion.div
                key="offer"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass max-h-[60vh] space-y-2.5 overflow-y-auto rounded-3xl p-4"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-gold" strokeWidth={2.2} />
                  <p className="text-[13px] font-bold text-foreground">{t("offerTitle")}</p>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerFeeLabel")}</span>
                  <input
                    className={offerInputCls}
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder={t("offerFeePh")}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerDurationLabel")}</span>
                  <input
                    className={offerInputCls}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder={t("offerDurationPh")}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-foreground/80">{t("offerNoteLabel")}</span>
                  <textarea
                    className={`${offerInputCls} resize-none`}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("offerNotePh")}
                  />
                </label>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    expressInterest(item.id, {
                      fee: fee.trim(),
                      duration: duration.trim(),
                      note: note.trim(),
                    });
                    window.setTimeout(() => router.history.back(), 900);
                  }}
                  className="btn-gold w-full rounded-2xl py-3.5 text-[15px] font-bold"
                >
                  {t("offerSend")}
                </motion.button>
              </motion.div>
            ) : canExpress ? (
              <motion.button
                key="express"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOfferOpen(true)}
                className="btn-gold w-full rounded-2xl py-4 text-base font-bold"
              >
                {t("imInterested")}
              </motion.button>
            ) : (
              <motion.div
                key="locked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <ShieldCheck className="size-4.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">
                    {t("interestLockedTitle")}
                  </p>
                  {verStatus === "pending" ? (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {t("interestLockedPending")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/lawyer-onboarding" })}
                      className="mt-0.5 text-[12px] font-bold text-gold underline-offset-2 hover:underline"
                    >
                      {t("interestLockedCta")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Page>
    </AppShell>
  );
}
