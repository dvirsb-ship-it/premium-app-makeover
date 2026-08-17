import type { CaseStatus } from "./types";
import type { Lang } from "./settings";
import { useSettings } from "./settings";

type StatusLabel = Record<Lang, string> & { tone: "gold" | "navy" | "success" | "muted" };

const LABELS: Record<CaseStatus, StatusLabel> = {
  validating: { he: "בבדיקה", en: "Reviewing", ru: "На проверке", ar: "قيد المراجعة", es: "En revisión", fr: "En cours d’examen", tone: "muted" },
  matching: { he: "עברה את הבדיקה · מחפשים עורכי דין", en: "Passed · finding lawyers", ru: "Проверено · ищем адвокатов", ar: "اجتاز الفحص · نبحث عن محامين", es: "Aprobada · buscando abogados", fr: "Validée · recherche d’avocats", tone: "gold" },
  has_interest: { he: "יש התעניינות", en: "Interest received", ru: "Есть заинтересованность", ar: "هناك اهتمام", es: "Hay interés", fr: "Intérêt reçu", tone: "navy" },
  connected: { he: "נוצר חיבור", en: "Connected", ru: "Связь установлена", ar: "تم التواصل", es: "Conectado", fr: "Mis en relation", tone: "success" },
  closed: { he: "התיק הסתיים", en: "Case closed", ru: "Дело закрыто", ar: "أُغلق الملف", es: "Caso cerrado", fr: "Dossier clôturé", tone: "muted" },
  withdrawn: { he: "הפנייה נמשכה", en: "Case withdrawn", ru: "Обращение отозвано", ar: "سُحب الطلب", es: "Caso retirado", fr: "Dossier retiré", tone: "muted" },
  rejected: { he: "לא זוהה סיכוי", en: "No chance identified", ru: "Шанс не выявлен", ar: "لم يُلحَظ احتمال", es: "Sin posibilidades identificadas", fr: "Aucune chance identifiée", tone: "muted" },
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

/*
 * צבע הטקסט הוא ה-ink ולא צבע המשטח — נמדד ותוקן 17/8/2026.
 *
 * `text-gold` על `bg-gold/15` נתן **1.94:1** במצב בהיר, ו-`text-success`
 * על `bg-success/12` נתן **2.24:1**. אלה שני הצ׳יפים המרכזיים של הלקוח
 * ("עברה את הבדיקה" ו"נוצר חיבור") — כלומר הסטטוס של התיק שלו היה כמעט
 * בלתי קריא על נייר. בכהה שניהם עברו, ולכן זה לא נראה בעין: העבודה
 * נעשתה במצב כהה.
 *
 * זו אותה טעות ש-`--gold-ink` נוצר כדי למנוע: `--gold` הוא צבע שממלא,
 * לא צבע שכותב. הטוקנים של ה-ink כבר מוגדרים בשני המצבים בנפרד, ולכן
 * אין צורך בגרסת `dark:` — הם מתהפכים לבד. אחרי: 5.00 / 8.45 לזהב,
 * 4.90 / 5.93 להצלחה.
 */
export const toneClasses: Record<string, string> = {
  gold: "bg-gold/15 text-gold-ink",
  navy: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success-ink",
  muted: "bg-muted text-muted-foreground",
};

/*
 * ניסוחי זמן יחסי — קצרים בכוונה, כמו בכל ממשק נייד.
 *
 * עברית וערבית אינן מסתפקות במספר + שם עצם ברבים. "לפני 1 שעות" הופיע
 * כאן שעה שלמה בחיי כל תיק וכל התראה, בשלושת המסכים הנצפים ביותר,
 * ונקרא כמו תרגום מכונה. לשתיהן יש צורת יחיד וצורת זוגי, ולערבית גם
 * כלל היפוך מ-11 ומעלה (מספר + שם עצם ביחיד).
 *
 * שאר השפות משתמשות בקיצורים ("1h", "1 ч", "hace 1 h"), ושם המספר
 * העירום תקין — לכן הן נשארות פשוטות. הדקדוק מקובע ב-status.test.ts.
 */
const TIME_PHRASES: Record<Lang, { now: string; hours: (h: number) => string; yesterday: string; days: (d: number) => string }> = {
  he: {
    now: "הרגע",
    hours: (h) => (h === 1 ? "לפני שעה" : h === 2 ? "לפני שעתיים" : `לפני ${h} שעות`),
    yesterday: "אתמול",
    days: (d) => (d === 2 ? "לפני יומיים" : `לפני ${d} ימים`),
  },
  en: { now: "just now", hours: (h) => `${h}h ago`, yesterday: "yesterday", days: (d) => `${d}d ago` },
  ru: { now: "только что", hours: (h) => `${h} ч назад`, yesterday: "вчера", days: (d) => `${d} дн. назад` },
  ar: {
    now: "الآن",
    hours: (h) =>
      h === 1 ? "قبل ساعة" : h === 2 ? "قبل ساعتين" : h <= 10 ? `قبل ${h} ساعات` : `قبل ${h} ساعة`,
    yesterday: "أمس",
    days: (d) => (d === 2 ? "قبل يومين" : d <= 10 ? `قبل ${d} أيام` : `قبل ${d} يومًا`),
  },
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
