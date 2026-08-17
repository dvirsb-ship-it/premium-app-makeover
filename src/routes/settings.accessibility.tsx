import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/settings/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility statement — JustAsk" },
      { name: "description", content: "JustAsk accessibility statement per Israeli Standard 5568." },
      { property: "og:title", content: "Accessibility statement — JustAsk" },
      { property: "og:description", content: "How JustAsk is made accessible, and how to reach us." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AccessibilitySettings,
});

const sections: { title: StringKey; body: StringKey }[] = [
  { title: "a11ySection1Title", body: "a11ySection1Body" },
  { title: "a11ySection2Title", body: "a11ySection2Body" },
  { title: "a11ySection3Title", body: "a11ySection3Body" },
  { title: "a11ySection4Title", body: "a11ySection4Body" },
  { title: "a11ySection5Title", body: "a11ySection5Body" },
];

function AccessibilitySettings() {
  useRequireAuth();
  const t = useT();
  return (
    <AppShell>
      <TopBar title={t("a11yTitle")} subtitle={t("a11ySub")} />
      <Page>
        <Stagger className="space-y-3 pb-10 pt-4">
          {sections.map((s) => (
            <Rise key={s.title}>
              <div className="liquid-glass rounded-2xl p-4">
                <h3 className="text-sm font-bold text-foreground">{t(s.title)}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{t(s.body)}</p>
              </div>
            </Rise>
          ))}
          <Rise>
            <p className="pt-2 text-center text-xs text-muted-foreground">{t("a11yLastUpdated")}</p>
          </Rise>
        </Stagger>
      </Page>
    </AppShell>
  );
}
