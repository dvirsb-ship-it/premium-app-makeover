import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FolderOpen, Plus, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { EmptyState } from "../components/EmptyState";
import { Page, Stagger, Rise, Pressable } from "../components/motion";
import { useAppStore } from "../lib/store";
import { toneClasses, useStatusMeta, useTimeAgo } from "../lib/status";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "My cases — JustAsk" },
      { name: "description", content: "Track your legal cases and lawyer offers in one place." },
      { property: "og:title", content: "My cases — JustAsk" },
      { property: "og:description", content: "Track your legal cases and lawyer offers in one place." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Cases,
});

function Cases() {

  useRequireAuth();  const navigate = useNavigate();
  const { cases } = useAppStore();
  const { dir } = useSettings();
  const t = useT();
  const statusMeta = useStatusMeta();
  const timeAgo = useTimeAgo();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <AppShell withNav>
      <Page>
        <div className="flex items-center justify-between pb-6 pt-8">
          <div>
            <h1 className="text-2xl font-black text-foreground">{t("myCasesTitle")}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("myCasesSub")}</p>
          </div>
          <Link
            to="/onboarding"
            className="chip-gold grid size-11 place-items-center rounded-2xl transition active:scale-95"
            aria-label={t("newCaseAria")}
          >
            <Plus className="size-5" />
          </Link>
        </div>

        {cases.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={t("noCases")}
            action={
              <Link
                to="/onboarding"
                className="btn-gold inline-flex rounded-2xl px-6 py-3 text-sm font-bold"
              >
                {t("shareNewCase")}
              </Link>
            }
          />
        ) : (
          <Stagger className="space-y-4">
            {cases.map((c) => {
              const meta = statusMeta(c.status);
              return (
                <Rise key={c.id}>
                  <Pressable
                    onClick={() =>
                      navigate({ to: "/case/$caseId", params: { caseId: c.id } })
                    }
                    className="liquid-glass w-full rounded-3xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[meta.tone]}`}
                      >
                        {meta.label}
                      </span>
                      <Chevron className="size-5 shrink-0 text-muted-foreground/50" />
                    </div>
                    <h3 className="mt-3 text-base font-bold leading-snug text-foreground">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.category} · {timeAgo(c.createdAt)}
                    </p>
                    {c.interested.length > 0 && c.status !== "connected" && (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-gold/8 px-3 py-2">
                        <Users className="size-4 text-gold" />
                        <span className="text-xs font-semibold text-foreground">
                          {c.interested.length} {t("lawyersInterestedCount")}
                        </span>
                      </div>
                    )}
                    {c.status === "connected" && (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-success/10 px-3 py-2">
                        <Users className="size-4 text-success" />
                        <span className="text-xs font-semibold text-success">
                          {t("connectedWithLawyer")}
                        </span>
                      </div>
                    )}
                  </Pressable>
                </Rise>
              );
            })}
          </Stagger>
        )}
      </Page>
      <BottomNav />
    </AppShell>
  );
}
