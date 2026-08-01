import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Apple, Mail, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ConfirmationResult } from "firebase/auth";
import { AppShell } from "../components/AppShell";
import { BrandMark } from "../components/BrandMark";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { Spinner } from "../components/Spinner";
import { useT } from "../lib/i18n";
import { useAppStore } from "../lib/store";
import { cn } from "../lib/utils";
import {
  completeEmailLinkIfPresent,
  sendEmailLink,
  signInApple,
  signInGoogle,
  startPhoneSignIn,
} from "../lib/auth-service";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — JustAsk" },
      { name: "description", content: "Sign in or create your JustAsk account with Google." },
      { property: "og:title", content: "Sign in — JustAsk" },
      { property: "og:description", content: "Sign in to JustAsk with Google." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

type Method = "email" | "phone" | null;
type LoadingProvider = "google" | "apple" | "email" | "phone" | "code" | null;

// החלטת מוצר (07/2026): התחברות דרך גוגל בלבד בהשקה. אפל/אימייל/טלפון מוכנים —
// כדי להחזיר אותם משנים ל-false.
const GOOGLE_ONLY = true;

function Auth() {
  const navigate = useNavigate();
  const t = useT();
  const {
    role,
    setRole,
    user,
    authReady,
    authRedirectFailed,
    clearAuthRedirectError,
    authResolving,
  } = useAppStore();
  const [method, setMethod] = useState<Method>(null);
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<LoadingProvider>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const phoneStep = confirmationRef.current !== null;

  const busy = loading !== null;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneRe = /^[+\d][\d\s\-().]{6,}$/;

  // מי שכבר מחובר לא צריך לראות מסך התחברות — ישר פנימה
  const startedSignIn = useRef(false);
  useEffect(() => {
    if (authReady && user && !startedSignIn.current) {
      navigate({ to: role === "lawyer" ? "/lawyer" : "/cases", replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user]);

  // אם הגענו מקישור התחברות באימייל — משלימים אוטומטית
  useEffect(() => {
    if (window.location.href.includes("oobCode=")) startedSignIn.current = true;
    void (async () => {
      try {
        if (await completeEmailLinkIfPresent()) {
          onSignedIn();
        }
      } catch {
        setError(t("authErrGeneric"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSignedIn() {
    // התפקיד נבחר במסך הראשי; ברירת מחדל — לקוח
    const finalRole = role ?? "client";
    setRole(finalRole);
    toast.success(t("authToastWelcome"));
    navigate({ to: finalRole === "lawyer" ? "/lawyer-onboarding" : "/onboarding" });
  }

  function friendlyError(e: unknown): string {
    const codeStr = (e as { code?: string })?.code ?? "";
    if (codeStr.includes("popup-closed") || codeStr.includes("cancelled")) return "";
    if (codeStr.includes("invalid-verification-code")) return t("authErrCode");
    if (codeStr.includes("invalid-phone-number")) return t("authErrPhone");
    if (codeStr.includes("invalid-email")) return t("authErrEmail");
    return t("authErrGeneric");
  }

  async function proceed(provider: LoadingProvider) {
    if (busy || !provider) return;
    startedSignIn.current = true;
    setError(null);

    try {
      if (provider === "google") {
        setLoading(provider);
        // בהפניה הדפדפן עוזב את העמוד ומחזיר null — אין למה להמשיך כאן
        const cred = await signInGoogle();
        if (cred) onSignedIn();
        return;
      }

      if (provider === "apple") {
        setLoading(provider);
        try {
          await signInApple();
          onSignedIn();
        } catch {
          toast.info(t("authAppleSoon"));
        }
        return;
      }

      if (provider === "email") {
        const trimmed = value.trim();
        if (!emailRe.test(trimmed)) {
          setError(t("authErrEmail"));
          toast.error(t("authErrEmail"));
          return;
        }
        setLoading(provider);
        await sendEmailLink(trimmed);
        toast.success(t("authToastSent"), { description: t("authToastSentSub") });
        return;
      }

      if (provider === "phone") {
        const trimmed = value.trim();
        if (!phoneRe.test(trimmed)) {
          setError(t("authErrPhone"));
          toast.error(t("authErrPhone"));
          return;
        }
        setLoading(provider);
        confirmationRef.current = await startPhoneSignIn(trimmed, "auth-recaptcha-anchor");
        toast.success(t("authCodeSent"), { description: t("authCodeSentSub") });
        return;
      }

      if (provider === "code") {
        const confirmation = confirmationRef.current;
        if (!confirmation || code.trim().length < 6) return;
        setLoading(provider);
        await confirmation.confirm(code.trim());
        onSignedIn();
        return;
      }
    } catch (e) {
      const msg = friendlyError(e);
      if (msg) {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(null);
    }
  }

  const providerBtnBase =
    "liquid-glass glass-hero flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-bold text-foreground transition active:scale-[0.98] min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <AppShell bare outerClassName="studio-stage">
      <Page className="relative z-10 flex min-h-screen flex-col">
        <TopBar title={t("authTitle")} subtitle={t("authSub")} />

        <main className="flex flex-1 flex-col justify-center px-6 py-8">
          <Stagger className="w-full space-y-4">
            <Rise className="mb-2 flex flex-col items-center text-center">
              <BrandMark size={72} />
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">
                Just<span className="text-gradient-gold">Ask</span>
              </h1>
              <p className="mt-2 max-w-[16rem] text-sm text-muted-foreground">
                {t("authSub")}
              </p>
            </Rise>

            {/*
              חזרנו מגוגל והחיבור עוד נקלט. בלי המצב הזה המשתמש רואה שוב את
              כפתור ההתחברות, מסיק שזה נכשל — ולוחץ שוב באמצע הקליטה.
              זה מה שדווח כ"לא חלק" בכניסה הראשונה האמיתית.
            */}
            {authResolving && (
              <Rise>
                <div
                  role="status"
                  aria-live="polite"
                  className="liquid-glass glass-hero flex items-center justify-center gap-3 rounded-2xl py-4"
                >
                  <Spinner className="text-gold" />
                  <span className="text-sm font-bold text-foreground">
                    {t("authCompleting")}
                  </span>
                </div>
              </Rise>
            )}

            {/*
              חזרנו מגוגל בלי חשבון מחובר. בלי ההודעה הזו המסך נראה בדיוק
              כמו פתיחה רגילה, המשתמש לוחץ שוב — ונכנס ללולאה בלי לדעת למה.
            */}
            {!authResolving && authRedirectFailed && (
              <Rise>
                <div
                  role="alert"
                  className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-start"
                >
                  <p className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    {t("authRedirectFailed")}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-foreground/75">
                    {t("authRedirectFailedHint")}
                  </p>
                </div>
              </Rise>
            )}

            {/* Social auth — מוסתר בזמן קליטת החזרה, כדי שלא ילחצו באמצע */}
            {!authResolving && <Rise>
              <button
                type="button"
                onClick={() => {
                  clearAuthRedirectError();
                  void proceed("google");
                }}
                disabled={busy}
                aria-busy={loading === "google"}
                aria-label={t("continueGoogle")}
                className={cn(providerBtnBase)}
              >
                {loading === "google" ? (
                  <>
                    <Spinner className="text-foreground" />
                    <span>{t("signingIn")}</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>{t("continueGoogle")}</span>
                  </>
                )}
              </button>
            </Rise>}

            {!GOOGLE_ONLY && <Rise>
              <button
                type="button"
                onClick={() => proceed("apple")}
                disabled={busy}
                aria-busy={loading === "apple"}
                aria-label={t("continueApple")}
                className={cn(providerBtnBase)}
              >
                {loading === "apple" ? (
                  <>
                    <Spinner className="text-foreground" />
                    <span>{t("signingIn")}</span>
                  </>
                ) : (
                  <>
                    <Apple className="size-5 fill-current" strokeWidth={0} aria-hidden />
                    <span>{t("continueApple")}</span>
                  </>
                )}
              </button>
            </Rise>}

            {!GOOGLE_ONLY && <>
            {/* divider */}
            <Rise>
              <div className="flex items-center gap-3 py-1" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">
                  {t("authOr")}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </Rise>

            {/* Email + phone */}
            <Rise>
              <button
                type="button"
                onClick={() => setMethod(method === "email" ? null : "email")}
                disabled={busy || phoneStep}
                aria-expanded={method === "email"}
                aria-controls="auth-method-panel"
                className={cn(providerBtnBase)}
              >
                <Mail className="size-5 text-gold" aria-hidden />
                <span>{t("continueEmail")}</span>
              </button>
            </Rise>

            <Rise>
              <button
                type="button"
                onClick={() => setMethod(method === "phone" ? null : "phone")}
                disabled={busy || phoneStep}
                aria-expanded={method === "phone"}
                aria-controls="auth-method-panel"
                className={cn(providerBtnBase)}
              >
                <Phone className="size-5 text-gold" aria-hidden />
                <span>{t("continuePhone")}</span>
              </button>
            </Rise>
            </>}

            <AnimatePresence initial={false} mode="wait">
              {method && (
                <motion.div
                  key={phoneStep ? "phone-code" : method}
                  id="auth-method-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-1">
                    <label
                      htmlFor="auth-method-input"
                      className="block text-start text-xs font-semibold text-foreground/80"
                    >
                      {phoneStep
                        ? t("authCodeLabel")
                        : method === "email"
                          ? t("emailLabel")
                          : t("phoneLabel")}
                    </label>
                    <input
                      id="auth-method-input"
                      type={phoneStep ? "text" : method === "email" ? "email" : "tel"}
                      inputMode={
                        phoneStep ? "numeric" : method === "email" ? "email" : "tel"
                      }
                      autoComplete={
                        phoneStep
                          ? "one-time-code"
                          : method === "email"
                            ? "email"
                            : "tel"
                      }
                      dir="ltr"
                      maxLength={phoneStep ? 6 : undefined}
                      value={phoneStep ? code : value}
                      onChange={(e) => {
                        if (phoneStep) setCode(e.target.value.replace(/\D/g, ""));
                        else setValue(e.target.value);
                        if (error) setError(null);
                      }}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "auth-method-error" : undefined}
                      placeholder={
                        phoneStep
                          ? t("authCodePlaceholder")
                          : method === "email"
                            ? t("emailPlaceholder")
                            : t("phonePlaceholder")
                      }
                      className={cn(
                        "liquid-glass glass-hero w-full rounded-2xl px-4 py-3.5 text-center text-sm text-foreground outline-none placeholder:text-foreground/50 focus-visible:ring-2 focus-visible:ring-gold/70",
                        error && "ring-2 ring-destructive/70"
                      )}
                    />
                    <AnimatePresence initial={false}>
                      {error && (
                        <motion.p
                          id="auth-method-error"
                          role="alert"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="flex items-center gap-1.5 text-start text-xs font-medium text-destructive"
                        >
                          <AlertCircle className="size-3.5" aria-hidden />
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <button
                      type="button"
                      onClick={() => proceed(phoneStep ? "code" : method)}
                      disabled={
                        busy ||
                        (phoneStep ? code.trim().length < 6 : value.trim().length === 0)
                      }
                      aria-busy={loading === method || loading === "code"}
                      className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading === method || loading === "code" ? (
                        <>
                          <Spinner className="text-navy" />
                          <span>{t("sending")}</span>
                        </>
                      ) : (
                        <span>{phoneStep ? t("authVerifyBtn") : t("authContinueBtn")}</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Rise>
              <p className="px-2 pt-2 text-center text-[11px] leading-relaxed text-foreground/70">
                {t("authTerms")}
              </p>
            </Rise>
          </Stagger>
        </main>

        {/* עוגן ל-reCAPTCHA השקוף של אימות הטלפון */}
        <div id="auth-recaptcha-anchor" />
      </Page>
    </AppShell>
  );
}
