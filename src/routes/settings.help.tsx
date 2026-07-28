import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Send } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger, Pressable } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { submitSupportTicket } from "../lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/help")({
  head: () => ({
    meta: [
      { title: "Help & support — JustAsk" },
      { name: "description", content: "FAQs and direct support for JustAsk users." },
      { property: "og:title", content: "Help & support — JustAsk" },
      { property: "og:description", content: "Get answers and talk to the JustAsk team." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HelpSettings,
});

const faqs: { q: StringKey; a: StringKey }[] = [
  { q: "faq1Q", a: "faq1A" },
  { q: "faq2Q", a: "faq2A" },
  { q: "faq3Q", a: "faq3A" },
  { q: "faq4Q", a: "faq4A" },
];

function FaqItem({ q, a, last }: { q: StringKey; a: StringKey; last: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className={last ? "" : "border-b border-border"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-start"
        aria-expanded={open}
      >
        <span className="flex-1 text-sm font-bold text-foreground">{t(q)}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground">
          <ChevronDown className="size-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{t(a)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpSettings() {
  useRequireAuth();
  const t = useT();
  const { user } = useAppStore();
  const [msg, setMsg] = useState("");

  return (
    <AppShell>
      <TopBar title={t("helpTitle")} subtitle={t("helpSub")} />
      <Page>
        <Stagger className="space-y-4 pb-10 pt-4">
          <Rise>
            <p className="px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("helpFaqHeader")}
            </p>
            <div className="liquid-glass mt-2 overflow-hidden rounded-3xl">
              {faqs.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} last={i === faqs.length - 1} />
              ))}
            </div>
          </Rise>

          <Rise>
            <div className="liquid-glass rounded-3xl p-5">
              <h3 className="text-sm font-bold text-foreground">{t("helpContactHeader")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("helpContactSub")}</p>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={t("helpMessagePh")}
                rows={5}
                className="mt-4 w-full resize-none rounded-2xl border border-border bg-background/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
              <Pressable
                onClick={() => {
                  const text = msg.trim();
                  if (!text) return;
                  void submitSupportTicket({
                    userId: user?.uid ?? "guest",
                    email: user?.email ?? "",
                    message: text,
                  })
                    .then(() => {
                      setMsg("");
                      toast.success(t("helpSent"));
                    })
                    .catch(() => toast.error(t("authErrGeneric")));
                }}
                className="btn-gold mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
              >
                <Send className="size-4" />
                {t("helpSend")}
              </Pressable>
              <p className="mt-3 text-center text-xs text-muted-foreground">{t("helpEmailDirect")}</p>
            </div>
          </Rise>
        </Stagger>
      </Page>
    </AppShell>
  );
}
