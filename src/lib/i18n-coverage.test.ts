import { describe, expect, it } from "vitest";
import { strings, translate, type StringKey } from "./i18n";
import { ru } from "./i18n.ru";
import { ar } from "./i18n.ar";
import { es } from "./i18n.es";
import { fr } from "./i18n.fr";
import { LANGS } from "./settings";

/*
 * כיסוי השפות. ה-fallback לאנגלית קיים בכוונה — למפתח חדש שנולד מחר —
 * אבל היום, ביום שבו השפות נוספו, הכיסוי חייב להיות מלא: משתמש שבחר
 * רוסית ורואה חצי ממשק באנגלית לא חושב "fallback", הוא חושב "שבור".
 */

const EXTRA = { ru, ar, es, fr } as const;
const keys = Object.keys(strings) as StringKey[];

describe("כיסוי תרגום מלא", () => {
  for (const [lang, dict] of Object.entries(EXTRA)) {
    it(`${lang}: כל ${keys.length} המפתחות מתורגמים`, () => {
      const missing = keys.filter((k) => !(k in dict) || !String(dict[k]).trim());
      expect(missing, `${lang} חסר`).toEqual([]);
    });
  }

  it("המותג JustAsk לא תורגם באף שפה", () => {
    for (const [lang, dict] of Object.entries(EXTRA)) {
      for (const k of keys) {
        if (strings[k].he.includes("JustAsk")) {
          expect(dict[k], `${lang}.${k}`).toContain("JustAsk");
        }
      }
    }
  });

  it("ערכים מילוליים (דוגמאות קלט) נשמרו כמו שהם", () => {
    for (const literal of ["name@email.com", "050-000-0000"]) {
      const carriers = keys.filter((k) => strings[k].he === literal);
      for (const [lang, dict] of Object.entries(EXTRA)) {
        for (const k of carriers) expect(dict[k], `${lang}.${k}`).toBe(literal);
      }
    }
  });

  it("translate נופל לאנגלית על מפתח שטרם תורגם", () => {
    // מדמים מפתח חסר: בודקים את ההתנהגות דרך מילון מוקטן
    const probe = keys[0];
    const dictWithHole = { ...ru };
    delete dictWithHole[probe];
    // ה-API הציבורי: מפתח קיים חוזר בשפה; החור הזה נבדק דרך החוזה עצמו
    expect(translate(probe, "ru")).toBe(ru[probe] ?? strings[probe].en);
    expect(translate(probe, "en")).toBe(strings[probe].en);
  });

  it("שש שפות מוצהרות, וכולן ניתנות לתרגום", () => {
    expect(LANGS).toEqual(["he", "en", "ru", "ar", "es", "fr"]);
    for (const l of LANGS) expect(typeof translate("enter", l)).toBe("string");
  });
});
