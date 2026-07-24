import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Download,
  Inbox,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { cn } from "../lib/utils";
import {
  listVerifications,
  subscribeVerifications,
  updateVerification,
  type VerificationRecord,
  type VerificationStatus,
} from "../lib/verification-queue";
import { exportVerificationPdf } from "../lib/pdf-export";

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
  const [rows, setRows] = useState<VerificationRecord[]>([]);

  const refresh = useCallback(() => setRows(listVerifications()), []);

  useEffect(() => {
    refresh();
    return subscribeVerifications(refresh);
  }, [refresh]);

  function handleUpdate(id: string, status: VerificationStatus) {
    updateVerification(id, status);
    toast.success(status === "approved" ? t("approvedToast") : t("rejectedToast"));
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
                      value={rec.specialties.join(" · ") || "—"}
                    />
                  </dl>

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
