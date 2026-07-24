import type { CaseStatus } from "./types";
import type { Lang } from "./settings";
import { useSettings } from "./settings";

const LABELS: Record<CaseStatus, { he: string; en: string; tone: "gold" | "navy" | "success" | "muted" }> = {
  validating: { he: "בבדיקה", en: "Reviewing", tone: "muted" },
  matching: { he: "מחפשים עורכי דין", en: "Finding lawyers", tone: "gold" },
  has_interest: { he: "יש התעניינות", en: "Interest received", tone: "navy" },
  connected: { he: "נוצר חיבור", en: "Connected", tone: "success" },
};

export const statusMeta = new Proxy(
  {} as Record<CaseStatus, { label: string; tone: "gold" | "navy" | "success" | "muted" }>,
  {
    get(_t, key: string) {
      const l = LABELS[key as CaseStatus];
      if (!l) return undefined;
      const lang: Lang =
        (typeof document !== "undefined" &&
          (document.documentElement.getAttribute("lang") as Lang)) ||
        "he";
      return { label: l[lang] ?? l.he, tone: l.tone };
    },
  },
);

export function useStatusMeta() {
  const { lang } = useSettings();
  return (s: CaseStatus) => ({ label: LABELS[s][lang], tone: LABELS[s].tone });
}

export const toneClasses: Record<string, string> = {
  gold: "bg-gold/15 text-gold",
  navy: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  muted: "bg-muted text-muted-foreground",
};

export function timeAgo(ts: number, lang: Lang = "he"): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / (1000 * 60 * 60));
  if (lang === "en") {
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? "yesterday" : `${d}d ago`;
  }
  if (h < 1) return "הרגע";
  if (h < 24) return `לפני ${h} שעות`;
  const d = Math.floor(h / 24);
  return d === 1 ? "אתמול" : `לפני ${d} ימים`;
}

export function useTimeAgo() {
  const { lang } = useSettings();
  return (ts: number) => timeAgo(ts, lang);
}
