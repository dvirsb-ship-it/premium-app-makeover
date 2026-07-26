import { createFileRoute } from "@tanstack/react-router";
import { Lock, ShieldCheck, UserCheck, Trash2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/settings/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & security — JustAsk" },
      { name: "description", content: "How JustAsk protects your data and privacy." },
      { property: "og:title", content: "Privacy & security — JustAsk" },
      { property: "og:description", content: "Encryption, control and full user isolation." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacySettings,
});

const items: { icon: typeof Lock; title: StringKey; sub: StringKey }[] = [
  { icon: Lock, title: "privacyEnc", sub: "privacyEncSub" },
  { icon: UserCheck, title: "privacyControl", sub: "privacyControlSub" },
  { icon: ShieldCheck, title: "privacyRls", sub: "privacyRlsSub" },
  { icon: Trash2, title: "privacyDelete", sub: "privacyDeleteSub" },
];

function PrivacySettings() {
  useRequireAuth();
  const t = useT();
  return (
    <AppShell>
      <TopBar title={t("privacyTitle")} subtitle={t("privacySub")} />
      <Page>
        <Stagger className="space-y-4 pb-10 pt-4">
          <Rise>
            <div className="liquid-glass rounded-3xl p-5 text-sm leading-relaxed text-muted-foreground">
              {t("privacyIntro")}
            </div>
          </Rise>
          <Rise>
            <div className="liquid-glass overflow-hidden rounded-3xl">
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <div
                    key={it.title}
                    className={`flex items-start gap-3 p-4 ${i !== items.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 text-start">
                      <p className="text-sm font-bold text-foreground">{t(it.title)}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t(it.sub)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Rise>
          <Rise>
            <p className="text-center text-xs text-muted-foreground">{t("privacyContact")}</p>
          </Rise>
        </Stagger>
      </Page>
    </AppShell>
  );
}
