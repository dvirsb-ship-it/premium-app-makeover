import type { CaseStatus } from "./types";
import type { Lang } from "./settings";
import { useSettings } from "./settings";

type StatusLabel = Record<Lang, string> & { tone: "gold" | "navy" | "success" | "muted" };

const LABELS: Record<CaseStatus, StatusLabel> = {
  validating: { he: "בבדיקה", en: "Reviewing", ru: "На проверке", ar: "قيد المراجعة", es: "En revisión", fr: "En cours d’examen", tone: "muted" },
  matching: { he: "אושר בבדיקה · מחפשים עורכי דין", en: "Approved · finding lawyers", ru: "Одобрено · ищем адвокатов", ar: "تمت الموافقة · نبحث عن محامين", es: "Aprobado · buscando abogados", fr: "Approuvé · recherche d’avocats", tone: "gold" },
  has_interest: { he: "יש התעניינות", en: "Interest received", ru: "Есть заинтересованность", ar: "هناك اهتمام", es: "Hay interés", fr: "Intérêt reçu", tone: "navy" },
  connected: { he: "נוצר חיבור", en: "Connected", ru: "Связь установлена", ar: "تم التواصل", es: "Conectado", fr: "Mis en relation", tone: "success" },
  closed: { he: "התיק הסתיים", en: "Case closed", ru: "Дело закрыто", ar: "أُغلق الملف", es: "Caso cerrado", fr: "Dossier clôturé", tone: "muted" },
  withdrawn: { he: "הפנייה נמשכה", en: "Case withdrawn", ru: "Обращение отозвано", ar: "سُحب الطلب", es: "Caso retirado", fr: "Dossier retiré", tone: "muted" },
  rejected: { he: "לא נמצאה עילה", en: "No cause found", ru: "Оснований не найдено", ar: "لم يُعثر على أساس قانوني", es: "No se encontró fundamento", fr: "Aucun fondement retenu", tone: "muted" },
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

/* ניסוחי זמן יחסי — קצרים בכוונה, כמו בכל ממשק נייד */
const TIME_PHRASES: Record<Lang, { now: string; hours: (h: number) => string; yesterday: string; days: (d: number) => string }> = {
  he: { now: "הרגע", hours: (h) => `לפני ${h} שעות`, yesterday: "אתמול", days: (d) => `לפני ${d} ימים` },
  en: { now: "just now", hours: (h) => `${h}h ago`, yesterday: "yesterday", days: (d) => `${d}d ago` },
  ru: { now: "только что", hours: (h) => `${h} ч назад`, yesterday: "вчера", days: (d) => `${d} дн. назад` },
  ar: { now: "الآن", hours: (h) => `قبل ${h} ساعات`, yesterday: "أمس", days: (d) => `قبل ${d} أيام` },
  es: { now: "ahora mismo", hours: (h) => `hace ${h} h`, yesterday: "ayer", days: (d) => `hace ${d} días` },
  fr: { now: "à l’instant", hours: (h) => `il y a ${h} h`, yesterday: "hier", days: (d) => `il y a ${d} jours` },
};

export function timeAgo(ts: number, lang: Lang = "he"): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const p = TIME_PHRASES[lang];
  if (h < 1) return p.now;
  if (h < 24) return p.hours(h);
  const d = Math.floor(h / 24);
  return d === 1 ? p.yesterday : p.days(d);
}

export function useTimeAgo() {
  const { lang } = useSettings();
  return (ts: number) => timeAgo(ts, lang);
}
