import type { CaseStatus } from "./types";

export const statusMeta: Record<
  CaseStatus,
  { label: string; tone: "gold" | "navy" | "success" | "muted" }
> = {
  validating: { label: "בבדיקה", tone: "muted" },
  matching: { label: "מחפשים עורכי דין", tone: "gold" },
  has_interest: { label: "יש התעניינות", tone: "navy" },
  connected: { label: "נוצר חיבור", tone: "success" },
};

export const toneClasses: Record<string, string> = {
  gold: "bg-gold/15 text-gold",
  navy: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  muted: "bg-muted text-muted-foreground",
};

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / (1000 * 60 * 60));
  if (h < 1) return "הרגע";
  if (h < 24) return `לפני ${h} שעות`;
  const d = Math.floor(h / 24);
  return d === 1 ? "אתמול" : `לפני ${d} ימים`;
}
