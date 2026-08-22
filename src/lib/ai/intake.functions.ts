/**
 * פונקציות השרת של ה-AI — Gemini.
 * רצות בצד השרת בלבד (createServerFn): מפתח ה-API לעולם לא מגיע לדפדפן.
 */
import { createServerFn } from "@tanstack/react-start";
import { INTAKE_MODEL, INTAKE_SYSTEM_PROMPT } from "./intake-prompt";
import { VALIDATION_CATEGORIES, normalizeCategory } from "../specialties";
import { redactForAi } from "./redact";
import { stripContactInfo } from "../privacy";
import { AI_VERTEX_ENABLED, toVertexBody, vertexUrl } from "./vertex";

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

/**
 * שליחת הבקשה — Vertex באזור נעוץ, או ה-Developer API כשהוא כבוי.
 *
 * שני המסלולים מדברים את אותו פרוטוקול ומחזירים אותו מבנה תשובה, ולכן
 * כל מה שסביבם — הסכימה, האכיפה של הקטגוריות, טיפול בתשובה ריקה —
 * אינו יודע באיזה מהם השתמשנו ואינו צריך לדעת.
 *
 * **הנפילה חזרה אינה עצלנות אלא פיתוח מקומי:** אסימון חשבון השירות
 * מגיע משרת המטא-דאטה של Cloud Run, שאינו קיים על מחשב. בלי הנפילה
 * הזו הרצה מקומית הייתה נשברת בכל קריאה. בייצור השרת תמיד שם, ולכן
 * נפילה שם פירושה תקלה אמיתית — והיא נרשמת ביומן ולא נבלעת.
 */
async function callModel(
  body: Record<string, unknown>,
  model: string,
): Promise<Response> {
  if (AI_VERTEX_ENABLED) {
    try {
      const { accessToken } = await import("./server-admin");
      const token = await accessToken();
      return await fetch(vertexUrl(model), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(toVertexBody(body)),
      });
    } catch (err) {
      console.warn(
        "[vertex] אין אסימון חשבון שירות — נופל ל-Developer API. " +
          "בייצור זו תקלה, מקומית זה צפוי.",
        err,
      );
    }
  }

  const key = await geminiKey();
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    },
  );
}

async function generate(
  contents: GeminiContent[],
  opts?: { system?: string; json?: boolean; schema?: object; temperature?: number; maxTokens?: number },
  model: string = INTAKE_MODEL,
): Promise<string> {
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts?.temperature ?? 0.4,
      /*
       * התקציב כולל את טוקני החשיבה של המודל, לא רק את התשובה. ב-2500
       * שיחה מורכבת הגיעה ל-MAX_TOKENS כשהחשיבה בלעה הכול — והמשתמש קיבל
       * שתיקה. ההעלאה כאן זולה: משלמים לפי מה שנוצר בפועל, לא לפי התקרה.
       */
      maxOutputTokens: opts?.maxTokens ?? 8000,
      ...(opts?.json
        ? { responseMimeType: "application/json", ...(opts.schema ? { responseSchema: opts.schema } : {}) }
        : {}),
    },
  };
  if (opts?.system) body.system_instruction = { parts: [{ text: opts.system }] };

  const res = await callModel(body, model);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();

  /*
   * תשובה ריקה עם 200.
   *
   * זה קרה במשתמש אמיתי: המסך הראה "מקליד", הפסיק, ושום הודעה לא הופיעה.
   * הבקשה הצליחה — Gemini פשוט לא החזיר טקסט. שלוש סיבות אפשריות, וכולן
   * נראו זהות מבחוץ:
   *   MAX_TOKENS — המודל חושב, וטוקני החשיבה נספרים בתקציב הפלט. בשיחה
   *     מורכבת הם בולעים את כל התקציב ולא נשאר דבר לתשובה.
   *   SAFETY / blockReason — התוכן נחסם.
   *   כשל אחר בצד המודל.
   *
   * החזרת מחרוזת ריקה כלפי מעלה הפכה את זה לשתיקה מוחלטת. עכשיו זו
   * שגיאה מפורשת: המסך יציג הודעה, ויחזיר למשתמש את מה שכתב.
   */
  if (!text) {
    const why = cand?.finishReason ?? data.promptFeedback?.blockReason ?? "EMPTY";
    throw new Error(`Gemini החזיר תשובה ריקה (${why})`);
  }
  return text;
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

/** סוגי התיעוד שהפונה מצהיר עליהם. רשימה סגורה — ראו את הפרומפט. */
export const DOC_KINDS = ["medical","scene","messages","financial","witnesses","official"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export interface IntakeReady {
  description: string;
  incident_date: string;
  damage_type: "body" | "financial" | "both";
  /**
   * מה קיים בידי הפונה, לפי הצהרתו.
   *
   * החליף את `has_documentation` הבוליאני ואת העלאת הקבצים (12/8/2026):
   * עורך הדין מקבל את אותו אות בלי שנחזיק מסמך רפואי של אדם פגוע.
   */
  documents?: DocKind[];
  /** @deprecated שיחות שנפתחו לפני השינוי. נגזר מ-documents. */
  has_documentation?: boolean;
  city?: string;
}

export interface IntakeNotSuitable {
  reason: string;
  recommendation: string;
}

export interface IntakeTurnResult {
  reply: string;
  ready: IntakeReady | null;
  /** הפנייה אינה בתחומי השירות — עם המלצה לאן כן לפנות. */
  notSuitable: IntakeNotSuitable | null;
}

export const intakeTurn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as IntakeTurnInput)
  .handler(async ({ data }): Promise<IntakeTurnResult> => {
    const { requireUser, enforceDailyCap, withErrorLog } = await import("./server-admin");
    return withErrorLog("intakeTurn", async () => {
    const uid = await requireUser(data.idToken);
    await enforceDailyCap(uid, "intakeTurn");

    /*
     * הניקוי חל גם על תורות העוזר ולא רק על אלה של הפונה: העוזר משקף
     * לפעמים בחזרה מה שנמסר לו ("אז אפשר להשיג אותך ב-..."), וניקוי של
     * צד אחד בלבד היה מחזיר את המזהה דרך הדלת האחורית.
     */
    const contents: GeminiContent[] = data.messages.map((m) => ({
      role: m.from === "assistant" ? "model" : "user",
      parts: [{ text: redactForAi(m.text) }],
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
  /**
   * האם הופק סיכום. **אינה הכרעה משפטית** — היא false רק כשחסם תפעולי
   * מנע את ההפקה (תקרת תיקים פתוחים). המערכת אינה דוחה פנייה לגופה.
   */
  validated: boolean;
  title: string;
  /** נבחר על ידי הפונה במסך נפרד; המערכת אינה מסווגת. ריק עד שיבחר. */
  category: string;
  summary: string;
  /** מה להביא לפגישה — נגזר ממה שהפונה עצמו הצהיר שקיים בידיו. */
  clientChecklist?: string[];
  /**
   * נחסם מסיבה שאינה משפטית (תקרת תיקים פתוחים). מוחזר ולא נזרק, כי
   * שגיאה זרוקה מגיעה למסך כ"משהו השתבש" — ואדם שסיפר עכשיו את כל
   * סיפורו ראוי לדעת בדיוק למה, ומה לעשות.
   */
  blocked?: "too_many_open";
}

/*
 * ═══ ממנוע הערכה למסכם עובדתי — 19/8/2026 ═══
 *
 * כאן ישבו שלושה פרומפטים: VALIDATION_SYSTEM ("מנוע הוולידציה
 * המשפטית"), MEMO_SYSTEM ("משפטן ישראלי בכיר") ו-VERDICT_SYSTEM
 * ("השופט הפנימי"). שלושתם קבעו עילה, החילו חוק, חישבו התיישנות
 * והכריעו אם יש תיק — כלומר ייחוד מקצוע לפי סעיף 20 לחוק לשכת
 * עורכי הדין.
 *
 * הסקירה המשפטית (19.8.2026) קבעה שאסור בשום נסיבות לקבוע דבר
 * הקשור לעילה, **וגם לא כטיוטה המיועדת לעורך הדין**. לכן אין כאן
 * "העברת דירה" של המנוע — הוא הוצא.
 *
 * מה שנשאר מותר במפורש (4.1): איסוף עובדות, ארגונן, ציר זמן,
 * וסיכום עובדתי **שהפונה בודק ומאשר**. התנאי: אין ברירה, השמטה או
 * הדגשה של עובדות על יסוד משמעותן המשפטית.
 *
 * הקטגוריה אינה נקבעת כאן. 4.2 מתיר ניתוב לפי "קטגוריה שהמשתמש
 * בחר"; הצעה אוטומטית מטקסט חופשי טעונה בחינה נוספת שטרם ניתנה.
 */
const SUMMARY_SYSTEM = `אתה מסכם עובדתי של JustAsk. קיבלת תיאור שאדם מסר על משהו שקרה לו, ואתה כותב ממנו סיכום מסודר שהוא עצמו יקרא, יערוך ויאשר.

## מה אתה מפיק
1. **כותרת** — משפט קצר ועובדתי שמתאר מה קרה. בלי הערכה ובלי מונח משפטי.
2. **סיכום** — העובדות שנמסרו, מסודרות וקריאות: מה קרה, מתי, איפה, מי היה מעורב, ומה קרה אחר כך. בלשון עניינית.
3. **רשימת הכנה** — מה כדאי להביא לפגישה, **אך ורק על סמך מה שהפונה עצמו הצהיר שקיים בידיו**. אל תוסיף פריטים שלא הזכיר.
4. **הצעת תחום** — בשדה suggestedCategory בלבד: התחום המתאים ביותר מתוך הרשימה הסגורה שבסוף. זו הצעת ניתוב ארגונית שהפונה יאשר או ישנה במסך הבחירה — לא קביעה משפטית. אל תזכיר את ההצעה בתוך הסיכום עצמו.

## הגבול המוחלט
אתה מארגן עובדות. אינך מנתח אותן.

אסור לחלוטין:
- לומר שיש או שאין עילה, תביעה, זכות, אחריות או בסיס משפטי
- להעריך סיכויים, שווי, פיצוי או כדאיות
- להזכיר התיישנות, מועדים או לחשב זמנים
- להפנות לחוק, לסעיף, לפסיקה או לתקנה
- לסווג את המקרה בתוך טקסט הסיכום או לומר איזה סוג הליך זה (הצעת התחום ניתנת אך ורק בשדה suggestedCategory)
- להמליץ על מסלול פעולה או על גורם שאליו לפנות
- לכתוב שהמקרה חזק, חלש, ברור, מורכב או כל תואר שמרמז על הערכה

**ואל תברור עובדות לפי חשיבותן המשפטית.** אם אדם סיפר שלושה דברים — שלושתם בסיכום, באותו משקל שבו סיפר אותם. אינך יודע מה חשוב משפטית, וזה בדיוק העניין.

## סגנון
עברית עניינית וברורה. בלי כותרות משנה ובלי מספור בתוך הסיכום — פסקאות רצות.
כתוב בגוף שלישי ("הפונה תיאר כי...") או בלשון סבילה. אל תשתמש במילים שהפונה לא אמר כדי לתאר את חומרת מה שקרה.
סימונים כמו [מספר זהות הוסר] הם הסרה יזומה של מזהים — התעלם מהם ואל תתייחס אליהם.

## פלט
JSON בלבד, בשדות: title, summary, parties, clientChecklist, suggestedCategory.
parties — מחרוזת קצרה של הצדדים המעורבים כפי שנמסרו, בשמותיהם אם נאמרו (למשל: "הפונה; סופרמרקט יוחננוף סניף חיפה"). זהו נתון עובדתי לבדיקת ניגוד עניינים אצל עורך הדין. אם לא נמסרו שמות — תאר תפקידים ("הפונה; בעל הדירה"). אל תמציא שמות.
clientChecklist הוא מערך של מחרוזות קצרות, או מערך ריק אם הפונה לא הצהיר על תיעוד כלשהו.
suggestedCategory — ערך אחד בדיוק מהרשימה: ${VALIDATION_CATEGORIES.join(" · ")}. אם אינך בטוח — "אחר".`;

export const validateCaseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ValidateInput)
  .handler(async ({ data }): Promise<ValidateResult> => {
    const {
      requireUser, adminGetCase, adminNotify, enforceDailyCap,
      adminPatch, adminUpdateCase, downloadImageBase64, notify, withErrorLog,
      countOpenCases, MAX_OPEN_CASES, OPEN_CASE_LIMIT_ENABLED, adminDeleteCase,
    } = await import("./server-admin");
    return withErrorLog("validateCase", async () => {
    const uid = await requireUser(data.idToken);
    await enforceDailyCap(uid, "validateCase");

    const raw = await adminGetCase(data.caseId);
    if (!raw) throw new Error("case not found");

    /*
     * תקרת תיקים פתוחים — נאכפת כאן ולא בדפדפן, כי זו ההגנה על תשומת
     * הלב של עורכי הדין. הספירה מחריגה את התיק הנוכחי (הוא כבר קיים
     * במצב validating), ולכן העובר הרביעי הוא זה שנעצר.
     */
    const open = OPEN_CASE_LIMIT_ENABLED
      ? await countOpenCases((raw as { clientId: string }).clientId)
      : 0;
    if (OPEN_CASE_LIMIT_ENABLED && open > MAX_OPEN_CASES) {
      /*
       * מוחקים את התיק שזה עתה נוצר.
       *
       * בלי זה הוא נשאר תקוע ב"בבדיקה" עם שדות ריקים — ומכיוון שהוא
       * עצמו נספר בתקרה, כל ניסיון חסום היה מקרב את המשתמש לחסימה
       * מוחלטת. הוא מעולם לא נבדק ואין בו תוכן; מחיקה היא האמת, ולא
       * סימון "נדחה" שמשמעותו 'לא נמצאה עילה'.
       */
      await adminDeleteCase(data.caseId).catch(() => {});
      return {
        validated: false,
        blocked: "too_many_open",
        title: "",
        category: "",
        summary: "",
        caseContext: "",
      };
    }
    const c = raw as {
      clientId: string;
      status?: string;
      description: string;
      incidentDate?: string;
      damageType?: string;
      hasDocumentation?: boolean;
      documents?: string[];
      title?: string;
      category?: string;
      summary?: string;
      caseContext?: string;
      recommendation?: string;
    };
    if (c.clientId !== uid) throw new Error("forbidden");

    /*
     * מחסום חזרתיות. בלעדיו אפשר היה להריץ את הבדיקה שוב על תיק שכבר הוכרע:
     * לגלגל מחדש תיק שנדחה עד שיאושר, או לאפס תיק מחובר בחזרה ל-matching.
     * תיק שכבר הוכרע מחזיר את ההכרעה השמורה במקום להישפט מחדש.
     */
    if (c.status && c.status !== "validating") {
      return {
        validated: c.status !== "rejected",
        title: c.title ?? "",
        category: c.category ?? "",
        summary: c.summary ?? "",
        caseContext: c.caseContext ?? "",
        recommendation: c.recommendation ?? "",
      };
    }

    /*
     * `c.description` נשמר ומוצג ללקוח כפי שנכתב — הניקוי כאן, בבנייה
     * של הטקסט שנשלח החוצה, ולא על מה שנשמר.
     */
    const caseText = `התאריך היום: ${new Date().toISOString().slice(0, 10)}
תיאור המקרה: ${redactForAi(c.description)}
תאריך האירוע: ${c.incidentDate || "לא צוין"}
סוג הנזק: ${c.damageType || "לא צוין"}
תיעוד שהפונה מצהיר שקיים בידיו: ${(c.documents ?? []).join(", ") || "לא צוין"}`;

    /*
     * התמונות ירדו מהמוצר (12/8/2026).
     *
     * עד כה נשלחו לכאן עד שלוש תמונות מקור של הפונה כראיות לתזכיר.
     * הפלטפורמה אינה מקבלת עוד קבצים — במקומן מגיעה **הצהרה** על מה
     * שקיים בידיו, והתזכיר נכתב מהעובדות שנמסרו בשיחה.
     */
      /*
       * קריאה אחת במקום שלוש (19/8/2026).
       *
       * קודם רצו כאן תזכיר, שופט שביקר אותו, והכרעה — שלוש קריאות
       * שכל תפקידן היה להגיע לפסיקה. עכשיו יש קריאה אחת שמארגנת
       * עובדות, ואין מה לבקר: אין הכרעה שאפשר לטעות בה.
       */
      const raw_summary = await generateDeep(
        [{ role: "user", parts: [{ text: caseText }] }],
        {
          system: SUMMARY_SYSTEM,
          temperature: 0.2,
          maxTokens: 4000,
          json: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              parties: { type: "string" },
              clientChecklist: { type: "array", items: { type: "string" } },
              suggestedCategory: { type: "string" },
            },
            required: ["title", "summary"],
          },
        },
      );

      const parsed = JSON.parse(raw_summary) as {
        title?: string;
        summary?: string;
        parties?: string;
        clientChecklist?: string[];
        suggestedCategory?: string;
      };

      const checklist = (parsed.clientChecklist ?? []).filter(
        (x) => typeof x === "string" && x.trim(),
      );

      const result: ValidateResult = {
        validated: true,
        title: parsed.title ?? "",
        // הקטגוריה נבחרת על ידי הפונה במסך נפרד — לא כאן
        category: "",
        summary: parsed.summary ?? "",
        clientChecklist: checklist,
      };

      /*
       * הסטטוס עובר ל-summary_ready ולא ל-matching.
       *
       * `matching` פירושו "פתוח לעיון בפיד", וחוקי המסד מתירים לעורך
       * דין מאושר לקרוא תיק במצב הזה. במתווה החדש התיק אינו נחשף
       * לאיש עד שהפונה בחר — ולכן הוא נעצר במצב שרק הוא רואה.
       */
      await adminUpdateCase(data.caseId, {
        title: result.title,
        summary: result.summary,
        /*
         * הצדדים נשמרים בנפרד מהסיכום: זה מה שעורך הדין מקבל בשלב א
         * של החשיפה המדורגת — בדיקת ניגוד עניינים על שמות בלבד, בלי
         * תיאור המקרה (סעיף 2.5 לסקירה).
         */
        parties: (parsed.parties ?? "").slice(0, 300),
        /*
         * הצעת תחום — 4.2 לסקירה מתיר קטגוריה כהצעה שהפונה מאשר.
         * מנורמלת לרשימה הסגורה; "אחר" אינו הצעה ולכן לא נשמר —
         * במקרה כזה הפונה בוחר לבד (הוחלט בבדיקה המשותפת, 21/8/2026).
         */
        ...(parsed.suggestedCategory &&
        normalizeCategory(parsed.suggestedCategory) !== "אחר"
          ? { suggestedCategory: normalizeCategory(parsed.suggestedCategory) }
          : {}),
        status: "summary_ready",
        summarizedAt: Date.now(),
      });

      if (checklist.length) {
        try {
          await adminUpdateCase(data.caseId, { clientChecklist: checklist });
        } catch {
          /* הרשימה היא תוספת — כשל לא יפיל את הפקת הסיכום */
        }
      }

      /*
       * ═══ ההפצה לעורכי דין הוסרה — 19/8/2026 ═══
       *
       * כאן רצו adminApprovedLawyerIds ו-adminNotifyMany: התיק נשלח
       * לכל עורכי הדין המאומתים בתחום, בלי שהפונה בחר אף אחד מהם.
       * זה בדיוק המנגנון שהסקירה מתארת כ"מסחר בפניות או מכרז על
       * לקוחות" (5.4), והוא לב האיסור שבכלל 11ב.
       *
       * במקומו: הפונה מאשר את הסיכום, בוחר תחום, מחפש באינדקס,
       * ופונה למי שהוא בחר. אין נמען שלא נבחר.
       */

      await notify(
        c.clientId,
        {
          title: "הסיכום שלך מוכן",
          body: "אפשר לעבור עליו, לתקן מה שצריך, ולבחור עורך דין.",
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
    const {
      requireUser, adminGetCase, adminGetDoc, recordLawyerResponse, notify,
      enforceDailyCap, withErrorLog,
    } = await import("./server-admin");
    return withErrorLog("notifyInterest", async () => {
      const uid = await requireUser(data.idToken);
      /*
       * התקרה כאן ולא על הכתיבה (18/8/2026): ההצעה עצמה נכתבת מהדפדפן
       * וחוקי המסד מגבילים אותה לעשר לתיק, כלומר עורך דין תופס מקום
       * אחד ואינו חוסם. מה שלא היה חסום זו **ההתראה** — והיא מגיעה
       * לפונה עצמו, על כל תיק בפיד, בלי גבול. זה הנתיב שמציף אדם אמיתי.
       */
      await enforceDailyCap(uid, "notifyInterest");
      const c = await adminGetCase(data.caseId);
      if (!c) return { sent: false };

      const interestedIds = (c.interestedIds as string[] | undefined) ?? [];
      if (!interestedIds.includes(uid)) return { sent: false };

      /*
       * מדד התגובתיות נמדד מהרגע שהתיק נעשה זמין *לעורך הדין הזה* —
       * המאוחר מבין פתיחת התיק ואישור האימות שלו.
       *
       * בלי זה עורך דין שמצטרף היום ורואה backlog של תיקים בני שבועיים
       * מקבל מיד ציון תגובתיות נורא, על זמן שבו הוא לא היה רשום ולא
       * יכול היה להגיב. זה מדד שמוצג ללקוחות ומשפיע על בחירה.
       */
      const caseOpenedAt = Number(c.validatedAt ?? c.createdAt ?? 0);
      const ver = await adminGetDoc(`verifications/${encodeURIComponent(uid)}`);
      const approvedAt = Number(ver?.reviewedAt ?? 0);
      const baseline = Math.max(caseOpenedAt, approvedAt);
      if (baseline > 0) await recordLawyerResponse(uid, Date.now() - baseline);

      await notify(
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


/* ---------- דירוג עורך הדין אחרי סיום התיק ---------- */

export interface RateInput {
  caseId: string;
  stars: number;
  note: string;
  idToken: string;
}

/**
 * הלקוח מדרג את עורך הדין שבחר.
 *
 * הדירוג הוא הקצה השני של הלולאה: בלעדיו הפירמידה שתכננו ל-Pro אין לה
 * על מה להתבסס, ו-rating נשאר 0 לנצח. הכתיבה בשרת ולא בדפדפן כי זהו
 * נתון שמוצג ללקוחות אחרים — כל נתיב כתיבה מהלקוח היה ניתן לניפוח.
 *
 * מותר רק לבעל התיק, רק על עורך הדין שהוא באמת בחר, ורק פעם אחת לתיק.
 */
export const rateLawyerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as RateInput)
  .handler(async ({ data }): Promise<{ saved: boolean }> => {
    const { requireUser, adminGetCase, recordLawyerRating, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("rateLawyer", async () => {
      const uid = await requireUser(data.idToken);
      const c = await adminGetCase(data.caseId);
      if (!c) return { saved: false };
      if (c.clientId !== uid) throw new Error("forbidden");

      const lawyerId = c.chosenLawyerId as string | undefined;
      if (!lawyerId) return { saved: false };

      await recordLawyerRating(
        data.caseId,
        lawyerId,
        uid,
        Number(data.stars) || 0,
        String(data.note ?? ""),
      );
      return { saved: true };
    });
  });

/* ---------- ספירת תיקים פתוחים (לעו"ד שטרם אומת) ---------- */

export interface OpenCountsResult {
  total: number;
  byCategory: { category: string; count: number }[];
}

/**
 * כמה תיקים פתוחים יש, לפי תחום — בלי שום תוכן.
 *
 * מוחזר גם למי שטרם אומת, ולכן מכוון להיות חסין: מספרים בלבד, אין
 * כותרות, אין תיאורים, אין ערים ואין תאריכים. מי שקורא את התשובה
 * הזו לא יכול ללמוד דבר על אף אדם.
 */
/* ---------- מודל הניסיון: רישום חיבור ---------- */

export interface RecordConnectionInput {
  caseId: string;
  idToken: string;
}

/**
 * הלקוח בחר עורך דין — רושמים את החיבור אצלו.
 *
 * בשרת ולא בדפדפן, כי המונה הזה קובע מתי הניסיון נגמר. הקריאה נעשית
 * ע"י הלקוח (הוא זה שבחר), והשרת מאמת שהוא באמת בעל התיק ושעורך הדין
 * שנרשם הוא באמת זה שנבחר — כלומר עורך דין לא יכול לזייף חיבור לעצמו,
 * ולקוח לא יכול "לשרוף" את המכסה של עורך דין אחר.
 */
interface ApproveSummaryInput {
  caseId: string;
  idToken?: string;
  /** הסיכום כפי שהפונה ערך אותו. ריק = משאיר כפי שהופק. */
  summary?: string;
  /** התחום שהפונה בחר. חייב להיות מהרשימה המוכרת. */
  category: string;
}

/**
 * אישור הסיכום ובחירת התחום — הרגע שבו הפונה מאשר את מה שייצא ממנו.
 *
 * ═══ למה בשרת ולא מהדפדפן (20/8/2026) ═══
 *
 * חוקי המסד מתירים ללקוח לכתוב על התיק שלו רק clientContact,
 * chosenLawyerId ו-status. זה מכוון: סיכום שהלקוח כותב חופשי הוא גם
 * הדרך הפשוטה ביותר להבריח לתוכו מספר טלפון ולעקוף את ההבטחה
 * שפרטי קשר נחשפים רק אחרי בחירה. לכן הכתיבה עוברת כאן, והטקסט
 * מנוקה בדיוק כמו הצעת שכר טרחה.
 *
 * העריכה עצמה אינה ויתור אלא דרישה: הסקירה המשפטית מתנה את הסיכום
 * העובדתי בכך שהפונה **בודק ומאשר** אותו (4.1). מה שיוצג לעורך הדין
 * הוא מה שהאדם אישר, לא מה שמכונה כתבה עליו.
 *
 * הקטגוריה נבחרת כאן ולא על ידי המודל: 4.2 מתיר ניתוב לפי "קטגוריה
 * שהמשתמש בחר", והצעה אוטומטית מטקסט חופשי טעונה בחינה נוספת שטרם
 * ניתנה.
 */
export interface IndexLawyer {
  uid: string;
  name: string;
  specialties: string[];
  city?: string;
  languages?: string[];
  barYear?: string;
  photoUrl?: string;
  bio?: string;
}

/**
 * האינדקס — עורכי דין מאושרים בתחום שהפונה בחר.
 *
 * ═══ למה בשרת ולא בשאילתת לקוח (20/8/2026) ═══
 *
 * "מאושר" נקבע ב-verifications/{uid}, שקריא רק לבעליו ולאדמין —
 * ובצדק: אין סיבה שכל מחובר ידע מי נדחה. לכן הסינון חייב לרוץ כאן,
 * עם הרשאות שרת. זו גם נקודת האכיפה של "הפסקת מנוי — הסרה מהאינדקס"
 * כשיהיה חיוב.
 *
 * הסדר אלפביתי, והמסך אומר זאת: הסקירה דורשת מתודולוגיה גלויה ואוסרת
 * סדר שמרמז על העדפה מקצועית (5.3). א-ב הוא הסדר היחיד שאין בו טענה.
 */
export const indexLawyersFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { category: string; idToken?: string })
  .handler(async ({ data }): Promise<{ lawyers: IndexLawyer[] }> => {
    const { requireUser, adminApprovedLawyerIds, adminGetDoc, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("indexLawyers", async () => {
      await requireUser(data.idToken);
      const ids = await adminApprovedLawyerIds(data.category);
      const out: IndexLawyer[] = [];
      for (const uid of ids) {
        const p = await adminGetDoc(`lawyerProfiles/${encodeURIComponent(uid)}`);
        if (!p?.name) continue;
        out.push({
          uid,
          name: String(p.name),
          specialties: (p.specialties as string[] | undefined) ?? [],
          city: p.city ? String(p.city) : undefined,
          languages: (p.languages as string[] | undefined) ?? undefined,
          barYear: p.barYear ? String(p.barYear) : undefined,
          photoUrl: p.photoUrl ? String(p.photoUrl) : undefined,
          bio: p.bio ? String(p.bio) : undefined,
        });
      }
      out.sort((a, b) => a.name.localeCompare(b.name, "he"));
      return { lawyers: out };
    });
  });

/** כמה פניות פעילות מותר לפונה במקביל — ההכרעה מהפגישה: "לבחור מספר". */
export const MAX_ACTIVE_REFERRALS = 3;

interface RequestReferralInput {
  caseId: string;
  lawyerUid: string;
  /*
   * הסכמה מראש לשיתוף הסיכום: אם עורך הדין יאשר זמינות, הסיכום נחשף
   * אוטומטית בלי סבב אישור נוסף. ברירת המחדל במסך דלוקה, וההסכמה
   * מפורשת — הפונה רואה את הנוסח ליד תיבת הסימון בזמן השליחה.
   * (הוחלט בבדיקה המשותפת 21/8/2026; לאשרור מול עו"ד נתן לפני השקה.)
   */
  autoShare?: boolean;
  idToken?: string;
}

/**
 * פנייה לעורך דין שהפונה בחר — שלב א של החשיפה המדורגת.
 *
 * ═══ המבנה כולו נגזר מהסקירה (20/8/2026) ═══
 *
 * מסמך הפנייה מכיל **העתק** של מה שמותר לעורך הדין לראות בכל שלב,
 * כך שהוא לעולם אינו קורא את מסמך התיק עצמו: בשלב א — הצדדים לבדיקת
 * ניגוד, תחום, עיר וחודש האירוע. בלי תיאור, בלי סיכום, בלי שם הפונה
 * (סעיף 2.5). הסיכום המלא יועתק פנימה רק כשהפונה יאשר במפורש — שלב ב.
 *
 * הכתיבה בשרת בלבד, משלוש סיבות: מכסת שלוש פניות פעילות היא ספירה
 * שחוקי מסד אינם יודעים לאכוף; המזהה הדטרמיניסטי caseId_lawyerUid
 * מונע פנייה כפולה לאותו עורך דין; וההעתק חייב להיבנות ממה שבאמת
 * שמור על התיק, לא ממה שהדפדפן שולח.
 *
 * חלון המענה 48 שעות (ש·10 מהפגישה): פקיעה אינה מעבירה לאיש — הפונה
 * מקבל הודעה וחוזר לבחור. אין העברה אוטומטית (5.5).
 */
export const requestReferralFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as RequestReferralInput)
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: string }> => {
    const {
      requireUser, adminGetCase, adminGetDoc, adminPatch, adminQueryIds,
      adminNotify, notify, withErrorLog,
    } = await import("./server-admin");
    return withErrorLog("requestReferral", async () => {
      const uid = await requireUser(data.idToken);
      const c = await adminGetCase(data.caseId);
      if (!c || c.clientId !== uid) throw new Error("forbidden");
      if (c.status !== "awaiting_selection") {
        return { ok: false, reason: "case_not_ready" };
      }

      const ver = await adminGetDoc(`verifications/${encodeURIComponent(data.lawyerUid)}`);
      if (ver?.status !== "approved") return { ok: false, reason: "lawyer_not_available" };

      const refId = `${data.caseId}_${data.lawyerUid}`;
      const existing = await adminGetDoc(`referrals/${refId}`);
      if (existing) return { ok: false, reason: "already_sent" };

      /*
       * המכסה נספרת על פניות שעודן פעילות — ממתינות או שנוקו לניגוד.
       * דחויות ופקועות אינן תופסות מקום: הפונה שנדחה חוזר לבחור.
       */
      const all = await adminQueryIds("referrals", "caseId", data.caseId);
      let active = 0;
      for (const id of all) {
        const r = await adminGetDoc(`referrals/${id}`);
        if (!r) continue;
        /* פנייה שחלונה חלף אינה תופסת מקום — הפונה כבר חופשי להמשיך */
        const waiting = r.status === "names_check" && Date.now() <= Number(r.expiresAt ?? 0);
        if (waiting || r.status === "cleared" || r.status === "details_shared") {
          active++;
        }
      }
      if (active >= MAX_ACTIVE_REFERRALS) return { ok: false, reason: "limit" };

      const profile = await adminGetDoc(`lawyerProfiles/${encodeURIComponent(data.lawyerUid)}`);
      const now = Date.now();
      await adminPatch(`referrals/${refId}`, {
        lawyerName: String(profile?.name ?? ""),
        caseId: data.caseId,
        clientId: uid,
        lawyerId: data.lawyerUid,
        status: "names_check",
        /* שלב א — מה שעורך הדין רואה, וזה בלבד */
        category: String(c.category ?? ""),
        city: String(c.city ?? ""),
        incidentMonth: String(c.incidentDate ?? "").slice(0, 7),
        parties: String(c.parties ?? ""),
        /*
         * מטא-נתונים ולא נרטיב (21/8/2026): סוג הפגיעה ואילו תיעודים
         * הפונה הצהיר שקיימים. נותנים לעורך הדין תחושה של "מה זה"
         * בלי עובדה אחת מהסיפור — הסיפור נחשף רק אחרי אישור הזמינות.
         */
        damageType: String(c.damageType ?? ""),
        documents: Array.isArray(c.documents) ? (c.documents as unknown[]).map(String).slice(0, 8) : [],
        caseTitle: "",
        summary: "",
        autoShare: !!data.autoShare,
        createdAt: now,
        expiresAt: now + 48 * 60 * 60 * 1000,
      });

      /* פוש/מייל — ולצידם רשומת פעמון, למי שאין לו פוש */
      await notify(
        data.lawyerUid,
        {
          title: "פנייה חדשה ממתינה לבדיקת ניגוד עניינים",
          body: "מישהו בחר בך מהאינדקס. בדוק ניגוד עניינים והשב בתוך 48 שעות.",
          link: "/lawyer",
        },
        "lawyerInterest",
      );
      await adminNotify(data.lawyerUid, {
        type: "referral",
        caseId: data.caseId,
        title: "פנייה חדשה ממתינה לבדיקתך",
        body: "מישהו בחר בך מהאינדקס. בדוק ניגוד עניינים והשב בתוך 48 שעות.",
        titleKey: "notifRefNewTitle",
        bodyKey: "notifRefNewBody",
      });

      return { ok: true };
    });
  });

interface RespondReferralInput {
  referralId: string;
  /** cleared = אין ניגוד וזמין · declined = אינו זמין */
  answer: "cleared" | "declined";
  idToken?: string;
}

/**
 * מענה עורך הדין על שלב א — בדיקת הניגוד.
 *
 * "cleared" הוא הצהרה כפולה: בדק ניגוד עניינים על שמות הצדדים ולא
 * מצא, והוא זמין לפנייה. "declined" מנוסח כלפי הפונה כ"אינו זמין"
 * בלבד — לעולם לא "דחה" (ש·10): ההבדל בין ניסוח לניסוח הוא ההבדל
 * בין פונה שממשיך לעורך הדין הבא לבין פונה שמסיק שאין לו תיק.
 *
 * אחרי החלון — הפנייה פקעה ואי אפשר לענות עליה: מענה מאוחר היה
 * מפתיע פונה שכבר המשיך הלאה.
 */
export const respondReferralFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as RespondReferralInput)
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: string }> => {
    const { requireUser, adminGetDoc, adminGetCase, adminPatch, adminNotify, notify, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("respondReferral", async () => {
      const uid = await requireUser(data.idToken);
      const r = await adminGetDoc(`referrals/${encodeURIComponent(data.referralId)}`);
      if (!r || r.lawyerId !== uid) throw new Error("forbidden");
      if (r.status !== "names_check") return { ok: false, reason: "not_pending" };
      if (Date.now() > Number(r.expiresAt ?? 0)) {
        await adminPatch(`referrals/${encodeURIComponent(data.referralId)}`, { status: "expired" });
        return { ok: false, reason: "expired" };
      }

      /*
       * שיתוף אוטומטי: הפונה הסכים מראש, בשליחה, שאישור זמינות חושף
       * את הסיכום מיד — סבב אחד פחות. בלי ההסכמה: העצירה הידנית נשארת.
       */
      const autoShare = data.answer === "cleared" && r.autoShare === true;
      let shared = false;
      if (autoShare) {
        const c = await adminGetCase(String(r.caseId));
        if (c) {
          await adminPatch(`referrals/${encodeURIComponent(data.referralId)}`, {
            status: "details_shared",
            caseTitle: String(c.title ?? ""),
            summary: String(c.summary ?? ""),
            respondedAt: Date.now(),
            sharedAt: Date.now(),
            autoShared: true,
          });
          shared = true;
        }
      }
      if (!shared) {
        await adminPatch(`referrals/${encodeURIComponent(data.referralId)}`, {
          status: data.answer,
          respondedAt: Date.now(),
        });
      }

      await notify(
        String(r.clientId),
        shared
          ? {
              title: "עורך הדין זמין — הסיכום שותף",
              body: "הוא אישר זמינות, והסיכום שותף אוטומטית לפי אישורך. נעדכן כשתגיע הצעת שכר טרחה.",
              link: `/case/${String(r.caseId)}`,
            }
          : data.answer === "cleared"
          ? {
              title: "עורך הדין זמין לפנייתך",
              body: "הוא בדק ניגוד עניינים ואישר זמינות. עכשיו תורך: אשר את שיתוף הסיכום.",
              link: `/case/${String(r.caseId)}`,
            }
          : {
              title: "עורך הדין אינו זמין לפנייה זו",
              body: "אפשר לחזור לאינדקס ולבחור עורך דין אחר.",
              link: `/choose/${String(r.caseId)}`,
            },
        "caseUpdates",
      );
      await adminNotify(
        String(r.clientId),
        shared
          ? {
              type: "caseUpdate",
              caseId: String(r.caseId),
              title: "עורך הדין זמין — הסיכום שותף",
              body: "הוא אישר זמינות, והסיכום שותף אוטומטית לפי אישורך. נעדכן כשתגיע הצעת שכר טרחה.",
              titleKey: "notifRefAutoTitle",
              bodyKey: "notifRefAutoBody",
            }
          : data.answer === "cleared"
          ? {
              type: "caseUpdate",
              caseId: String(r.caseId),
              title: "עורך הדין זמין לפנייתך",
              body: "הוא בדק ניגוד עניינים ואישר זמינות. עכשיו תורך: אשר את שיתוף הסיכום.",
              titleKey: "notifRefClearedTitle",
              bodyKey: "notifRefClearedBody",
            }
          : {
              type: "caseUpdate",
              caseId: String(r.caseId),
              title: "עורך הדין אינו זמין לפנייה זו",
              body: "אפשר לחזור לאינדקס ולבחור עורך דין אחר.",
              titleKey: "notifRefDeclinedTitle",
              bodyKey: "notifRefDeclinedBody",
            },
      );
      return { ok: true };
    });
  });

interface ShareSummaryInput {
  referralId: string;
  idToken?: string;
}

/**
 * שלב ב — הפונה מאשר את שיתוף הסיכום עם עורך הדין שאישר זמינות.
 *
 * ההעתקה נעשית כאן, מהתיק אל מסמך הפנייה, ורק עכשיו: זו ליבת
 * החשיפה המדורגת (2.5) — עורך הדין לא רואה את התיאור עד שהפונה,
 * אחרי שידע שאין ניגוד ושעורך הדין זמין, אומר במפורש "שתף".
 */
export const shareSummaryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ShareSummaryInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { requireUser, adminGetDoc, adminGetCase, adminPatch, adminNotify, notify, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("shareSummary", async () => {
      const uid = await requireUser(data.idToken);
      const r = await adminGetDoc(`referrals/${encodeURIComponent(data.referralId)}`);
      if (!r || r.clientId !== uid) throw new Error("forbidden");
      if (r.status !== "cleared") return { ok: false };

      const c = await adminGetCase(String(r.caseId));
      if (!c) return { ok: false };

      await adminPatch(`referrals/${encodeURIComponent(data.referralId)}`, {
        status: "details_shared",
        caseTitle: String(c.title ?? ""),
        summary: String(c.summary ?? ""),
        sharedAt: Date.now(),
      });

      await notify(
        String(r.lawyerId),
        {
          title: "הפונה שיתף את סיכום המקרה",
          body: "הסיכום המלא זמין לעיונך. אפשר להגיש הצעת שכר טרחה.",
          link: "/lawyer",
        },
        "lawyerInterest",
      );
      await adminNotify(String(r.lawyerId), {
        type: "summary_shared",
        caseId: String(r.caseId),
        title: "הפונה שיתף את סיכום המקרה",
        body: "הסיכום המלא זמין לעיונך. אפשר להגיש הצעת שכר טרחה.",
        titleKey: "notifRefSharedTitle",
        bodyKey: "notifRefSharedBody",
      });
      return { ok: true };
    });
  });

interface ReferralOfferInput {
  referralId: string;
  amount: number;
  model: string;
  note?: string;
  idToken?: string;
}

/**
 * הצעת שכר טרחה על פנייה — פרטנית, לפונה בלבד.
 *
 * ההצעה יושבת על מסמך הפנייה ולא בפומבי: אסור לפרסם מחירים (2.3),
 * והפלטפורמה מציגה את ההצעות זו לצד זו בלי לדרג ובלי לסמן "מומלץ"
 * (נספח א·8). הטקסט החופשי מנוקה מפרטי קשר — התקשורת עד החיבור
 * עוברת דרך המערכת, ופרטי הקשר נחשפים רק אחרי הבחירה.
 */
export const submitReferralOfferFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ReferralOfferInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { requireUser, adminGetDoc, adminPatch, adminNotify, notify, withErrorLog } =
      await import("./server-admin");
    const { stripContactInfo: strip } = await import("../privacy");
    return withErrorLog("submitReferralOffer", async () => {
      const uid = await requireUser(data.idToken);
      const r = await adminGetDoc(`referrals/${encodeURIComponent(data.referralId)}`);
      if (!r || r.lawyerId !== uid) throw new Error("forbidden");
      if (r.status !== "details_shared") return { ok: false };

      const profile = await adminGetDoc(`lawyerProfiles/${encodeURIComponent(uid)}`);
      await adminPatch(`referrals/${encodeURIComponent(data.referralId)}`, {
        offerAmount: Math.max(0, Math.round(Number(data.amount) || 0)),
        offerModel: String(data.model ?? "").slice(0, 60),
        offerNote: strip(String(data.note ?? "")).slice(0, 500),
        lawyerName: String(profile?.name ?? ""),
        offeredAt: Date.now(),
      });

      /*
       * פרטי הקשר של עורך הדין נכתבים לתת-האוסף שהחוקים כבר שומרים:
       * הפונה יקרא אותם רק אחרי שיבחר בו (chosenLawyerId). כך חילופי
       * הקשר עובדים בדיוק כמו קודם — בלי לפתוח שום דלת חדשה.
       */
      const contact = await adminGetDoc(`lawyerContacts/${encodeURIComponent(uid)}`);
      if (contact) {
        await adminPatch(
          `cases/${encodeURIComponent(String(r.caseId))}/contacts/${encodeURIComponent(uid)}`,
          {
            fullName: String(contact.fullName ?? profile?.name ?? ""),
            phone: String(contact.phone ?? ""),
            email: String(contact.email ?? ""),
          },
        );
      }

      await notify(
        String(r.clientId),
        {
          title: "התקבלה הצעת שכר טרחה",
          body: "עורך הדין הגיש הצעה לפנייתך. היכנסו להשוות ולבחור.",
          link: `/case/${String(r.caseId)}`,
        },
        "caseUpdates",
      );
      await adminNotify(String(r.clientId), {
        type: "offer",
        caseId: String(r.caseId),
        title: "התקבלה הצעת שכר טרחה",
        body: "עורך הדין הגיש הצעה לפנייתך. היכנסו להשוות ולבחור.",
        titleKey: "notifRefOfferTitle",
        bodyKey: "notifRefOfferBody",
      });
      return { ok: true };
    });
  });

export const approveSummaryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ApproveSummaryInput)
  .handler(async ({ data }): Promise<{ ok: boolean; category: string }> => {
    const { requireUser, adminGetCase, adminUpdateCase, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("approveSummary", async () => {
      const uid = await requireUser(data.idToken);
      const c = await adminGetCase(data.caseId);
      if (!c || c.clientId !== uid) throw new Error("forbidden");
      if (c.status !== "summary_ready") {
        // כבר אושר, או שהתיק במצב אחר — לא דורסים
        return { ok: false, category: String(c.category ?? "") };
      }

      const category = normalizeCategory(data.category);
      const edited = (data.summary ?? "").trim();
      const fields: Record<string, string | number> = {
        category,
        status: "awaiting_selection",
        summaryApprovedAt: Date.now(),
      };
      if (edited) fields.summary = stripContactInfo(edited).slice(0, 6000);

      await adminUpdateCase(data.caseId, fields);
      return { ok: true, category };
    });
  });

interface ChangeCategoryInput {
  caseId: string;
  category: string;
  idToken?: string;
}

/**
 * שינוי תחום אחרי האישור — הפונה מול אינדקס ריק.
 *
 * נולד בבדיקה המשותפת (21/8/2026): תיק צרכנות מול אינדקס שבו רק עורך
 * דין לנזיקין — מסך ריק בלי שום המשך. ההבטחה שבמסך הסיכום ("אפשר
 * לשנות אותה בכל שלב") לא הייתה ממומשת בשום מקום.
 *
 * בשרת ולא בדפדפן — הלקוח אינו רשאי לכתוב category (חוקי המסד).
 * מותר רק בשלב הבחירה: אחרי חיבור אין משמעות לשינוי, והפניות שכבר
 * נשלחו נושאות את התחום שלהן כצילום ואינן מושפעות.
 */
export const changeCategoryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ChangeCategoryInput)
  .handler(async ({ data }): Promise<{ ok: boolean; category: string }> => {
    const { requireUser, adminGetCase, adminUpdateCase, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("changeCategory", async () => {
      const uid = await requireUser(data.idToken);
      const c = await adminGetCase(data.caseId);
      if (!c || c.clientId !== uid) throw new Error("forbidden");
      if (c.status !== "awaiting_selection") {
        return { ok: false, category: String(c.category ?? "") };
      }
      const category = normalizeCategory(data.category);
      await adminUpdateCase(data.caseId, { category });
      return { ok: true, category };
    });
  });

export const recordConnectionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as RecordConnectionInput)
  .handler(async ({ data }): Promise<{ connections: number }> => {
    const {
      requireUser, adminGetCase, adminGetDoc, adminPatch, adminQueryIds,
      adminNotify, notify, recordConnection, withErrorLog,
    } = await import("./server-admin");
    return withErrorLog("recordConnection", async () => {
      const uid = await requireUser(data.idToken);
      const c = await adminGetCase(data.caseId);
      if (!c || c.clientId !== uid) return { connections: 0 };
      const lawyerId = c.chosenLawyerId as string | undefined;
      if (!lawyerId) return { connections: 0 };
      const n = await recordConnection(lawyerId, data.caseId);

      /* הרגע הגדול של עורך הדין — פוש, לא רק פעמון (הפעמון נכתב בצד הלקוח) */
      await notify(
        lawyerId,
        {
          title: "לקוח בחר בך!",
          body: "פרטי הקשר זמינים בתיק. זה הזמן להרים טלפון.",
          link: `/lawyer-case/${data.caseId}`,
        },
        "lawyerInterest",
      );

      /*
       * סגירת הפניות האחיות — כי שתיקה גרועה מ"לא".
       *
       * עורך דין שבדק ניגוד או הגיש הצעה לומד את התשובה מהיעדרה אם לא
       * נסגור: הפנייה קופאת אצלו כ"ממתינה" לנצח, ומי שמגלה לבד שהפסיד
       * מפסיק להגיש הצעות. הסגירה בשרת — הדפדפן אינו רשאי לכתוב הפניות.
       */
      const ids = await adminQueryIds("referrals", "caseId", data.caseId);
      for (const id of ids) {
        const r = await adminGetDoc(`referrals/${encodeURIComponent(id)}`);
        if (!r || r.lawyerId === lawyerId) continue;
        if (r.status === "names_check" || r.status === "cleared" || r.status === "details_shared") {
          await adminPatch(`referrals/${encodeURIComponent(id)}`, {
            status: "closed",
            closedAt: Date.now(),
          });
          /* פעמון בלבד, בלי פוש — בשורה שלילית לא מצדיקה צלצול */
          await adminNotify(String(r.lawyerId), {
            type: "referral_closed",
            caseId: data.caseId,
            title: "הפנייה נסגרה",
            body: "הפונה התקדם עם עורך דין אחר. זה לא אומר דבר על המענה שלך.",
            titleKey: "notifRefClosedTitle",
            bodyKey: "notifRefClosedBody",
          });
        }
      }

      return { connections: n };
    });
  });

export const openCaseCountsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { idToken: string })
  .handler(async ({ data }): Promise<OpenCountsResult> => {
    const { requireUser, adminOpenCaseCounts, withErrorLog } = await import("./server-admin");
    return withErrorLog("openCaseCounts", async () => {
      await requireUser(data.idToken);
      const counts = await adminOpenCaseCounts();
      const byCategory = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
      return {
        total: byCategory.reduce((n, c) => n + c.count, 0),
        byCategory,
      };
    });
  });

/* ---------- בדיקת מסמכי האימות ---------- */

export interface DocCheckInput {
  targetUid: string;
  idToken: string;
}

export interface DocCheckField {
  /** מה שהוקלד בטופס */
  typed: string;
  /** מה שנקרא מהמסמך — ריק אם לא נמצא */
  found: string;
  status: "match" | "mismatch" | "missing";
}

export interface DocCheckResult {
  ran: boolean;
  /** האם הקובץ נראה כמו סוג המסמך שהוא אמור להיות */
  barCardLooksReal: boolean;
  diplomaLooksReal: boolean;
  fields: Record<string, DocCheckField>;
  /** הערה חופשית קצרה של הבודק — מה שראוי לתשומת לב */
  note: string;
}

const DOC_CHECK_SYSTEM = `אתה בודק מסמכים של פלטפורמה משפטית ישראלית. קיבלת שני צילומים שעורך דין העלה — תעודת חבר בלשכת עורכי הדין ותעודת בוגר במשפטים — ואת הפרטים שהוא הקליד בטופס.

תפקידך אחד בלבד: **לקרוא מה כתוב במסמכים ולהשוות למה שהוקלד.** אינך מאמת מול הלשכה ואינך קובע אם התעודה אותנטית — אתה קורא ומצליב.

לכל שדה קבע:
- "match" — הערך במסמך תואם למה שהוקלד (התעלם מהבדלי רווחים, ניקוד, "עו״ד" בתחילת שם)
- "mismatch" — הערך במסמך שונה בבירור
- "missing" — לא הצלחת לקרוא את הערך מהמסמך

השדות: fullName, idNumber, barNumber, barYear, university, gradYear.

בנוסף:
- barCardLooksReal — האם התמונה אכן נראית כתעודת חבר לשכת עורכי הדין (ולא צילום מסך אקראי, סלפי, או מסמך אחר)
- diplomaLooksReal — האם התמונה אכן נראית כתעודת סיום תואר במשפטים
- note — משפט אחד קצר בעברית על מה שראוי לתשומת לב האדם שיאשר. אם הכול תקין: "לא נמצאו אי-התאמות".

השב JSON בלבד.`;

/**
 * בדיקת המסמכים שהועלו — לעיני האדם שמאשר.
 *
 * ⚠️ מה זה לא: **אין כאן אימות מול לשכת עורכי הדין.** בדקנו — הדאטאסט
 * הפתוח של חברי הלשכה עודכן לאחרונה בינואר 2023, ולכן עורך דין שהוסמך
 * מאז היה נדחה בטעות ומי שהושעה מאז היה עובר. הפנקס החי חוסם גישה
 * אוטומטית. אימות מול מקור סמכותי נשאר פעולה אנושית.
 *
 * מה זה כן: קריאה אמיתית של המסמכים והצלבה מול מה שהוקלד. זה תופס
 * טעויות הקלדה, קובץ שהועלה בטעות וזיוף רשלני — ומקצר את הבדיקה
 * האנושית מחמש דקות לעשר שניות. וזו הפעם הראשונה שמסך "הבדיקה
 * החכמה" מתאר משהו שבאמת קורה.
 */
export const checkVerificationDocsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as DocCheckInput)
  .handler(async ({ data }): Promise<DocCheckResult> => {
    const { requireIdentity, adminGetDoc, downloadImageBase64, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("checkVerificationDocs", async () => {
      const me = await requireIdentity(data.idToken);
      if (!["justask.adv@gmail.com", "dvirsb@gmail.com"].includes(me.email)) {
        throw new Error("forbidden");
      }

      const empty: DocCheckResult = {
        ran: false,
        barCardLooksReal: false,
        diplomaLooksReal: false,
        fields: {},
        note: "",
      };

      const rec = await adminGetDoc(`verifications/${encodeURIComponent(data.targetUid)}`);
      if (!rec) return empty;
      const files = (rec.files ?? {}) as { barCard?: string; diploma?: string };

      const parts: GeminiPart[] = [];
      const barCard = files.barCard ? await downloadImageBase64(files.barCard) : null;
      const diploma = files.diploma ? await downloadImageBase64(files.diploma) : null;
      if (barCard) parts.push({ inline_data: { mime_type: "image/jpeg", data: barCard } });
      if (diploma) parts.push({ inline_data: { mime_type: "image/jpeg", data: diploma } });
      // בלי מסמך אחד לפחות אין מה לקרוא — ולא נמציא תשובה
      if (!parts.length) return empty;

      const typed = {
        fullName: String(rec.fullName ?? ""),
        idNumber: String(rec.idNumber ?? ""),
        barNumber: String(rec.barNumber ?? ""),
        barYear: String(rec.barYear ?? ""),
        university: String(rec.university ?? ""),
        gradYear: String(rec.gradYear ?? ""),
      };
      parts.push({
        text: `הפרטים שהוקלדו בטופס:\n${JSON.stringify(typed, null, 1)}\n\nהתמונה הראשונה היא תעודת הלשכה; השנייה (אם קיימת) היא תעודת הבוגר.`,
      });

      const raw = await generate([{ role: "user", parts }], {
        system: DOC_CHECK_SYSTEM,
        json: true,
        temperature: 0.1,
      });
      try {
        const parsed = JSON.parse(raw) as Omit<DocCheckResult, "ran">;
        return { ...parsed, ran: true };
      } catch {
        return empty;
      }
    });
  });

/* ---------- הודעה לעורך דין על החלטת אימות ---------- */

export interface VerificationDecisionInput {
  targetUid: string;
  approved: boolean;
  idToken: string;
}

/**
 * הודעה לאדמין שעורך דין הגיש בקשת אימות.
 *
 * בלעדיה הבקשה יושבת בתור ואיש אינו יודע — הגילוי תלוי בכך שמישהו
 * במקרה ייכנס למסך האדמין. עורך דין שגויס אישית וממתין יומיים בשקט
 * הוא עורך דין שלא יחזור.
 *
 * הקריאה מגיעה מעורך הדין עצמו, ולכן היא מאמתת שקיימת לו באמת בקשה
 * ממתינה — אחרת כל משתמש מחובר היה יכול להציף את האדמין בהתראות.
 */
export const notifySubmissionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { idToken: string })
  .handler(async ({ data }): Promise<{ sent: boolean }> => {
    const { requireIdentity, adminGetDoc, notify, uidByEmail, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("notifySubmission", async () => {
      const me = await requireIdentity(data.idToken);
      const ver = await adminGetDoc(`verifications/${encodeURIComponent(me.uid)}`);
      if (!ver || ver.status !== "pending") return { sent: false };

      const adminUid = await uidByEmail("justask.adv@gmail.com");
      if (!adminUid) return { sent: false };

      const name = typeof ver.fullName === "string" ? ver.fullName : "עורך דין";
      await notify(adminUid, {
        title: "בקשת אימות חדשה",
        body: `${name} הגיש/ה מסמכים לאימות`,
        link: "/admin/verifications",
      });
      return { sent: true };
    });
  });

/**
 * דחיפה החוצה על החלטת האימות.
 *
 * ההחלטה עצמה נכתבת מהדפדפן (נאכף בחוקים, ומכוסה בבדיקות), אבל התראה
 * בתוך האפליקציה בלבד פירושה שעורך דין שהמתין יומיים יגלה שאושר רק אם
 * במקרה ייכנס. זה בדיוק האדם שגייסנו אישית — הוא צריך לדעת מיד.
 *
 * לעולם לא זורקת: אישור שהצליח לא ייראה ככישלון בגלל התראה שנכשלה.
 */
export const notifyVerificationFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as VerificationDecisionInput)
  .handler(async ({ data }): Promise<{ sent: boolean }> => {
    const { requireIdentity, notify, withErrorLog, adminGetDoc, adminDeleteStorage, adminPatch } =
      await import("./server-admin");
    return withErrorLog("notifyVerification", async () => {
      const me = await requireIdentity(data.idToken);
      if (me.email !== "justask.adv@gmail.com" || !me.emailVerified) {
        throw new Error("forbidden");
      }
      await notify(
        data.targetUid,
        data.approved
          ? {
              title: "האימות שלך אושר 🎉",
              body: "הפרופיל אומת — מעכשיו הפניות בתחומים שלך פתוחות בפניך",
              link: "/lawyer",
            }
          : {
              title: "האימות לא אושר",
              body: "חלק מהפרטים לא עברו בדיקה. אפשר להגיש שוב עם מסמכים מעודכנים",
              link: "/lawyer-onboarding",
            },
      );

      /*
       * מחיקת סרטון האימות — בשני הכיוונים, אישור ודחייה.
       *
       * ההבטחה בטופס היא "נמחק מיד לאחר החלטת האימות", ולכן היא נאכפת
       * כאן, בנקודה היחידה שכל החלטה עוברת בה. תיעוד פנים הוא המידע
       * הרגיש ביותר שאנחנו מחזיקים, והדרך היחידה שהוא לא ידלוף היא
       * שהוא לא יהיה. כשל במחיקה לא מפיל את ההחלטה — אבל נרשם ביומן,
       * כי הבטחת פרטיות שנכשלה בשקט היא הבטחה שקרית.
       */
      try {
        const ver = await adminGetDoc(`verifications/${encodeURIComponent(data.targetUid)}`);
        const video = (ver?.files as { selfieVideo?: string } | undefined)?.selfieVideo;
        if (video && !ver?.selfiePurgedAt) {
          // חותמים "נמחק" רק אם המחיקה באמת קרתה
          if (await adminDeleteStorage(video)) {
            await adminPatch(`verifications/${encodeURIComponent(data.targetUid)}`, {
              selfiePurgedAt: Date.now(),
            });
          } else {
            const { logServerError } = await import("./server-admin");
            await logServerError("selfiePurge", new Error(`delete failed: ${video}`));
          }
        }
      } catch (err) {
        const { logServerError } = await import("./server-admin");
        await logServerError("selfiePurge", err);
      }
      return { sent: true };
    });
  });

/* ---------- ביצוע מחיקת חשבון ---------- */

export interface PurgeInput {
  targetUid: string;
  idToken: string;
  /** הרצה יבשה: מדווחת מה היה נמחק בלי לגעת בכלום. */
  dryRun?: boolean;
}

/**
 * מוחק חשבון וכל הנגזר ממנו. אדמין-על בלבד — זו הפעולה ההרסנית ביותר
 * במערכת, ולכן היא לא נגישה לחשבון הבדיקות ולא לבעל החשבון עצמו.
 */
export const purgeAccountFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as PurgeInput)
  .handler(async ({ data }) => {
    const { requireIdentity, purgeAccount, withErrorLog } = await import("./server-admin");
    return withErrorLog("purgeAccount", async () => {
      // האימייל נלקח מהטוקן המאומת, לא ממסמך המשתמש שהוא עצמו כותב
      const me = await requireIdentity(data.idToken);
      if (me.email !== "justask.adv@gmail.com" || !me.emailVerified) {
        throw new Error("forbidden");
      }
      return purgeAccount(data.targetUid, data.dryRun === true);
    });
  });

/**
 * מחיקת תיק בודד לצמיתות — כלי תחזוקה לאדמין (17/8/2026).
 * נועד לתיקי דמו ובדיקה; אותו שער בדיוק כמו שאר פעולות האדמין.
 */
export const adminDeleteCaseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { idToken: string; caseId: string })
  .handler(async ({ data }): Promise<{ existed: boolean; deleted: number }> => {
    const { requireIdentity, adminPurgeCase, withErrorLog } = await import("./server-admin");
    return withErrorLog("adminDeleteCase", async () => {
      const me = await requireIdentity(data.idToken);
      if (!["justask.adv@gmail.com", "dvirsb@gmail.com"].includes(me.email)) {
        throw new Error("forbidden");
      }
      const caseId = String(data.caseId ?? "").trim();
      if (!caseId) throw new Error("empty caseId");
      return adminPurgeCase(caseId);
    });
  });
