/**
 * תבניות המייל של JustAsk.
 *
 * מופרד מהשליחה בכוונה: כאן אין רשת, אין סודות, ואין תלות בשרת — ולכן
 * אפשר לבדוק בבדיקות יחידה שהקישור נכון, שהעברית לא נשברת, ושכל מייל
 * יוצא עם דרך לצאת מהרשימה. השליחה עצמה יושבת ב-server-admin.
 */

/** הכתובת שאליה חוזרים מהמייל. הדומיין הציבורי, לא כתובת ה-App Hosting. */
export const APP_ORIGIN = "https://app.justask.co.il";

/** הכתובת השולחת. חייבת להיות על דומיין מאומת ב-Resend. */
export const MAIL_FROM = "JustAsk <no-reply@justask.co.il>";

export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

/** ניקוי טקסט שנכנס ל-HTML. הכותרות מגיעות משם תיק שהמשתמש הקליד. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * קישור מלא מתוך נתיב פנימי.
 *
 * הנתיבים בקוד ההתראות הם יחסיים (`/case/abc`) כי הם נכתבו עבור פוש,
 * שנפתח בתוך האפליקציה. במייל אין הקשר כזה — קישור יחסי פשוט לא יעבוד.
 */
export function absoluteLink(link: string): string {
  if (/^https?:\/\//i.test(link)) return link;
  return `${APP_ORIGIN}${link.startsWith("/") ? link : `/${link}`}`;
}

/**
 * מעטפת המייל.
 *
 * טבלאות וסגנון inline ולא flex/grid — לא בגלל טעם אלא כי Outlook ו-Gmail
 * מסירים <style> ולא מכירים חלק מה-CSS המודרני. dir=rtl יושב גם על <html>
 * וגם על התא, כי חלק מהלקוחות מתעלמים מהחיצוני.
 */
function shell(bodyHtml: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td dir="rtl" style="padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#18181b;text-align:right;">
${bodyHtml}
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td dir="rtl" style="padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#71717a;text-align:right;line-height:1.6;">
JustAsk — התאמה בין נפגעים לעורכי דין.<br>
<a href="${unsubscribeUrl}" style="color:#71717a;">להפסיק לקבל מיילים כאלה</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** כפתור. <a> עם padding ולא <button> — כפתורי HTML לא נלחצים במייל. */
function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:15px;">${escapeHtml(label)}</a>`;
}

/** דף ההגדרות שבו מכבים את הערוץ. כל מייל חייב לשאת אותו. */
export function unsubscribeUrl(): string {
  return `${APP_ORIGIN}/settings/notifications`;
}

/**
 * בניית המייל מתוך אותו תוכן שנשלח בפוש.
 *
 * במכוון אותו מקור: פוש ומייל שאומרים דברים שונים על אותו אירוע זה באג
 * שאי אפשר לראות בבדיקות. `cta` הוא הטקסט על הכפתור בלבד.
 */
export function buildNotificationMail(msg: {
  title: string;
  body: string;
  link?: string;
  cta?: string;
}): MailContent {
  const url = absoluteLink(msg.link ?? "/");
  const cta = msg.cta ?? "פתיחת האפליקציה";
  const unsub = unsubscribeUrl();

  const html = shell(
    `<h1 style="margin:0 0 12px;font-size:20px;font-weight:800;line-height:1.4;">${escapeHtml(msg.title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3f3f46;">${escapeHtml(msg.body)}</p>
${button(cta, url)}`,
    unsub,
  );

  const text = `${msg.title}\n\n${msg.body}\n\n${cta}: ${url}\n\nלהפסיק לקבל מיילים כאלה: ${unsub}`;

  return { subject: msg.title, html, text };
}
