import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BadgeCheck, Check, MapPin, MessageCircle, Phone, Scale, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useT, translate } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { readCaseRaw } from "../lib/db";
import { normalizePhone } from "../lib/auth-service";
import {
  watchMyVerification,
  type VerificationStatus,
} from "../lib/verification-queue";

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

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/8 px-4 py-3 text-xs leading-relaxed text-foreground">
            <Scale className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{t("interestNotice")}</span>
          </div>
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
            ) : canExpress ? (
              <motion.button
                key="express"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  expressInterest(item.id);
                  window.setTimeout(() => router.history.back(), 900);
                }}
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
