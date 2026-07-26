import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Bell, MessageSquare, Sparkles, Megaphone, Smartphone, Mail } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — JustAsk" },
      { name: "description", content: "Manage which JustAsk updates you receive and how." },
      { property: "og:title", content: "Notifications — JustAsk" },
      { property: "og:description", content: "Choose the alerts that matter to you." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NotificationsSettings,
});

type Row = { icon: typeof Bell; title: StringKey; sub: StringKey; defaultOn?: boolean };

const topics: Row[] = [
  { icon: Bell, title: "notifCaseUpdates", sub: "notifCaseUpdatesSub", defaultOn: true },
  { icon: MessageSquare, title: "notifLawyerMsgs", sub: "notifLawyerMsgsSub", defaultOn: true },
  { icon: Sparkles, title: "notifNewLeads", sub: "notifNewLeadsSub", defaultOn: true },
  { icon: Megaphone, title: "notifMarketing", sub: "notifMarketingSub", defaultOn: false },
];

const channels: Row[] = [
  { icon: Smartphone, title: "notifPush", sub: "notifPushSub", defaultOn: true },
  { icon: Mail, title: "notifEmail", sub: "notifEmailSub", defaultOn: false },
];

function ToggleRow({ row, last }: { row: Row; last: boolean }) {
  const t = useT();
  const [on, setOn] = useState(!!row.defaultOn);
  const Icon = row.icon;
  return (
    <div className={`flex items-center gap-3 p-4 ${last ? "" : "border-b border-border"}`}>
      <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-sm font-bold text-foreground">{t(row.title)}</p>
        <p className="text-xs text-muted-foreground">{t(row.sub)}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-gold" : "bg-muted"}`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={`absolute top-1 size-5 rounded-full bg-white shadow-md ${on ? "start-6" : "start-1"}`}
        />
      </button>
    </div>
  );
}

function NotificationsSettings() {
  useRequireAuth();
  const t = useT();
  return (
    <AppShell>
      <TopBar title={t("notifTitle")} subtitle={t("notifSub")} />
      <Page>
        <Stagger className="space-y-4 pb-10 pt-4">
          <Rise>
            <div className="liquid-glass overflow-hidden rounded-3xl">
              {topics.map((row, i) => (
                <ToggleRow key={row.title} row={row} last={i === topics.length - 1} />
              ))}
            </div>
          </Rise>
          <Rise>
            <p className="px-2 pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("notifChannelsHeader")}
            </p>
            <div className="liquid-glass mt-2 overflow-hidden rounded-3xl">
              {channels.map((row, i) => (
                <ToggleRow key={row.title} row={row} last={i === channels.length - 1} />
              ))}
            </div>
          </Rise>
        </Stagger>
      </Page>
    </AppShell>
  );
}
