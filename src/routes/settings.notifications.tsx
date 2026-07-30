import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, Sparkles, Smartphone } from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { Page, Rise, Stagger } from "../components/motion";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import { useRequireAuth } from "../lib/require-auth";
import { useAppStore } from "../lib/store";
import { fbDb } from "../lib/firebase";
import {
  disablePush,
  enablePush,
  pushEnabledLocally,
  pushSupport,
  type PushSupport,
} from "../lib/push";

export const Route = createFileRoute("/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — JustAsk" },
      { name: "description", content: "Manage which JustAsk updates you receive and how." },
      { property: "og:title", content: "Notifications — JustAsk" },
      { property: "og:description", content: "Choose the alerts that matter to you." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsSettings,
});

/** נושאים שנשמרים על מסמך המשתמש והשרת בודק אותם לפני שליחה. */
const topics: { key: "caseUpdates" | "lawyerInterest"; icon: typeof Bell; title: StringKey; sub: StringKey }[] = [
  { key: "caseUpdates", icon: Bell, title: "notifCaseUpdates", sub: "notifCaseUpdatesSub" },
  { key: "lawyerInterest", icon: Sparkles, title: "notifLawyerInterest", sub: "notifLawyerInterestSub" },
];

function Switch({ on, onToggle, busy }: { on: boolean; onToggle: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-gold" : "bg-muted"}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute top-1 size-5 rounded-full bg-white shadow-md ${on ? "start-6" : "start-1"}`}
      />
    </button>
  );
}

function NotificationsSettings() {
  useRequireAuth();
  const t = useT();
  const { user } = useAppStore();

  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    caseUpdates: true,
    lawyerInterest: true,
  });
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  // תמיכת ההתראות ידועה רק בדפדפן — בדיקה בזמן רינדור הייתה יוצרת אי-התאמת הידרציה
  const [support, setSupport] = useState<PushSupport | null>(null);

  useEffect(() => {
    setSupport(pushSupport());
    setPushOn(pushEnabledLocally());
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(fbDb(), "users", user.uid), (snap) => {
      const d = snap.data() ?? {};
      setPrefs({
        caseUpdates: d.caseUpdates !== false,
        lawyerInterest: d.lawyerInterest !== false,
      });
    });
  }, [user]);

  function toggleTopic(key: string) {
    if (!user) return;
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    void updateDoc(doc(fbDb(), "users", user.uid), { [key]: next }).catch(() => {
      setPrefs((p) => ({ ...p, [key]: !next }));
      toast.error(t("authErrGeneric"));
    });
  }

  async function togglePush() {
    if (!user || pushBusy) return;
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush(user.uid);
        setPushOn(false);
      } else {
        const ok = await enablePush(user.uid);
        setPushOn(ok);
        toast[ok ? "success" : "error"](t(ok ? "pushEnabled" : "pushDeniedMsg"));
      }
    } catch {
      toast.error(t("authErrGeneric"));
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <AppShell>
      <TopBar title={t("notifTitle")} subtitle={t("notifSub")} />
      <Page>
        <Stagger className="space-y-4 pb-10 pt-4">
          <Rise>
            <div className="liquid-glass overflow-hidden rounded-3xl">
              {topics.map((row, i) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.key}
                    className={`flex items-center gap-3 p-4 ${i === topics.length - 1 ? "" : "border-b border-border"}`}
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 text-start">
                      <p className="text-sm font-bold text-foreground">{t(row.title)}</p>
                      <p className="text-xs text-muted-foreground">{t(row.sub)}</p>
                    </div>
                    <Switch on={prefs[row.key]} onToggle={() => toggleTopic(row.key)} />
                  </div>
                );
              })}
            </div>
          </Rise>

          <Rise>
            <p className="px-2 pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("notifChannelsHeader")}
            </p>
            <div className="liquid-glass mt-2 overflow-hidden rounded-3xl">
              <div className="flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold">
                  <Smartphone className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-start">
                  <p className="text-sm font-bold text-foreground">{t("notifPush")}</p>
                  <p className="text-xs text-muted-foreground">
                    {support === "denied"
                      ? t("pushBlockedHint")
                      : support === "unsupported"
                        ? t("pushUnsupportedHint")
                        : t("notifPushSub")}
                  </p>
                  {/* support === null עד שהדפדפן נבדק — אותו טקסט בשרת ובלקוח */}
                </div>
                {support === "ready" && (
                  <Switch on={pushOn} onToggle={() => void togglePush()} busy={pushBusy} />
                )}
              </div>
            </div>
            <p className="px-2 pt-3 text-xs leading-relaxed text-muted-foreground">
              {t("pushIosHint")}
            </p>
          </Rise>
        </Stagger>
      </Page>
    </AppShell>
  );
}
