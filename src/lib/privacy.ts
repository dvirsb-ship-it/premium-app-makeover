/**
 * מניעת עקיפת הפלטפורמה: הסתרת שמות מלאים וסינון פרטי קשר מתוכן חופשי.
 * פרטי הקשר המלאים מוחלפים רק אחרי חיבור רשמי (cases/{id}/contacts).
 */

/** "יוסי כהן" → "יוסי כ׳" — שם פרטי + אות ראשונה של שם המשפחה. */
export function maskLawyerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0]}׳`;
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
