import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Apple, Mail, Phone } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BrandMark } from "../components/BrandMark";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import { useAppStore } from "../lib/store";

export const Route = createFileRoute("/auth")({
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

function Auth() {
  const navigate = useNavigate();
  const t = useT();
  const { setRole } = useAppStore();
  const [method, setMethod] = useState<Method>(null);
  const [value, setValue] = useState("");

  function proceed() {
    setRole("client");
    navigate({ to: "/onboarding" });
  }

  return (
    <AppShell bare outerClassName="studio-stage">
      {/* Darker cinematic wash over the studio backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-black/45" aria-hidden />

      <Page className="relative z-10 flex min-h-screen flex-col">
        <TopBar title={t("authTitle")} subtitle={t("authSub")} inverse />

        <div className="flex flex-1 flex-col justify-center px-6 py-8">
          <Stagger className="w-full space-y-4">
            <Rise className="mb-2 flex flex-col items-center text-center">
              <BrandMark size={72} />
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.55)]">
                Just<span className="text-gradient-gold">Ask</span>
              </h1>
              <p className="mt-2 max-w-[16rem] text-sm text-white/85 drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
                {t("authSub")}
              </p>
            </Rise>

            {/* Social auth */}
            <Rise>
              <button
                type="button"
                onClick={proceed}
                className="liquid-glass glass-hero flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                <GoogleIcon />
                {t("continueGoogle")}
              </button>
            </Rise>

            <Rise>
              <button
                type="button"
                onClick={proceed}
                className="liquid-glass glass-hero flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                <Apple className="size-5 fill-current" strokeWidth={0} />
                {t("continueApple")}
              </button>
            </Rise>

            {/* divider */}
            <Rise>
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-white/20" />
                <span className="text-xs font-medium text-white/70">
                  {t("authOr")}
                </span>
                <span className="h-px flex-1 bg-white/20" />
              </div>
            </Rise>

            {/* Email + phone */}
            <Rise>
              <button
                type="button"
                onClick={() => setMethod(method === "email" ? null : "email")}
                className="liquid-glass glass-hero flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                <Mail className="size-5 text-gold" />
                {t("continueEmail")}
              </button>
            </Rise>

            <Rise>
              <button
                type="button"
                onClick={() => setMethod(method === "phone" ? null : "phone")}
                className="liquid-glass glass-hero flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                <Phone className="size-5 text-gold" />
                {t("continuePhone")}
              </button>
            </Rise>

            <AnimatePresence initial={false} mode="wait">
              {method && (
                <motion.div
                  key={method}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-1">
                    <label className="block text-start text-xs font-semibold text-white/70">
                      {method === "email" ? t("emailLabel") : t("phoneLabel")}
                    </label>
                    <input
                      type={method === "email" ? "email" : "tel"}
                      inputMode={method === "email" ? "email" : "tel"}
                      dir="ltr"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={
                        method === "email"
                          ? t("emailPlaceholder")
                          : t("phonePlaceholder")
                      }
                      className="liquid-glass glass-hero w-full rounded-2xl px-4 py-3.5 text-center text-sm text-white outline-none placeholder:text-white/60 focus:ring-2 focus:ring-gold/50"
                    />
                    <button
                      type="button"
                      onClick={proceed}
                      className="btn-gold w-full rounded-2xl py-3.5 text-sm font-bold"
                    >
                      {t("authContinueBtn")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Rise>
              <p className="px-2 pt-2 text-center text-[11px] leading-relaxed text-white/60 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
                {t("authTerms")}
              </p>
            </Rise>
          </Stagger>
        </div>
      </Page>
    </AppShell>
  );
}
