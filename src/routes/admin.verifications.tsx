import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Download,
  FileText,
  IdCard,
  Inbox,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useAppStore } from "../lib/store";
import { isAdminUser } from "../lib/admin";
import { cn } from "../lib/utils";
import {
  updateVerification,
  verificationFileUrl,
  watchVerifications,
  type VerificationRecord,
  type VerificationStatus,
} from "../lib/verification-queue";
import {
  computeFunnel,
  markDeletionDone,
  markServerErrorHandled,
  markTicketHandled,
  resolveAppeal,
  watchAllCasesAdmin,
  watchAppeals,
  watchDeletionRequests,
  watchServerErrors,
  watchSupportTickets,
  type AdminCaseRow,
  type AppealDoc,
  type DeletionRequestDoc,
  type ServerErrorDoc,
  type SupportTicketDoc,
} from "../lib/db";
import { exportVerificationPdf } from "../lib/pdf-export";

function formatSpecialties(rec: VerificationRecord): string {
  if (!rec.specialties.length) return "—";
  return rec.specialties
    .map((id) =>
      id === "other" && rec.otherSpecialty?.trim()
        ? `אחר: ${rec.otherSpecialty.trim()}`
        : id,
    )
    .join(" · ");
}

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({
    meta: [
      { title: "JustAsk — Verification queue" },
      {
        name: "description",
        content:
          "Internal review queue for pending lawyer verification applications on JustAsk.",
      },
      { property: "og:title", content: "JustAsk — Verification queue" },
      {
        property: "og:description",
        content: "Approve or reject lawyer applications with a single tap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificationQueue,
});

function VerificationQueue() {
  const t = useT();
  const { lang } = useSettings();
  const navigate = useNavigate();
  const { user, authReady } = useAppStore();
  const [rows, setRows] = useState<VerificationRecord[]>([]);

  // גישה לאדמין בלבד (החוקים בשרת אוכפים את זה ממילא — זו רק חוויית משתמש)
  useEffect(() => {
    if (authReady && !isAdminUser(user)) {
      navigate({ to: "/", replace: true });
    }
  }, [authReady, user, navigate]);

  useEffect(() => {
    if (!authReady || !isAdminUser(user)) return;
    return watchVerifications(setRows);
  }, [authReady, user]);

  const [appeals, setAppeals] = useState<AppealDoc[]>([]);
  useEffect(() => {
    if (!authReady || !isAdminUser(user)) return;
    return watchAppeals(setAppeals);
  }, [authReady, user]);

  function handleAppeal(appeal: AppealDoc, accepted: boolean) {
    void resolveAppeal(appeal, accepted)
      .then(() => toast.success(accepted ? t("appealAcceptedToast") : t("appealDismissedToast")))
      .catch(() => toast.error(t("authErrGeneric")));
  }

  const [tickets, setTickets] = useState<SupportTicketDoc[]>([]);
  const [allCases, setAllCases] = useState<AdminCaseRow[]>([]);
  const [deletions, setDeletions] = useState<DeletionRequestDoc[]>([]);
  const [errors, setErrors] = useState<ServerErrorDoc[]>([]);
  useEffect(() => {
    if (!authReady || !isAdminUser(user)) return;
    const un1 = watchSupportTickets(setTickets);
    const un2 = watchAllCasesAdmin(setAllCases);
    const un3 = watchDeletionRequests(setDeletions);
    const un4 = watchServerErrors(setErrors);
    return () => {
      un1();
      un2();
      un3();
      un4();
    };
  }, [authReady, user]);

  function handleUpdate(id: string, status: VerificationStatus) {
    void updateVerification(id, status)
      .then(() =>
        toast.success(status === "approved" ? t("approvedToast") : t("rejectedToast")),
      )
      .catch(() => toast.error(t("authErrGeneric")));
  }

  function openFile(path?: string) {
    if (!path) return;
    void verificationFileUrl(path)
      .then((url) => window.open(url, "_blank", "noopener"))
      .catch(() => toast.error(t("authErrGeneric")));
  }

  const dateFmt = (n: number) =>
    new Date(n).toLocaleString(lang === "he" ? "he-IL" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <AppShell>
      <TopBar
        title={t("adminQueueTitle")}
        subtitle={t("adminQueueSub")}
        onBack={() => navigate({ to: "/" })}
      />

      <main className="mt-5 flex-1 pb-10">
        {rows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="liquid-glass mt-8 flex flex-col items-center gap-3 rounded-3xl px-6 py-10 text-center"
          >
            <span className="grid size-14 place-items-center rounded-full bg-gold/15 text-gold">
              <Inbox className="size-6" strokeWidth={2.2} aria-hidden />
            </span>
            <h2 className="text-lg font-bold text-foreground">{t("queueEmpty")}</h2>
            <p className="max-w-xs text-sm text-muted-foreground">{t("queueEmptySub")}</p>
          </motion.div>
        ) : (
          <ul className="space-y-3" aria-label={t("adminQueueTitle")}>
            <AnimatePresence initial={false}>
              {rows.map((rec, i) => (
                <motion.li
                  key={rec.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                  className="liquid-glass rounded-3xl px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[15px] font-bold text-foreground">
                          {rec.fullName || "—"}
                        </h3>
                        <StatusPill status={rec.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {rec.email} · {rec.phone}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t("submittedOn")} {dateFmt(rec.submittedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportVerificationPdf(rec)}
                      aria-label={t("downloadPdf")}
                      className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                    >
                      <Download className="size-4" strokeWidth={2.4} aria-hidden />
                    </button>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                    <Meta label={t("fieldIdNumber")} value={rec.idNumber} />
                    <Meta
                      label={t("fieldBarNumber")}
                      value={rec.barNumber ? `#${rec.barNumber} · ${rec.barYear}` : "—"}
                    />
                    <Meta
                      label={t("fieldUniversity")}
                      value={`${rec.university} · ${rec.gradYear}`}
                    />
                    <Meta
                      label={t("stepSpecTitle")}
                      value={formatSpecialties(rec)}
                    />
                  </dl>

                  {(rec.files?.barCard || rec.files?.diploma) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rec.files?.barCard && (
                        <button
                          type="button"
                          onClick={() => openFile(rec.files?.barCard)}
                          className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-foreground transition active:scale-95"
                        >
                          <IdCard className="size-3.5 text-gold" strokeWidth={2.2} aria-hidden />
                          {t("docBarCard")}
                        </button>
                      )}
                      {rec.files?.diploma && (
                        <button
                          type="button"
                          onClick={() => openFile(rec.files?.diploma)}
                          className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-foreground transition active:scale-95"
                        >
                          <FileText className="size-3.5 text-gold" strokeWidth={2.2} aria-hidden />
                          {t("docDiploma")}
                        </button>
                      )}
                    </div>
                  )}

                  {rec.status === "pending" && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleUpdate(rec.id, "approved")}
                        className="btn-gold flex h-11 items-center justify-center gap-2 rounded-full text-[13px] font-bold"
                      >
                        <ShieldCheck className="size-4" strokeWidth={2.4} aria-hidden />
                        {t("approve")}
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleUpdate(rec.id, "rejected")}
                        className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                      >
                        <ShieldAlert className="size-4" strokeWidth={2.4} aria-hidden />
                        {t("reject")}
                      </motion.button>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        {/* ערעורי ולידציה מעורכי דין */}
        <h2 className="mt-10 text-base font-bold text-foreground">{t("adminAppealsHeader")}</h2>
        {appeals.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("appealsEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-3" aria-label={t("adminAppealsHeader")}>
            <AnimatePresence initial={false}>
              {appeals.map((a, i) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                  className="liquid-glass rounded-3xl px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-bold text-foreground">
                        {a.caseTitle || a.caseId}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t("appealBy")} {a.lawyerName} · {dateFmt(a.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        a.status === "open" && "bg-gold/20 text-gold",
                        a.status === "accepted" && "bg-success/15 text-success",
                        a.status === "dismissed" && "bg-white/10 text-muted-foreground",
                      )}
                    >
                      {a.status === "open"
                        ? t("statusPending")
                        : a.status === "accepted"
                          ? t("appealAcceptedToast")
                          : t("appealDismissedToast")}
                    </span>
                  </div>
                  <p className="mt-2 rounded-2xl bg-foreground/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-foreground/90">
                    {a.reason}
                  </p>
                  {a.status === "open" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAppeal(a, true)}
                        className="btn-gold flex h-11 items-center justify-center gap-2 rounded-full text-[13px] font-bold"
                      >
                        <ShieldCheck className="size-4" strokeWidth={2.4} aria-hidden />
                        {t("appealAccept")}
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAppeal(a, false)}
                        className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 text-[13px] font-semibold text-foreground"
                      >
                        <ShieldAlert className="size-4" strokeWidth={2.4} aria-hidden />
                        {t("appealDismiss")}
                      </motion.button>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        {/* פניות תמיכה */}
        <h2 className="mt-10 text-base font-bold text-foreground">{t("adminSupportHeader")}</h2>
        {tickets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("supportEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-3" aria-label={t("adminSupportHeader")}>
            {tickets.map((tk) => (
              <li key={tk.id} className="liquid-glass rounded-3xl px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-[11px] text-muted-foreground" dir="ltr">
                    {tk.email || tk.userId} · {dateFmt(tk.createdAt)}
                  </p>
                  {tk.status === "open" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void markTicketHandled(tk.id).catch(() => toast.error(t("authErrGeneric")))
                      }
                      className="shrink-0 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-gold transition active:scale-95"
                    >
                      {t("ticketMarkHandled")}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success">
                      {t("ticketHandled")}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">{tk.message}</p>
              </li>
            ))}
          </ul>
        )}

        {/* חדר הבקרה — עונה על "האם זה מצליח", לא רק "האם זה עובד" */}
        <h2 className="text-base font-bold text-foreground">{t("funnelHeader")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("funnelSub")}</p>
        {(() => {
          const f = computeFunnel(allCases);
          const steps: { label: string; value: number; of?: number }[] = [
            { label: t("funnelCreated"), value: f.created },
            { label: t("funnelPassed"), value: f.passed, of: f.created },
            { label: t("funnelInterest"), value: f.withInterest, of: f.passed },
            { label: t("funnelConnected"), value: f.connected, of: f.withInterest },
          ];
          return (
            <>
              <div className="mt-3 space-y-2">
                {steps.map((s) => {
                  const pct = s.of && s.of > 0 ? Math.round((s.value / s.of) * 100) : null;
                  const width = f.created > 0 ? Math.max(4, (s.value / f.created) * 100) : 0;
                  return (
                    <div key={s.label} className="liquid-glass rounded-2xl px-4 py-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[12px] font-semibold text-foreground">{s.label}</span>
                        <span className="text-[13px] font-black text-foreground" dir="ltr">
                          {s.value}
                          {pct !== null && (
                            <span className="ms-1.5 text-[11px] font-bold text-gold">{pct}%</span>
                          )}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="liquid-glass rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{t("funnelRejected")}</p>
                  <p className="mt-0.5 text-lg font-black text-foreground" dir="ltr">{f.rejected}</p>
                </div>
                <div className="liquid-glass rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{t("funnelMedianOffer")}</p>
                  <p className="mt-0.5 text-lg font-black text-foreground" dir="ltr">
                    {f.medianFirstOfferMins === null
                      ? "—"
                      : f.medianFirstOfferMins < 60
                        ? `${f.medianFirstOfferMins}m`
                        : `${Math.round(f.medianFirstOfferMins / 60)}h`}
                  </p>
                </div>
              </div>

              {/* אות הכיול: קטגוריה שאושרה ואף עו"ד לא נגע בה */}
              {f.byCategory.some((c) => c.noInterest > 0) && (
                <div className="mt-2 rounded-2xl border border-gold/25 bg-gold/[0.06] p-4">
                  <p className="text-[12px] font-bold text-gold">{t("funnelCalibration")}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {t("funnelCalibrationSub")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {f.byCategory
                      .filter((c) => c.noInterest > 0)
                      .map((c) => (
                        <li key={c.category} className="text-[12px] text-foreground">
                          {c.category} —{" "}
                          <span className="font-bold">
                            {c.noInterest}/{c.passed}
                          </span>{" "}
                          <span className="text-muted-foreground">{t("funnelNoInterest")}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          );
        })()}

        {/* תקלות שרת — כשל שקט בפונקציות ה-AI מגיע לכאן במקום להיעלם */}
        <h2 className="mt-10 text-base font-bold text-foreground">{t("adminErrorsHeader")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("adminErrorsSub")}</p>
        {errors.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("errorsEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-3" aria-label={t("adminErrorsHeader")}>
            {errors.map((e) => (
              <li
                key={e.id}
                className={`liquid-glass rounded-3xl px-4 py-4 ${e.handled ? "opacity-60" : "border border-destructive/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-foreground">{e.context}</p>
                    <p className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground" dir="ltr">
                      {e.message}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{dateFmt(e.at)}</p>
                  </div>
                  {e.handled ? (
                    <span className="shrink-0 rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success">
                      {t("errorHandled")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void markServerErrorHandled(e.id).catch(() => toast.error(t("authErrGeneric")))
                      }
                      className="shrink-0 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-gold transition active:scale-95"
                    >
                      {t("errorMarkHandled")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* בקשות מחיקת חשבון — התחייבות 14 הימים מהתקנון */}
        <h2 className="mt-10 text-base font-bold text-foreground">{t("adminDeletionsHeader")}</h2>
        {deletions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("deletionsEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-3" aria-label={t("adminDeletionsHeader")}>
            {deletions.map((d) => (
              <li key={d.id} className="liquid-glass rounded-3xl px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground" dir="ltr">
                      {d.email || d.userId}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {dateFmt(d.createdAt)}
                      {d.reason ? ` · ${d.reason}` : ""}
                    </p>
                  </div>
                  {d.status === "open" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void markDeletionDone(d.id).catch(() => toast.error(t("authErrGeneric")))
                      }
                      className="shrink-0 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-gold transition active:scale-95"
                    >
                      {t("deletionMarkDone")}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success">
                      {t("deletionDone")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ארכיון תיקים */}
        <h2 className="mt-10 text-base font-bold text-foreground">
          {t("adminCasesHeader")}
          <span className="ms-2 text-sm font-normal text-muted-foreground">({allCases.length})</span>
        </h2>
        {allCases.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("adminCasesEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label={t("adminCasesHeader")}>
            {allCases.map((c) => (
              <li key={c.id} className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-foreground">{c.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {c.category || "—"}{c.location ? ` · ${c.location}` : ""} · {dateFmt(c.createdAt)} · {c.interestedCount} {t("interestedSuffix")}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
                    c.status === "connected" && "bg-success/15 text-success",
                    c.status === "rejected" && "bg-destructive/15 text-destructive",
                    (c.status === "matching" || c.status === "has_interest") && "bg-gold/15 text-gold",
                    c.status === "validating" && "bg-white/10 text-muted-foreground",
                  )}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const t = useT();
  const label =
    status === "approved" ? t("statusApproved") : status === "rejected" ? t("statusRejected") : t("statusPending");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        status === "approved" && "bg-gold/20 text-gold",
        status === "rejected" && "bg-white/10 text-muted-foreground",
        status === "pending" && "bg-white/10 text-foreground",
      )}
    >
      {status === "approved" && <BadgeCheck className="size-3" aria-hidden />}
      {label}
    </span>
  );
}
