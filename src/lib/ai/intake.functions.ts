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
}

export interface IntakeTurnResult {
  reply: string;
  ready: IntakeReady | null;
}

export const intakeTurn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as IntakeTurnInput)
  .handler(async ({ data }): Promise<IntakeTurnResult> => {
    const contents: GeminiContent[] = data.messages.map((m) => ({
      role: m.from === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    const text = await generate(contents, { system: INTAKE_SYSTEM_PROMPT });

    const marker = text.indexOf("[READY]");
    if (marker === -1) return { reply: text, ready: null };

    const before = text.slice(0, marker).trim();
    const jsonPart = text.slice(marker + "[READY]".length).trim();
    try {
      const parsed = JSON.parse(
        jsonPart.replace(/^```json?/i, "").replace(/```$/, "").trim(),
      ) as IntakeReady;
      return {
        reply: before || "תודה! יש לי את כל מה שצריך — אפשר לשלוח לבדיקה.",
        ready: parsed,
      };
    } catch {
      return { reply: before || text.replace("[READY]", "").trim(), ready: null };
    }
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
}

const VALIDATION_SYSTEM = `אתה מנוע הוולידציה המשפטית של JustAsk — פלטפורמה ישראלית שמחברת נפגעים לעורכי דין.
קבל תיאור מקרה וסווג אותו. כללים:
1. category — בחר בדיוק אחת: "נזיקין ותאונות" / "רשלנות רפואית" / "דיני עבודה" / "ביטוח" / "צרכנות" / "מקרקעין" / "אחר".
2. validated=true אם זה מקרה משפטי אמיתי בתחומים אלה שקרה בישראל ויש לו עילה סבירה.
3. התיישנות: אם עברו יותר מ-7 שנים מהאירוע — validated=false והסבר בעדינות ב-summary.
4. אם התיאור אינו מקרה משפטי כלל (שטויות, בדיקה, נושא אחר) — validated=false.
5. title — כותרת קצרה ועניינית בעברית (עד 6 מילים) שמתארת את המקרה.
6. summary — סיכום מקצועי של 2-3 משפטים בעברית, בגוף שלישי, בלי פרטים מזהים (בלי שמות/טלפונים/ת"ז), המסתיים במשפט: "הבדיקה הראשונית אינה ייעוץ משפטי."
השב JSON בלבד.`;

export const validateCaseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ValidateInput)
  .handler(async ({ data }): Promise<ValidateResult> => {
    const user = `תיאור המקרה: ${data.description}
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
          },
          required: ["validated", "title", "category", "summary"],
        },
      },
    );

    return JSON.parse(text) as ValidateResult;
  });
