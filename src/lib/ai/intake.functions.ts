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

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

async function generate(
  contents: GeminiContent[],
  opts?: { system?: string; json?: boolean; schema?: object; temperature?: number; maxTokens?: number },
  model: string = INTAKE_MODEL,
): Promise<string> {
  const key = await geminiKey();
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts?.temperature ?? 0.4,
      maxOutputTokens: opts?.maxTokens ?? 2500,
      ...(opts?.json
        ? { responseMimeType: "application/json", ...(opts.schema ? { responseSchema: opts.schema } : {}) }
        : {}),
    },
  };
  if (opts?.system) body.system_instruction = { parts: [{ text: opts.system }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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

/** מודל חזק לניתוח העומק, עם נפילה חזרה למודל המהיר אם אינו זמין. */
const DEEP_MODELS = ["gemini-pro-latest", INTAKE_MODEL];

async function generateDeep(
  contents: GeminiContent[],
  opts?: Parameters<typeof generate>[1],
): Promise<string> {
  let lastErr: unknown;
  for (const model of DEEP_MODELS) {
    try {
      return await generate(contents, opts, model);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/* ---------- צ'אט הקליטה ---------- */

export interface IntakeTurnInput {
  messages: { from: "assistant" | "user"; text: string }[];
  idToken: string;
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
    const { requireUser, withErrorLog } = await import("./server-admin");
    return withErrorLog("intakeTurn", async () => {
    await requireUser(data.idToken);

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
  });

/* ---------- ולידציית התיק ---------- */

export interface ValidateInput {
  /** הוולידציה קוראת את התיק בעצמה וכותבת את התוצאה — הלקוח לא נוגע בסטטוס. */
  caseId: string;
  idToken: string;
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

const MEMO_SYSTEM = `אתה משפטן ישראלי בכיר שכותב תזכיר בדיקה פנימי לפני קבלת תיק. כתוב תזכיר מובנה ויסודי בעברית (300-500 מילים) על המקרה שתקבל:

1. **עובדות** — מה קרה, למי, מתי, באילו נסיבות.
2. **עילות אפשריות** — עבור עילה-עילה לפי הדין הישראלי (רשלנות והפרת חובה חקוקה בפקודת הנזיקין; חוק האחריות למוצרים פגומים; פלת"ד לתאונות דרכים; חוקי המגן בעבודה; חוק חוזה הביטוח; חוק הגנת הצרכן; חוק הנכים/קצין התגמולים לנפגעי שירות). לכל עילה: יסודותיה, האם מתקיימים כאן, ומה חסר.
3. **התיישנות** — חשב במפורש מול התאריך הנוכחי (נזיקין 7 שנים; ביטוח 3; קצין התגמולים כלליו).
4. **נזק וסיבתיות** — מהו הנזק בר-הפיצוי והאם ניתן לקשור אותו לאחריות הגורם.
5. **טענות נגד** — מה יטען הצד שכנגד (אשם תורם, העדר ראיות, ניתוק קשר סיבתי) וכמה הן חזקות.
6. **מסלול נכון** — תביעה אזרחית עם עו"ד / מסלול מיוחד עם עו"ד (קצין התגמולים, ביטוח לאומי, פלת"ד) / הליך עצמאי בלי עו"ד (תביעות קטנות עד 38,900₪, תלונה צרכנית) / אין הליך.
7. **שורה תחתונה** — האם מוצדק לחבר את הפונה לעורך דין, ובאיזו רמת ביטחון.

אל תכלול פרטים מזהים. זהו תזכיר פנימי — היה ישיר וביקורתי.`;

const VERDICT_SYSTEM = `אתה השופט הפנימי של JustAsk. קיבלת תזכיר בדיקה משפטי על מקרה. תפקידך לבקר אותו ולהכריע סופית:
- אם התזכיר אישר קלות יתר — תקן לחומרה. אם פסל בקלות יתר — תקן לקולא. הכרעתך היא הקובעת.
- validated=true רק אם יש עילה ממשית, בתוך התיישנות, עם נזק בר-פיצוי, במסלול שעורך דין רלוונטי לו.
${VALIDATION_SYSTEM.slice(VALIDATION_SYSTEM.indexOf("כללי פלט:"))}`;

export const validateCaseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ValidateInput)
  .handler(async ({ data }): Promise<ValidateResult> => {
    const { requireUser, adminGetCase, adminUpdateCase, downloadImageBase64, sendPush, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("validateCase", async () => {
    const uid = await requireUser(data.idToken);

    const raw = await adminGetCase(data.caseId);
    if (!raw) throw new Error("case not found");
    const c = raw as {
      clientId: string;
      description: string;
      incidentDate?: string;
      damageType?: string;
      hasDocumentation?: boolean;
      images?: { origPath: string }[];
    };
    if (c.clientId !== uid) throw new Error("forbidden");

    const caseText = `התאריך היום: ${new Date().toISOString().slice(0, 10)}
תיאור המקרה: ${c.description}
תאריך האירוע: ${c.incidentDate || "לא צוין"}
סוג הנזק: ${c.damageType || "לא צוין"}
תיעוד קיים: ${c.hasDocumentation ? "כן" : "לא"}`;

    // התמונות שצורפו — ראיות עבור התזכיר (עד 3, המקור המלא)
    const imageParts: GeminiPart[] = [];
    for (const img of (c.images ?? []).slice(0, 3)) {
      const b64 = await downloadImageBase64(img.origPath);
      if (b64) imageParts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
    }

    // שלב 1: תזכיר משפטי מעמיק — עילות, התיישנות, טענות נגד, מסלול
    const memo = await generateDeep(
      [{ role: "user", parts: [...imageParts, { text: caseText }] }],
      {
        system: imageParts.length
          ? `${MEMO_SYSTEM}\n\nמצורפות תמונות שהפונה העלה כתיעוד — התייחס אליהן בסעיפי העובדות, הנזק והראיות.`
          : MEMO_SYSTEM,
        temperature: 0.2,
        maxTokens: 4000,
      },
    );

    // שלב 2: שופט מבקר את התזכיר ומכריע סופית ב-JSON
    const verdict = await generateDeep(
      [
        {
          role: "user",
          parts: [{ text: `${caseText}\n\n--- תזכיר הבדיקה ---\n${memo}` }],
        },
      ],
      {
        system: VERDICT_SYSTEM,
        temperature: 0.2,
        maxTokens: 2500,
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

    const result = JSON.parse(verdict) as ValidateResult;

    // כתיבת התוצאה מהשרת — חוקי המסד חוסמים את הלקוח מלגעת בסטטוס בעצמו
    await adminUpdateCase(data.caseId, {
      title: result.title,
      category: result.category,
      summary: result.summary,
      legalBasis: result.legalBasis ?? "",
      recommendation: result.recommendation ?? "",
      status: result.validated ? "matching" : "rejected",
    });

    // התראה מחוץ לאפליקציה — הבדיקה לוקחת עד דקה והלקוח לרוב כבר עזב את המסך
    await sendPush(
      c.clientId,
      result.validated
        ? {
            title: "התיק שלך עבר את הבדיקה המשפטית ✓",
            body: `"${result.title}" אושר — עורכי דין בתחום קיבלו התראה`,
            link: `/case/${data.caseId}`,
          }
        : {
            title: "הבדיקה המשפטית הושלמה",
            body: result.recommendation || result.summary,
            link: `/case/${data.caseId}`,
          },
      "caseUpdates",
    );

    return result;
    });
  });

/* ---------- צנזור תמונות: זיהוי אזורים עם פרטים מזהים ---------- */

const CENSOR_SYSTEM = `אתה קצין פרטיות של פלטפורמה משפטית ישראלית. תפקידך: לאתר בתמונה כל אזור שחושף פרטים מזהים או פרטי התקשרות, כדי שיוסתר לפני שעורכי דין רואים אותה.

אתר וסמן כל אזור שמכיל:
- מספרי טלפון (כולל בכתב יד)
- שמות של אנשים או בתי עסק (טקסט מודפס, כתב יד, שלטים)
- כתובות אימייל וכתובות מגורים
- מספרי תעודת זהות, מספרי תיק, מספרי פוליסה
- לוגואים ושמות מותג שמזהים עסק
- לוחיות רישוי
- חשבונות רשתות חברתיות, קודי QR
- חתימות

אל תסמן: תיאור הפציעה עצמה, מסמכים ללא פרטים מזהים, רקע ניטרלי.

בנוסף כתוב description — משפט אחד עובדתי בעברית שמתאר מה רואים בתמונה מבחינה משפטית-ראייתית (למשל "צילום של מדרגה שבורה עם קצה מתפורר, ללא סימון אזהרה" או "סיכום אשפוז מבית חולים עם אבחנה של שבר"). בלי פרטים מזהים ובלי פרשנות משפטית.

החזר JSON בלבד: {"regions":[{"box_2d":[ymin,xmin,ymax,xmax],"label":"סוג הפרט"}],"description":"..."} — קואורדינטות מנורמלות 0-1000. אם אין אזורים רגישים החזר regions ריק.`;

export interface SensitiveRegion {
  /** [ymin, xmin, ymax, xmax] מנורמל 0-1000 — הפורמט שגמיני אומן עליו. */
  box_2d: [number, number, number, number];
  label: string;
}

export interface DetectRegionsInput {
  imageBase64: string;
  mimeType: string;
  idToken: string;
}

/** מזהה אזורים רגישים בתמונה. ההשחרה עצמה נעשית בצד הלקוח על canvas. */
export const detectSensitiveRegionsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as DetectRegionsInput)
  .handler(async ({ data }): Promise<{ regions: SensitiveRegion[]; description: string }> => {
    const { requireUser, withErrorLog } = await import("./server-admin");
    return withErrorLog("detectSensitiveRegions", async () => {
    await requireUser(data.idToken);

    const text = await generate(
      [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: data.mimeType, data: data.imageBase64 } },
            { text: "אתר את כל האזורים הרגישים בתמונה, וכתוב תיאור עובדתי קצר של מה שרואים." },
          ],
        },
      ],
      {
        system: CENSOR_SYSTEM,
        temperature: 0.1,
        maxTokens: 2000,
        json: true,
        schema: {
          type: "object",
          properties: {
            regions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  box_2d: { type: "array", items: { type: "integer" } },
                  label: { type: "string" },
                },
                required: ["box_2d", "label"],
              },
            },
            description: { type: "string" },
          },
          required: ["regions", "description"],
        },
      },
    );
    const parsed = JSON.parse(text) as { regions?: SensitiveRegion[]; description?: string };
    // סינון הגנתי: רק תיבות חוקיות בגבולות 0-1000
    const regions = (parsed.regions ?? []).filter(
      (r) =>
        Array.isArray(r.box_2d) &&
        r.box_2d.length === 4 &&
        r.box_2d.every((n) => typeof n === "number" && n >= 0 && n <= 1000),
    );
    return { regions, description: parsed.description ?? "" };
    });
  });

/* ---------- התראת דחיפה על הבעת עניין ---------- */

export interface NotifyInterestInput {
  caseId: string;
  idToken: string;
}

/**
 * עו"ד שהביע עניין מבקש להתריע ללקוח.
 * השרת מאמת שהפונה באמת רשום כמתעניין בתיק — אחרת אפשר היה לשלוח
 * התראות לכל משתמש. אין כאן פרטים מזהים של העו"ד; רק שיש התעניינות.
 */
export const notifyInterestFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as NotifyInterestInput)
  .handler(async ({ data }): Promise<{ sent: boolean }> => {
    const { requireUser, adminGetCase, sendPush, withErrorLog } = await import("./server-admin");
    return withErrorLog("notifyInterest", async () => {
      const uid = await requireUser(data.idToken);
      const c = await adminGetCase(data.caseId);
      if (!c) return { sent: false };

      const interestedIds = (c.interestedIds as string[] | undefined) ?? [];
      if (!interestedIds.includes(uid)) return { sent: false };

      await sendPush(
        c.clientId as string,
        {
          title: "עורך דין הביע עניין בתיק שלך",
          body: `"${(c.title as string) || "התיק שלך"}" — היכנסו לראות את ההצעה ולבחור`,
          link: `/case/${data.caseId}`,
        },
        "lawyerInterest",
      );
      return { sent: true };
    });
  });
