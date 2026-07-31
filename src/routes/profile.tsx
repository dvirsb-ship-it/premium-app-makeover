import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Accessibility,
  Bell,
  ChevronLeft,
  FileText,
  HelpCircle,
  LogOut,
  Moon,
  Repeat,
  Shield,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BottomNav } from "../components/BottomNav";
import { Page, Stagger, Rise } from "../components/motion";
import { useAppStore } from "../lib/store";
import { useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { isAdminUser } from "../lib/admin";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — JustAsk" },
      { name: "description", content: "Manage your account, language, and appearance preferences on JustAsk." },
      { property: "og:title", content: "Profile — JustAsk" },
      { property: "og:description", content: "Manage your account and preferences." },
      { property: "og:type", content: "profile" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Profile,
});

const items: { icon: typeof Bell; key: StringKey; to: string }[] = [
  { icon: Bell, key: "notifications", to: "/settings/notifications" },
  { icon: Shield, key: "privacy", to: "/settings/privacy" },
  { icon: FileText, key: "terms", to: "/settings/terms" },
  { icon: Accessibility, key: "accessibility", to: "/settings/accessibility" },
  { icon: HelpCircle, key: "help", to: "/settings/help" },
];


function Profile() {

  useRequireAuth();  const navigate = useNavigate();
  const { role, setRole, signOut, user } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);
  const { theme, toggleTheme, lang, setLang, dir } = useSettings();
  const t = useT();
  const flip = dir === "ltr" ? "rotate-180" : "";

  return (
    <AppShell withNav>
      <Page>
        <h1 className="pb-6 pt-8 text-2xl font-black text-foreground">
          {t("profile")}
        </h1>

        <Stagger className="space-y-4">
          <Rise>
            <div className="liquid-glass flex items-center gap-4 rounded-3xl p-5">
              <span className="chip-gold grid size-14 place-items-center rounded-2xl text-lg font-black">
                {role === "lawyer" ? t("lawyerBadge") : t("meBadge")}
              </span>
              <div className="min-w-0 flex-1 text-start">
                <h2 className="text-lg font-bold text-foreground">
                  {role === "lawyer" ? t("lawyerAccount") : t("clientAccount")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {role === "lawyer"
                    ? t("lawyerAccountSub")
                    : t("clientAccountSub")}
                </p>
              </div>
            </div>
          </Rise>

          {/* ===== Settings card ===== */}
          <Rise>
            <div className="liquid-glass overflow-hidden rounded-3xl">
              <p className="px-5 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("settings")}
              </p>

              {/* Dark mode toggle */}
              <div className="flex items-center gap-3 border-b border-border p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold">
                  {theme === "dark" ? (
                    <Moon className="size-5" />
                  ) : (
                    <Sun className="size-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1 text-start">
                  <p className="text-sm font-bold text-foreground">
                    {t("darkMode")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("darkModeSub")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === "dark"}
                  onClick={toggleTheme}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    theme === "dark" ? "bg-gold" : "bg-muted"
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    className={`absolute top-1 size-5 rounded-full bg-white shadow-md ${
                      theme === "dark" ? "start-6" : "start-1"
                    }`}
                  />
                </button>
              </div>

              {/* Language segmented control */}
              <div className="flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold text-sm font-black">
                  {lang === "he" ? "עב" : "EN"}
                </span>
                <div className="min-w-0 flex-1 text-start">
                  <p className="text-sm font-bold text-foreground">
                    {t("language")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("languageSub")}
                  </p>
                </div>
                <div className="relative flex shrink-0 rounded-xl bg-white/10 p-1">
                  {(["he", "en"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className="relative z-10 w-11 rounded-lg py-1.5 text-xs font-bold"
                    >
                      {lang === l && (
                        <motion.span
                          layoutId="lang-pill"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 34,
                          }}
                          className="absolute inset-0 rounded-lg bg-white/20 shadow-sm"
                        />
                      )}
                      <span
                        className={`relative ${
                          lang === l
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {l === "he" ? "עברית" : "EN"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Rise>

          <Rise>
            <button
              type="button"
              onClick={() => {
                setRole(null);
                navigate({ to: "/" });
              }}
              className="liquid-glass flex w-full items-center gap-3 rounded-3xl p-4 text-start transition active:scale-[0.99]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold">
                <Repeat className="size-5" />
              </span>
              <span className="flex-1 text-sm font-bold text-foreground">
                {t("switchRole")}
              </span>
              <ChevronLeft className={`size-5 text-muted-foreground/50 ${flip}`} />
            </button>
          </Rise>

          {isAdminUser(user) && (
            <Rise>
              <button
                type="button"
                onClick={() => navigate({ to: "/admin/verifications" })}
                className="liquid-glass flex w-full items-center gap-3 rounded-3xl border border-gold/25 p-4 text-start transition active:scale-[0.99]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold">
                  <ShieldCheck className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{t("adminOfficeBtn")}</span>
                  <span className="block text-[11px] text-muted-foreground">{t("adminOfficeSub")}</span>
                </span>
                <ChevronLeft className={`size-5 text-muted-foreground/50 ${flip}`} />
              </button>
            </Rise>
          )}

          <Rise>
            <div className="liquid-glass overflow-hidden rounded-3xl">
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.key}
                    to={it.to}
                    className={`flex w-full items-center gap-3 p-4 text-start transition active:bg-white/5 ${
                      i !== items.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-foreground">
                      <Icon className="size-5" />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {t(it.key)}
                    </span>
                    <ChevronLeft
                      className={`size-5 text-muted-foreground/50 ${flip}`}
                    />
                  </Link>
                );
              })}
            </div>
          </Rise>

          <Rise>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                /*
                 * ניתוק אמיתי: קודם הכפתור רק איפס את התפקיד, וה-session של
                 * Firebase נשאר חי — ולכן גוגל חזרה לאותו חשבון ולא הציעה אחר.
                 */
                if (signingOut) return;
                setSigningOut(true);
                /*
                 * מנווטים לפני הניתוק *וממתינים שהניווט יתקבע*.
                 *
                 * בלי ה-await זו הייתה תחרות: signOut הפיל את המשתמש בזמן
                 * שהראוטר עוד היה על /profile, שער ההתחברות הגיב מיד והפנה
                 * ל-/auth — כלומר מסך הפתיחה נדלג לפעמים ולפעמים לא.
                 * replace כדי שכפתור "אחורה" לא יחזיר אותו לתוך האפליקציה.
                 */
                void (async () => {
                  await navigate({ to: "/welcome", replace: true });
                  await signOut().catch(() => toast.error(t("authErrGeneric")));
                })();
              }}
              className="liquid-glass flex w-full items-center justify-center gap-2 rounded-3xl p-4 text-sm font-bold text-destructive transition active:scale-[0.99] disabled:opacity-60"
            >
              <LogOut className="size-5" />
              {t("logout")}
            </button>
          </Rise>
        </Stagger>
      </Page>
      <BottomNav />
    </AppShell>
  );
}
