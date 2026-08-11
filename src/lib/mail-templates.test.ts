import { describe, it, expect } from "vitest";
import {
  absoluteLink,
  buildNotificationMail,
  escapeHtml,
  unsubscribeUrl,
  APP_ORIGIN,
  LOGO_URL,
  MAIL_FROM,
} from "./mail-templates";

describe("absoluteLink", () => {
  it("הופך נתיב פנימי לכתובת מלאה", () => {
    expect(absoluteLink("/case/abc")).toBe(`${APP_ORIGIN}/case/abc`);
  });

  it("מוסיף לוכסן חסר", () => {
    expect(absoluteLink("lawyer")).toBe(`${APP_ORIGIN}/lawyer`);
  });

  it("לא נוגע בכתובת שכבר מלאה", () => {
    expect(absoluteLink("https://example.com/x")).toBe("https://example.com/x");
  });

  it("ברירת מחדל היא דף הבית ולא קישור שבור", () => {
    expect(buildNotificationMail({ title: "כותרת", body: "גוף" }).text).toContain(`${APP_ORIGIN}/`);
  });
});

describe("escapeHtml", () => {
  it("מנטרל תגיות בשם תיק שהמשתמש הקליד", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).not.toContain("<img");
  });

  it("לא נוגע בעברית", () => {
    expect(escapeHtml("תאונת דרכים")).toBe("תאונת דרכים");
  });
});

describe("buildNotificationMail", () => {
  const msg = {
    title: "עורך דין הביע עניין בתיק שלך",
    body: '"תאונה בצומת" — היכנסו לראות',
    link: "/case/xyz",
  };

  it("הנושא זהה לכותרת הפוש — אותו אירוע, אותו נוסח", () => {
    expect(buildNotificationMail(msg).subject).toBe(msg.title);
  });

  it("הקישור בגוף המייל הוא מוחלט", () => {
    const { html, text } = buildNotificationMail(msg);
    expect(html).toContain(`${APP_ORIGIN}/case/xyz`);
    expect(text).toContain(`${APP_ORIGIN}/case/xyz`);
  });

  it("כיוון הכתיבה מימין לשמאל", () => {
    const { html } = buildNotificationMail(msg);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="he"');
  });

  it("כל מייל נושא דרך לצאת מהרשימה", () => {
    const { html, text } = buildNotificationMail(msg);
    expect(html).toContain(unsubscribeUrl());
    expect(text).toContain(unsubscribeUrl());
  });

  it("המרכאות בשם התיק לא שוברות את ה-HTML", () => {
    const { html } = buildNotificationMail(msg);
    // הגרשיים מהגוף חייבים לצאת ממולטים ולא לסגור מאפיין
    expect(html).toContain("&quot;תאונה בצומת&quot;");
  });

  it("גרסת הטקסט אינה מכילה HTML — לקוחות ללא HTML מקבלים טקסט קריא", () => {
    const { text } = buildNotificationMail(msg);
    expect(text).not.toMatch(/<[a-z/]/i);
  });

  it("טקסט הכפתור ניתן להתאמה, עם ברירת מחדל", () => {
    expect(buildNotificationMail(msg).html).toContain("פתיחת האפליקציה");
    expect(buildNotificationMail({ ...msg, cta: "לצפייה בהצעה" }).html).toContain("לצפייה בהצעה");
  });
});

describe("כתובת השולח", () => {
  it("על הדומיין המאומת ב-Resend", () => {
    expect(MAIL_FROM).toContain("@justask.co.il");
  });
});

describe("מיתוג", () => {
  const mail = buildNotificationMail({ title: "כותרת", body: "גוף" });

  it("הלוגו בראש המייל, בכתובת מלאה עם alt", () => {
    expect(LOGO_URL).toMatch(/^https:\/\//);
    expect(mail.html).toContain(`src="${LOGO_URL}"`);
    expect(mail.html).toContain('alt="JustAsk"');
  });

  it("הלוגו הוא הגרסה הקטנה, לא אייקון האפליקציה המלא", () => {
    expect(LOGO_URL).toContain("email-logo");
    expect(LOGO_URL).not.toContain("app-icon");
  });

  /*
   * המלל התחתון נושא את ההסתייגות שמופיעה בכל מייל יוצא. הנוסח שוכתב
   * ב-10/8/2026: קודם הוא אמר "הבדיקה הראשונית אינה ייעוץ משפטי",
   * ועכשיו הוא אומר את זה על **הפלטפורמה** ולא רק על הבדיקה — כי זו
   * הטענה שצריכה להיאמר, ואין לה תלות בשם שנתנו לשלב.
   */
  it("המלל התחתון: למה התקבל המייל, ושאיננו נותנים ייעוץ משפטי", () => {
    expect(mail.html).toContain("כי יש לך חשבון ב-JustAsk");
    expect(mail.html).toContain("איננו עורכי דין");
    expect(mail.html).toContain("איננו נותנים ייעוץ משפטי");
  });

  it("גם גרסת הטקסט אומרת למה התקבל המייל", () => {
    expect(mail.text).toContain("כי יש לך חשבון ב-JustAsk");
  });
});
