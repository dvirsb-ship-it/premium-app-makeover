import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BadgeCheck, Bell, Sparkles, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";
import { useAppStore } from "../lib/store";
import { useT } from "../lib/i18n";
import { useTimeAgo } from "../lib/status";
import { useRequireAuth } from "../lib/require-auth";
import { cn } from "../lib/utils";
import type { AppNotification } from "../lib/db";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — JustAsk" },
      { name: "description", content: "All updates about your cases in one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Notifications,
});

function iconFor(type: string) {
  switch (type) {
    case "new_case":
      return Sparkles;
    case "lawyer_interest":
      return Users;
    case "chosen":
      return BadgeCheck;
    default:
      return Bell;
  }
}

function Notifications() {
  useRequireAuth();
  const navigate = useNavigate();
  const { role, notifications, markRead } = useAppStore();
  const t = useT();
  const timeAgo = useTimeAgo();

  function open(n: AppNotification) {
    if (!n.read) markRead(n.id);
    if (!n.caseId) return;
    if (role === "lawyer") {
      navigate({ to: "/lawyer-case/$caseId", params: { caseId: n.caseId } });
    } else {
      navigate({ to: "/case/$caseId", params: { caseId: n.caseId } });
    }
  }

  return (
    <AppShell>
      <TopBar title={t("notifCenterTitle")} subtitle={t("notifCenterSub")} />

      {notifications.length === 0 ? (
        <div className="pt-10">
          <EmptyState icon={Bell} title={t("notifEmpty")} />
        </div>
      ) : (
        <div className="mt-5 space-y-3 pb-8">
          {notifications.map((n, i) => {
            const Icon = iconFor(n.type);
            return (
              <motion.button
                key={n.id}
                type="button"
                onClick={() => open(n)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "liquid-glass relative flex w-full items-start gap-3 rounded-[22px] px-4 py-3.5 text-start",
                  !n.read && "border border-gold/35",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-10 shrink-0 place-items-center rounded-full",
                    n.read ? "bg-foreground/5 text-muted-foreground" : "bg-gold/15 text-gold",
                  )}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-[14px] font-bold",
                        n.read ? "text-foreground/80" : "text-foreground",
                      )}
                    >
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="size-2 shrink-0 rounded-full bg-gold" aria-hidden />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                    {n.body}
                  </span>
                  <span className="mt-1.5 block text-[11px] text-muted-foreground/70">
                    {timeAgo(n.createdAt)}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
