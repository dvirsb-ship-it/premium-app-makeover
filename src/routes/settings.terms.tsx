import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/settings/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — JustAsk" },
      { name: "description", content: "The terms that apply to using JustAsk." },
      { property: "og:title", content: "Terms of use — JustAsk" },
      { property: "og:description", content: "Rules and responsibilities for using the platform." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TermsSettings,
});

const sections: { title: StringKey; body: StringKey }[] = [
  { title: "termsSection1Title", body: "termsSection1Body" },
  { title: "termsSection2Title", body: "termsSection2Body" },
  { title: "termsSection3Title", body: "termsSection3Body" },
  { title: "termsSection4Title", body: "termsSection4Body" },
  { title: "termsSection5Title", body: "termsSection5Body" },
];

function TermsSettings() {
  useRequireAuth();
  const t = useT();
  return (
    <AppShell>
      <TopBar title={t("termsTitle")} subtitle={t("termsSub")} />
      <Page>
        <Stagger className="space-y-3 pb-10 pt-4">
          {sections.map((s) => (
            <Rise key={s.title}>
              <div className="liquid-glass rounded-2xl p-4">
                <h3 className="text-sm font-bold text-foreground">{t(s.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(s.body)}</p>
              </div>
            </Rise>
          ))}
          <Rise>
            <p className="pt-2 text-center text-xs text-muted-foreground">{t("termsLastUpdated")}</p>
          </Rise>
        </Stagger>
      </Page>
    </AppShell>
  );
}
