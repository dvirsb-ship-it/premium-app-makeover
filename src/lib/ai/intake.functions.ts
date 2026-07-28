/**
 * פונקציות השרת של ה-AI — Gemini.
 * רצות בצד השרת בלבד (createServerFn): מפתח ה-API לעולם לא מגיע לדפדפן.
 */
import { createServerFn } from "@tanstack/react-start";
import { INTAKE_MODEL, INTAKE_SYSTEM_PROMPT } from "./intake-prompt";

/* ---------- מפתח ה-API (שרת בלבד) ---------- */

let cachedKey: string | null = null;

async function geminiKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  if (process.env.GEMINI_API_KEY) {
    cachedKey = process.env.GEMINI_API_KEY;
    return cachedKey;
  }
  // פיתוח מקומי: קריאת .env מהשורש (על פלטפורמת האירוח המשתנה מגיע מהסביבה)
  try {
    const { readFileSync } = await import("node:fs");
    const raw = readFileSync(".env", "utf-8");
    const line = raw.split("\n").find((l) => l.startsWith("GEMINI_API_KEY="));
    if (line) {
      cachedKey = line.slice("GEMINI_API_KEY=".length).trim();
      return cachedKey;
    }
  } catch {
    /* ignore */
  }
  throw new Error("GEMINI_API_KEY is not configured");
}

/* ---------- קריאת Gemini ---------- */

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

async function generate(
  contents: GeminiContent[],
  opts?: { system?: string; json?: boolean; schema?: object },
): Promise<string> {
  const key = await geminiKey();
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2500,
      ...(opts?.json
        ? { responseMimeType: "application/json", ...(opts.schema ? { responseSchema: opts.schema } : {}) }
        : {}),
    },
  };
  if (opts?.system) body.system_instruction = { parts: [{ text: opts.system }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${INTAKE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("").trim();
}

/* ---------- צ'אט הקליטה ---------- */

export interface IntakeTurnInput {
  messages: { from: "assistant" | "user"; text: string }[];
}

export interface IntakeReady {
  description: string;
  incident_date: string;
  damage_type: "body" | "financial" | "both";
  has_documentation: boolean;
  city?: string;
}

export interface IntakeNotSuitable {
  reason: string;
  recommendation: string;
}

export interface IntakeTurnResult {
  reply: string;
  ready: IntakeReady | null;
  /** ה-AI הכריע שאין כאן תיק לתביעה — עם המלצה מה כן לעשות. */
  notSuitable: IntakeNotSuitable | null;
}

export const intakeTurn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as IntakeTurnInput)
  .handler(async ({ data }): Promise<IntakeTurnResult> => {
    const contents: GeminiContent[] = data.messages.map((m) => ({
      role: m.from === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    // עוגן זמן — בלעדיו "לפני שלושה שבועות" מחושב מתאריך שרירותי
    const today = new Date().toISOString().slice(0, 10);
    const text = await generate(contents, {
      system: `${INTAKE_SYSTEM_PROMPT}\n\n## עוגן זמן\nהתאריך היום: ${today}. חשב תאריכים יחסיים ("לפני שבוע", "לפני חודשיים") ביחס אליו.`,
    });

    const parseTerminator = <T,>(marker: string): { before: string; data: T } | null => {
      const idx = text.indexOf(marker);
      if (idx === -1) return null;
      const jsonPart = text.slice(idx + marker.length).trim();
      try {
        const data = JSON.parse(
          jsonPart.replace(/^```json?/i, "").replace(/```$/, "").trim(),
        ) as T;
        return { before: text.slice(0, idx).trim(), data };
      } catch {
        return null;
      }
    };

    const notSuitable = parseTerminator<IntakeNotSuitable>("[NOT_SUITABLE]");
    if (notSuitable) {
      return { reply: notSuitable.before, ready: null, notSuitable: notSuitable.data };
    }

    const ready = parseTerminator<IntakeReady>("[READY]");
    if (ready) {
      return {
        reply: ready.before || "תודה! יש לי את כל מה שצריך — אפשר לשלוח לבדיקה.",
        ready: ready.data,
        notSuitable: null,
      };
    }

    return {
      reply: text.replace("[READY]", "").replace("[NOT_SUITABLE]", "").trim(),
      ready: null,
      notSuitable: null,
    };
  });

/* ---------- ולידציית התיק ---------- */

export interface ValidateInput {
  description: string;
  incidentDate?: string;
  damageType?: string;
  hasDocumentation?: boolean;
}

export interface ValidateResult {
  validated: boolean;
  title: string;
  category: string;
  summary: string;
  /** הבסיס המשפטי לאישור — מוצג לעורכי הדין בדף התיק. */
  legalBasis: string;
  /** בדחייה: המלצה מעשית מה כן לעשות. */
  recommendation?: string;
}

const VALIDATION_SYSTEM = `אתה מנוע הוולידציה המשפטית של JustAsk — פלטפורמה ישראלית שמחברת נפגעים לעורכי דין. אתה שומר הסף: תיק שעובר אצלך מגיע לעורכי דין אמיתיים, ואישור קל מדי שורף את אמונם. נתח באמת.

בצע ניתוח בארבעה צירים לפני ההכרעה:
א. עילה — האם קיימת עילת תביעה מוכרת בדין הישראלי (רשלנות, הפרת חובה חקוקה, אחריות למוצרים פגומים, הפרת חוזה, חוק פיצויים לנפגעי ת"ד, חוקי מגן בעבודה, חוזה ביטוח)? מי הגורם האחראי?
ב. התיישנות — נזיקין 7 שנים; תביעת ביטוח 3 שנים; קצין התגמולים כללים משלו. חלף המועד — validated=false.
ג. נזק — האם יש נזק ממשי בר-פיצוי? נזק זניח או נעדר — validated=false עם הפניה מתאימה.
ד. מסלול — תיק אזרחי רגיל? מסלול מיוחד שעו"ד רלוונטי לו (קצין התגמולים, ביטוח לאומי, פלת"ד)? או מסלול עצמאי שאינו מצריך עו"ד (תביעות קטנות עד 38,900₪ בעניין פשוט, תלונה צרכנית)?

כללי פלט:
1. category — בדיוק אחת: "נזיקין ותאונות" / "רשלנות רפואית" / "דיני עבודה" / "ביטוח" / "צרכנות" / "מקרקעין" / "אחר".
2. validated=true רק אם עברו כל ארבעת הצירים ויש הצדקה אמיתית לחיבור לעורך דין.
3. title — כותרת קצרה ועניינית בעברית (עד 6 מילים).
4. summary — סיכום מקצועי של 2-3 משפטים בעברית, גוף שלישי, בלי פרטים מזהים, המסתיים ב: "הבדיקה הראשונית אינה ייעוץ משפטי."
5. legalBasis — לעיני עורכי דין: העילה, הדין, ההתיישנות והמסלול (למשל "עוולת הרשלנות לפי פקודת הנזיקין [נוסח חדש]; בתוך תקופת ההתיישנות; מסלול אזרחי"). אם validated=false — הסבר תמציתי של הכשל המשפטי.
6. recommendation — רק כש-validated=false: המלצה מעשית בגוף שני מה כן לעשות (לאן לפנות, מה להכין, מה יהפוך את זה לתיק). כש-validated=true — מחרוזת ריקה.
7. בשום שדה אין טלפונים, אימיילים, קישורים או שמות מזהים.
השב JSON בלבד.`;

export const validateCaseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ValidateInput)
  .handler(async ({ data }): Promise<ValidateResult> => {
    const user = `התאריך היום: ${new Date().toISOString().slice(0, 10)}
תיאור המקרה: ${data.description}
תאריך האירוע: ${data.incidentDate || "לא צוין"}
סוג הנזק: ${data.damageType || "לא צוין"}
תיעוד קיים: ${data.hasDocumentation ? "כן" : "לא"}`;

    const text = await generate(
      [{ role: "user", parts: [{ text: user }] }],
      {
        system: VALIDATION_SYSTEM,
        json: true,
        schema: {
          type: "object",
          properties: {
            validated: { type: "boolean" },
            title: { type: "string" },
            category: { type: "string" },
            summary: { type: "string" },
            legalBasis: { type: "string" },
            recommendation: { type: "string" },
          },
          required: ["validated", "title", "category", "summary", "legalBasis", "recommendation"],
        },
      },
    );

    return JSON.parse(text) as ValidateResult;
  });
