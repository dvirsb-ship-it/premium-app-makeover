import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cpu, Lock, ShieldCheck, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { DELETION_GRACE_DAYS, requestAccountDeletion } from "../lib/db";

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

/*
 * הרשימה תיארה הצפנה, בידוד ומחיקה — אבל לא אמרה מילה על העובדה שתיאור
 * המקרה והתמונות נשלחים למנוע AI של גוגל לניתוח, ולא על היכן העיבוד
 * מתבצע. זו העברה של מידע אישי — ולעיתים רפואי — לצד שלישי, וזה בדיוק
 * מה שמשתמש זכאי לדעת לפני שהוא מקליד.
 *
 * הסעיף החדש ראשון ברשימה בכוונה: הוא המהותי מבין הארבעה.
 */
const items: { icon: typeof Lock; title: StringKey; sub: StringKey }[] = [
  { icon: Cpu, title: "privacyAi", sub: "privacyAiSub" },
  { icon: Lock, title: "privacyEnc", sub: "privacyEncSub" },
  { icon: UserCheck, title: "privacyControl", sub: "privacyControlSub" },
  { icon: ShieldCheck, title: "privacyRls", sub: "privacyRlsSub" },
  { icon: Trash2, title: "privacyDelete", sub: "privacyDeleteSub" },
];

function PrivacySettings() {
  useRequireAuth();
  const t = useT();
  const navigate = useNavigate();
  const { user, signOut } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  function submitDeletion() {
    if (!user || sending) return;
    setSending(true);
    void requestAccountDeletion({
      userId: user.uid,
      email: user.email ?? "",
      reason: reason.trim(),
    })
      .then(async () => {
        toast.success(
          t("deleteScheduledBody").replace("{n}", String(DELETION_GRACE_DAYS)),
        );
        await signOut();
        navigate({ to: "/" });
      })
      .catch(() => {
        setSending(false);
        toast.error(t("authErrGeneric"));
      });
  }

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
            <AnimatePresence mode="wait">
              {confirming ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="liquid-glass rounded-3xl border border-destructive/30 p-5"
                >
                  <p className="text-sm font-bold text-foreground">{t("deleteConfirmTitle")}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {t("deleteConfirmBody")}
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder={t("deleteReasonPh")}
                    className="mt-3 w-full resize-none rounded-2xl border border-border bg-background/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={submitDeletion}
                      disabled={sending}
                      className="flex-1 rounded-2xl bg-destructive/90 py-3 text-sm font-bold text-destructive-foreground transition active:scale-[0.98] disabled:opacity-60"
                    >
                      {t("deleteConfirmBtn")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="liquid-glass flex-1 rounded-2xl py-3 text-sm font-semibold text-foreground"
                    >
                      {t("cancelAction")}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="start"
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setConfirming(true)}
                  className="liquid-glass flex w-full items-center justify-center gap-2 rounded-3xl p-4 text-sm font-bold text-destructive transition active:scale-[0.99]"
                >
                  <Trash2 className="size-4" />
                  {t("deleteAccountBtn")}
                </motion.button>
              )}
            </AnimatePresence>
          </Rise>

          <Rise>
            <p className="text-center text-xs text-muted-foreground">{t("privacyContact")}</p>
          </Rise>
        </Stagger>
      </Page>
    </AppShell>
  );
}
