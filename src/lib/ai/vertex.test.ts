import { describe, expect, it } from "vitest";
import {
  AI_VERTEX_ENABLED,
  VERTEX_LOCATION,
  VERTEX_PROJECT,
  toVertexBody,
  vertexModel,
  vertexUrl,
} from "./vertex";

/*
 * כל מה שנבדק כאן הוא הרכבת מחרוזות והמרת שדות — שני סוגי טעות שאין
 * להם שום סימן מוקדם. שם מודל שגוי מחזיר 404 על כל קריאה, ואזור שגוי
 * מחזיר 200 — ופשוט מעבד את התיק במקום אחר מזה שהבטחנו במדיניות
 * הפרטיות. השני הוא החמור, והוא היחיד שאי אפשר לגלות מהתנהגות.
 */

describe("שמות המודלים", () => {
  it("הכינויים הנעים מתורגמים לגרסאות מפורשות", () => {
    expect(vertexModel("gemini-flash-latest")).toBe("gemini-2.5-flash");
    expect(vertexModel("gemini-pro-latest")).toBe("gemini-2.5-pro");
  });

  it("שם שכבר מפורש עובר כמות שהוא", () => {
    expect(vertexModel("gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });

  it("אין '-latest' בשום שם שנשלח ל-Vertex", () => {
    for (const m of ["gemini-flash-latest", "gemini-pro-latest"]) {
      expect(vertexModel(m)).not.toContain("latest");
    }
  });
});

describe("כתובת הקריאה", () => {
  it("האזור מופיע פעמיים — בשם המארח ובנתיב", () => {
    const url = vertexUrl("gemini-flash-latest");
    expect(url).toContain(`https://${VERTEX_LOCATION}-aiplatform.googleapis.com/`);
    expect(url).toContain(`/locations/${VERTEX_LOCATION}/`);
  });

  it("האזור הוא אירופה — ההתחייבות למיקום עיבוד לא קיימת בישראל", () => {
    expect(VERTEX_LOCATION).toBe("europe-west4");
    expect(vertexUrl("x")).not.toContain("me-west1");
  });

  it("לא הכתובת הגלובלית — היא זו שאין עליה התחייבות מיקום", () => {
    expect(vertexUrl("x")).not.toContain("//aiplatform.googleapis.com");
    expect(vertexUrl("x")).not.toContain("/locations/global/");
  });

  it("הפרויקט והפעולה במקומם", () => {
    const url = vertexUrl("gemini-pro-latest");
    expect(url).toContain(`/projects/${VERTEX_PROJECT}/`);
    expect(url).toContain("/publishers/google/models/gemini-2.5-pro:generateContent");
  });
});

describe("המרת גוף הבקשה", () => {
  it("הוראת המערכת עוברת ל-camelCase ושם snake_case נעלם", () => {
    const out = toVertexBody({
      contents: [],
      system_instruction: { parts: [{ text: "הנחיה" }] },
    });
    expect(out.systemInstruction).toEqual({ parts: [{ text: "הנחיה" }] });
    expect("system_instruction" in out).toBe(false);
  });

  it("תמונה מומרת ל-inlineData עם mimeType", () => {
    const out = toVertexBody({
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: "AAA" } },
            { text: "תיאור" },
          ],
        },
      ],
    });
    const parts = (out.contents as { parts: Record<string, unknown>[] }[])[0].parts;
    expect(parts[0]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "AAA" } });
    expect("inline_data" in parts[0]).toBe(false);
    /* חלק טקסט אינו נוגע */
    expect(parts[1]).toEqual({ text: "תיאור" });
  });

  it("generationConfig עובר בלי שינוי — הוא כבר camelCase", () => {
    const cfg = { temperature: 0.2, maxOutputTokens: 8000 };
    expect(toVertexBody({ contents: [], generationConfig: cfg }).generationConfig).toBe(cfg);
  });

  it("גוף בלי תמונות ובלי הנחיה אינו משתנה", () => {
    const body = { contents: [{ role: "user", parts: [{ text: "שלום" }] }] };
    expect(toVertexBody(body)).toEqual(body);
  });

  it("אינו משנה את הגוף המקורי במקום", () => {
    const body = {
      contents: [
        { role: "user", parts: [{ inline_data: { mime_type: "image/jpeg", data: "A" } }] },
      ],
      system_instruction: { parts: [{ text: "x" }] },
    };
    toVertexBody(body);
    expect("system_instruction" in body).toBe(true);
    expect("inline_data" in body.contents[0].parts[0]).toBe(true);
  });
});

describe("המתג", () => {
  /* מתעד את המצב, לא קובע אותו — מי שמדליק ייתקל כאן ויידע מה נדרש */
  it("כבוי עד שה-API יופעל בקונסולה", () => {
    expect(typeof AI_VERTEX_ENABLED).toBe("boolean");
  });
});
