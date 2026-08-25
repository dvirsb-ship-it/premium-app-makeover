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
  UserRound,
  Scale,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Page, Stagger, Rise } from "../components/motion";
import { useAppStore } from "../lib/store";
import { LANGS, LANG_NAMES, useSettings } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { isAdminUser } from "../lib/admin";
import { BUILD_STAMP } from "../lib/build-stamp";

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
  const [switchArmed, setSwitchArmed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { theme, toggleTheme, lang, setLang, dir } = useSettings();
  const t = useT();
  const flip = dir === "ltr" ? "rotate-180" : "";

  return (
    <AppShell>
      <Page>
        {/* אותו לוח כותרת כמו בבית — ראה את ההנמקה ב-`.masthead` */}
        <header className="masthead -mx-5 px-5 pb-4 pt-8">
          <h1 className="text-2xl font-extrabold text-foreground">{t("profile")}</h1>
        </header>

        <Stagger className="workspace -mx-5 min-h-screen space-y-4 px-5 pb-4 pt-6">
          <Rise>
            <div className="liquid-glass flex items-center gap-4 rounded-3xl p-5">
              {/* תג התפקיד — "מי אני", כלומר סיווג. דיו, לא זהב. */}
              <span className="chip-navy grid size-14 place-items-center rounded-2xl text-lg font-black">
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
                {/* איזה חשבון מחובר — בלי זה אי אפשר לדעת ממי מתנתקים (23/8/2026) */}
                {(user?.email || user?.phoneNumber) && (
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground/80" dir="ltr">
                    {user?.email || user?.phoneNumber}
                  </p>
                )}
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
                  aria-label={t("darkMode")}
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

              {/* בורר שפה — שש שפות, כל אחת בשמה שלה */}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold-ink text-sm font-black">
                    {lang === "he" ? "עב" : lang.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="text-sm font-bold text-foreground">
                      {t("language")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("languageSub")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      aria-pressed={lang === l}
                      className={`min-h-11 rounded-xl px-2 py-2 text-[12.5px] font-bold transition ${
                        lang === l
                          ? "chip-gold"
                          : "bg-white/10 text-muted-foreground"
                      }`}
                    >
                      {LANG_NAMES[l]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Rise>

          <Rise>
            {/*
              * דו-שלבי (23/8/2026): לחיצת סקרנות זרקה את המשתמש למסך
              * בחירת תפקיד בלי אזהרה — הפעולה ה"הרסנית" היחידה שהייתה
              * בלחיצה אחת. אותו דפוס כמו משיכת פנייה וסגירת תיק.
              */}
            <button
              type="button"
              onClick={() => {
                if (!switchArmed) {
                  setSwitchArmed(true);
                  window.setTimeout(() => setSwitchArmed(false), 5000);
                  return;
                }
                setRole(null);
                navigate({ to: "/" });
              }}
              className="liquid-glass flex w-full items-center gap-3 rounded-3xl p-4 text-start transition active:scale-[0.99]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold">
                <Repeat className="size-5" />
              </span>
              <span className="flex-1 text-sm font-bold text-foreground">
                {switchArmed ? t("switchRoleConfirm") : t("switchRole")}
              </span>
              <ChevronLeft className={`size-5 text-muted-foreground/50 ${flip}`} />
            </button>
          </Rise>

          {/* תחומי התמחות — הדרך היחידה לעדכן בלי לאבד אימות (23/8/2026:
              המסך היה קיים ובלתי נגיש משום מקום) */}
          {role === "lawyer" && (
            <Rise>
              <button
                type="button"
                onClick={() => navigate({ to: "/settings/specialties" })}
                className="liquid-glass flex w-full items-center gap-3 rounded-3xl p-4 text-start transition active:scale-[0.99]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold-ink">
                  <Scale className="size-5" />
                </span>
                <span className="flex-1 text-sm font-bold text-foreground">
                  {t("specialtiesTitle")}
                </span>
                <ChevronLeft className={`size-5 text-muted-foreground/50 ${flip}`} />
              </button>
            </Rise>
          )}

          {/*
            * הצגה עצמית — לעורכי דין בלבד, וגבוה ברשימה בכוונה.
            * זה המסך היחיד כאן שמשפיע ישירות על אם ייבחר.
            */}
          {role === "lawyer" && (
            <Rise>
              <button
                type="button"
                onClick={() => navigate({ to: "/settings/presentation" })}
                className="liquid-glass flex w-full items-center gap-3 rounded-3xl p-4 text-start transition active:scale-[0.99]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-gold/12 text-gold-ink">
                  <UserRound className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">
                    {t("presentationTitle")}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("presentationSub")}
                  </span>
                </span>
                <ChevronLeft className={`size-5 text-muted-foreground/50 ${flip}`} />
              </button>
            </Rise>
          )}

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

          {/* מה שכתוב כאן הוא מה שהמכשיר באמת מריץ — לא מה שיש בשרת */}
          <p className="pb-2 pt-1 text-center text-[10.5px] text-muted-foreground/60" dir="ltr">
            JustAsk · {BUILD_STAMP}
          </p>
        </Stagger>
      </Page>
    </AppShell>
  );
}
