import { describe, it, expect } from "vitest";
import { strings } from "./i18n";

/**
 * התקנון מול ההבטחות הפומביות.
 *
 * הפער הזה קרה באמת: העברית עודכנה למנוי חודשי, האנגלית נשארה עם
 * "fee per completed connection" ו-"feed priority" — שניהם נשקלו ונדחו,
 * ודף הגיוס מבטיח לעורכי דין את ההפך המדויק. תקנון שסותר את מה שהובטח
 * בפומבי הוא בדיוק מה שעורך דין לאתיקה מחפש, והוא לא ייתפס בקריאה.
 *
 * הבדיקות כאן מנסחות את ההבטחות כתנאים, כדי שסתירה תיפול כאן ולא שם.
 */

const payments = strings.termsSection4Body;

describe("תקנום התשלומים — עברית", () => {
  const he = payments.he;

  it("הלקוח לא משלם, לעולם", () => {
    expect(he).toContain("חינם");
  });

  it("מנוי חודשי — ולא תשלום לפי חיבור", () => {
    expect(he).toContain("מנוי חודשי");
    expect(he).not.toMatch(/לפי חיבור|per connection|חיבור שהבשיל/);
  });

  it("אין עמלה ואין אחוז מהתיק", () => {
    expect(he).toMatch(/אינו כולל עמלה|ללא עמלה/);
  });

  it("תשלום אינו קונה מקום בתצוגה — הטיעון מול כלל 11ב", () => {
    expect(he).toContain("אינו משפיע על סדר התצוגה");
    expect(he).not.toMatch(/עדיפות בפיד תמורת|קידום בתשלום/);
  });
});

describe("תקנון התשלומים — אנגלית", () => {
  const en = payments.en;

  it("אין הבטחת תשלום לפי חיבור — הסתירה שהייתה", () => {
    expect(en).not.toMatch(/per completed connection|fee per connection/i);
  });

  it("אין הבטחת עדיפות בפיד — הסתירה החמורה יותר", () => {
    expect(en).not.toMatch(/feed priority|priority in the feed(?! )/i);
    expect(en).toMatch(/no priority in the feed/i);
  });

  it("מנוי חודשי קבוע", () => {
    expect(en).toMatch(/monthly subscription/i);
  });

  it("בלי עמלה", () => {
    expect(en).toMatch(/no commission/i);
  });
});

describe("שתי השפות מספרות את אותו סיפור", () => {
  it("שתיהן מבטיחות שהלקוח לא משלם", () => {
    expect(payments.he).toContain("חינם");
    expect(payments.en).toMatch(/free for clients/i);
  });

  it("שתיהן מבטיחות שתשלום אינו קונה תצוגה", () => {
    expect(payments.he).toContain("אינו משפיע על סדר התצוגה");
    expect(payments.en).toMatch(/does not affect placement/i);
  });

  it("שתיהן מאפשרות ביטול בכל עת", () => {
    expect(payments.he).toContain("לבטל בכל עת");
    expect(payments.en).toMatch(/cancel any time/i);
  });
});
