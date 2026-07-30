import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Scale, Sparkles, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";

import { BrandMark } from "../components/BrandMark";
import { BottomNav } from "../components/BottomNav";
import { HeroVideo } from "../components/HeroVideo";
import { Page, Pressable, Rise, Stagger } from "../components/motion";
import { NotificationBell } from "../components/NotificationBell";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { useAppStore } from "../lib/store";
import { toneClasses, useStatusMeta } from "../lib/status";
import type { Role } from "../lib/types";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JustAsk — Your direct path to justice" },
      {
        name: "description",
        content:
          "Premium legal concierge. Share your case in minutes and get matched with expert lawyers — private, secure, personal.",
      },
      { property: "og:title", content: "JustAsk — Your direct path to justice" },
      {
        property: "og:description",
        content: "Get matched with expert lawyers in minutes. Private and secure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { role, setRole, user } = useAppStore();
  const t = useT();
  const [gateChecked, setGateChecked] = useState(false);

  // First-run welcome tour gate — runs once per browser.
  useEffect(() => {
    try {
      if (!localStorage.getItem("justask-welcomed")) {
        navigate({ to: "/welcome", replace: true });
        return;
      }
    } catch {
      /* ignore */
    }
    setGateChecked(true);
  }, [navigate]);

  function choose(nextRole: Role) {
    setRole(nextRole);
    if (nextRole === "lawyer") {
      navigate({ to: "/lawyer-onboarding" });
      return;
    }
    // Client already authenticated — go to intake tips; otherwise auth first.
    navigate({ to: role ? "/intake-tips" : "/auth" });
  }

  // עורך דין שלוחץ "ראשי" קיבל עד כה את מסך הבחירה — יש לו בית משלו
  useEffect(() => {
    if (gateChecked && role === "lawyer") navigate({ to: "/lawyer", replace: true });
  }, [gateChecked, role, navigate]);

  if (!gateChecked) return null;

  // המערכת כבר יודעת מי אתה — אין סיבה לשאול שוב בכל כניסה
  if (role === "client" && user) return <ClientHome />;

  return (
    <AppShell bare outerClassName="studio-stage !overflow-y-auto">
      {/* Cinematic studio backdrop — two clips cross-fading behind the phone */}
      <HeroVideo className="z-0" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen flex-col px-6 pb-8 pt-10">
        {/* Centered brand lockup in the studio spotlight */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <BrandMark size={84} />

            <h1 className="mt-5 text-[2.75rem] font-black leading-none tracking-tight text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]">
              Just<span className="text-gradient-gold">Ask</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mt-3 max-w-[17rem] text-base font-light leading-snug text-white/85 drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]"
            >
              {t("heroTagline")}
            </motion.p>
          </motion.div>
        </div>


        {/* Role selection cards — liquid glass */}
        <Stagger className="w-full max-w-sm space-y-4 self-center pb-4">
          <Rise>
            <Pressable
              onClick={() => choose("client")}
              className="liquid-glass glass-hero group block w-full rounded-[22px] p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <div className="relative flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-foreground/5 text-foreground">
                  <UserRound className="size-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-tight text-foreground">
                    {t("clientCTA")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("clientCTASub")}
                  </p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <Pressable
              onClick={() => choose("lawyer")}
              className="liquid-glass-selected glass-hero group block w-full rounded-[22px] p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <div className="relative flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-lg shadow-gold/25">
                  <Scale className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-tight text-foreground">
                    {t("lawyerCTA")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("lawyerCTASub")}
                  </p>
                </div>
              </div>
            </Pressable>
          </Rise>

          <Rise>
            <p className="pt-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("trustBadge")}
            </p>
          </Rise>
        </Stagger>
      </div>

      {role !== null && <BottomNav />}
    </AppShell>
  );
}

/**
 * הבית של הלקוח.
 *
 * התפקיד הרגשי כאן הוא לא תפריט — אלא תחושה שמישהו מחזיק את התיק בשבילך.
 * לכן התיק הפעיל הוא האלמנט הגדול והיחיד שמושך תשומת לב, והשאר מסודר
 * בקוביות זכוכית שקטות.
 */
function ClientHome() {
  const navigate = useNavigate();
  const t = useT();
  const { cases, user, notifications } = useAppStore();
  const { dir } = useSettings();
  const statusMeta = useStatusMeta();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const firstName = (user?.displayName ?? "").trim().split(" ")[0];
  const [active, ...rest] = cases;
  const activeMeta = active ? statusMeta(active.status) : null;
  const interested = active?.interested.length ?? 0;
  const unread = notifications.filter((n) => !n.read).length;

  const tiles: { key: string; label: string; value: string; to: string }[] = [
    { key: "cases", label: t("navCases"), value: String(cases.length), to: "/cases" },
    { key: "notif", label: t("notifications"), value: String(unread), to: "/notifications" },
    { key: "profile", label: t("profile"), value: "", to: "/profile" },
    { key: "help", label: t("help"), value: "", to: "/settings/help" },
  ];

  return (
    <AppShell withNav>
      <Page>
        <header className="flex items-start justify-between gap-3 pb-7 pt-9">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">{t("homeHello")}</p>
            <h1 className="mt-0.5 truncate text-[2.25rem] font-black leading-[1.1] tracking-tight text-foreground">
              {firstName || t("meBadge")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("homeSub")}</p>
          </div>
          <NotificationBell />
        </header>

        <Stagger className="space-y-3.5 pb-10">
          {active ? (
            <Rise>
              <Pressable
                onClick={() => navigate({ to: "/case/$caseId", params: { caseId: active.id } })}
                className="liquid-glass w-full rounded-[28px] p-5 text-start shadow-luxe"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[activeMeta!.tone]}`}
                  >
                    {activeMeta!.label}
                  </span>
                  <Arrow className="size-5 shrink-0 text-muted-foreground/50" />
                </div>

                <h2 className="mt-3 text-lg font-bold leading-snug text-foreground">
                  {active.title || t("homeCaseUntitled")}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {active.summary}
                </p>

                {/* רגע הערך: מישהו רוצה את התיק שלך */}
                {interested > 0 && active.status !== "connected" && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-gold/10 px-3.5 py-2.5">
                    <Sparkles className="size-4 shrink-0 text-gold" />
                    <span className="text-[13px] font-bold text-foreground">
                      {interested} {t("lawyersInterestedCount")}
                    </span>
                  </div>
                )}
              </Pressable>
            </Rise>
          ) : (
            <Rise>
              <div className="liquid-glass rounded-[28px] p-6 text-center shadow-luxe">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gold/15 text-gold">
                  <Scale className="size-6" strokeWidth={2} />
                </span>
                <h2 className="mt-4 text-base font-bold text-foreground">{t("homeEmptyTitle")}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t("homeEmptySub")}
                </p>
              </div>
            </Rise>
          )}

          <Rise>
            <Pressable
              onClick={() => navigate({ to: "/intake-tips" })}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-[28px] py-4 text-base font-bold"
            >
              <Plus className="size-5" />
              {active ? t("homeNewCase") : t("homeFirstCase")}
            </Pressable>
          </Rise>

          {/* קוביות הזכוכית — הכול מסודר ובהישג יד */}
          <Rise>
            <div className="grid grid-cols-2 gap-3.5">
              {tiles.map((tile) => (
                <Pressable
                  key={tile.key}
                  onClick={() => navigate({ to: tile.to })}
                  className="liquid-glass flex aspect-square flex-col justify-between rounded-[28px] p-4 text-start"
                >
                  <span className="text-2xl font-black leading-none text-gold" dir="ltr">
                    {tile.value}
                  </span>
                  <span className="text-[13px] font-bold text-foreground">{tile.label}</span>
                </Pressable>
              ))}
            </div>
          </Rise>

          {rest.length > 0 && (
            <Rise>
              <div className="liquid-glass overflow-hidden rounded-[28px]">
                <p className="px-5 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("homeOtherCases")}
                </p>
                {rest.slice(0, 3).map((c, i) => {
                  const m = statusMeta(c.status);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate({ to: "/case/$caseId", params: { caseId: c.id } })}
                      className={`flex w-full items-center gap-3 p-4 text-start ${i !== Math.min(rest.length, 3) - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {c.title || t("homeCaseUntitled")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{m.label}</p>
                      </div>
                      <Arrow className="size-4 shrink-0 text-muted-foreground/40" />
                    </button>
                  );
                })}
              </div>
            </Rise>
          )}
        </Stagger>
      </Page>
    </AppShell>
  );
}
