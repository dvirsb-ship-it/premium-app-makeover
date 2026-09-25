/**
 * מניעת עקיפת הפלטפורמה: סינון פרטי קשר מתוכן חופשי, וטיהור שם הפונה
 * משדה הצדדים. פרטי הקשר המלאים מוחלפים רק אחרי חיבור רשמי
 * (cases/{id}/contacts).
 */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* גבול מילה ידני — ‎\b של JS לא עובד עם אותיות עבריות */
const BOUND_L = "(^|[^א-תA-Za-z])";
const BOUND_R = "($|[^א-תA-Za-z])";

/**
 * שדה הצדדים נכתב ע"י המנוע מתוך השיחה — ואם הפונה אמר את שמו, השם
 * עלול להגיע לעורך הדין עוד לפני חיבור (שלב א נועד לשמות הצדדים
 * האחרים בלבד; הפונה הוא תמיד "הפונה", סעיף 2.5). כאן מוחלף שמו של
 * הפונה — השם המלא וגם כל מילה ממנו בנפרד — ב"הפונה", וכפילויות
 * שנוצרות מכווצות.
 */
export function scrubApplicantName(parties: string, applicantName: string): string {
  const name = applicantName.trim();
  if (!parties || !name) return parties;
  let out = parties;
  const tokens = [name, ...name.split(/\s+/)].filter((t) => t.length >= 2);
  for (const t of tokens) {
    out = out.replace(new RegExp(`${BOUND_L}${esc(t)}${BOUND_R}`, "g"), "$1הפונה$2");
  }
  return out
    .replace(/הפונה([\s,;]+הפונה)+/g, "הפונה")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const PHONE_RE = /(\+?972[-\s]?|0)(\d[-\s]?){8,9}\d/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const URL_RE = /(https?:\/\/|www\.)\S+/gi;

/** מסיר טלפונים, אימיילים וקישורים מטקסט חופשי שנחשף לפני חיבור. */
export function stripContactInfo(text: string): string {
  return text
    .replace(PHONE_RE, "[הוסר]")
    .replace(EMAIL_RE, "[הוסר]")
    .replace(URL_RE, "[הוסר]")
    .trim();
}
