/**
 * פונקציות השרת של ה-AI — Gemini.
 * רצות בצד השרת בלבד (createServerFn): מפתח ה-API לעולם לא מגיע לדפדפן.
 */
import { createServerFn } from "@tanstack/react-start";
import { INTAKE_MODEL, INTAKE_SYSTEM_PROMPT } from "./intake-prompt";
import { VALIDATION_CATEGORIES } from "../specialties";

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
    const { requireUser, enforceDailyCap, withErrorLog } = await import("./server-admin");
    return withErrorLog("intakeTurn", async () => {
    const uid = await requireUser(data.idToken);
    await enforceDailyCap(uid, "intakeTurn");

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
  /** באישור: מה להכין לפגישה — נגזר ממה שהפונה עצמו ספר בראיון. */
  clientChecklist?: string[];
}

/*
 * הפרומפט נבנה מרשימת הקטגוריות עצמה, ולא משכפל אותה בטקסט. כשהיו שתי
 * רשימות נפרדות הן נפרדו: הטופס הציע 17 תחומים והוולידציה סיווגה ל-7,
 * ועשרה תחומים היו מלכודת שקטה.
 */
const CATEGORY_LIST = VALIDATION_CATEGORIES.map((c) => `"${c}"`).join(" / ");

/*
 * הבדיקה מתפצלת לפי סוג ההליך.
 *
 * הגרסה הקודמת בדקה עילה/התיישנות/נזק/מסלול — מבחן שנכון לתביעה
 * אזרחית ותו לא. לחשוד בהליך פלילי אין "עילה" ואין "נזק"; לאדם בהליך
 * גירושין אין "עילת תביעה"; למי שקיבל שומת מס אין "אחריות של גורם
 * אחר". להריץ עליהם את מבחן הנזיקין פירושו לדחות אותם בטעות — וזה
 * הרוב המכריע של מי שבאמת צריך עורך דין בתחומים האלה.
 */
const VALIDATION_SYSTEM = `אתה מנוע הוולידציה המשפטית של JustAsk — פלטפורמה ישראלית שמחברת אנשים לעורכי דין. אתה שומר הסף: תיק שעובר אצלך מגיע לעורכי דין אמיתיים, ואישור קל מדי שורף את אמונם. נתח באמת.

## שלב 1 — סוג ההליך
קבע תחילה לאיזה סוג העניין שייך, כי המבחן שונה בתכלית:
א. **תביעה אזרחית** — הפונה תובע פיצוי או סעד מגורם אחר (נזיקין, רשלנות רפואית, עבודה, ביטוח, צרכנות, חוזים, מקרקעין, בנקאות).
ב. **הגנה פלילית / תעבורה** — הפונה חשוד, נחקר, הוגש נגדו כתב אישום או קיבל דוח.
ג. **הליך משפחה** — גירושין, מזונות, משמורת, הסכם ממון, ירושה וצוואות.
ד. **הליך מול רשות** — מס, ביטוח לאומי, ועדת ערר, רישוי, תכנון ובנייה, הגירה, צה"ל/משהב"ט.
ה. **עסקי/מסחרי** — הקמת חברה, הסכם, קניין רוחני, חדלות פירעון, הוצאה לפועל.

## שלב 2 — המבחן המתאים
**לתביעה אזרחית (א)** — ארבעה צירים, וכולם חייבים להתקיים:
1. עילה — האם קיימת עילה מוכרת בדין הישראלי? מי הגורם האחראי?
2. התיישנות — נזיקין 7 שנים; תביעת ביטוח 3 שנים; דיני עבודה לרוב 7 (הלנת שכר קצר בהרבה); קצין התגמולים כלליו. חלף המועד — validated=false.
3. נזק — האם יש נזק ממשי בר-פיצוי? נזק זניח — validated=false עם הפניה מתאימה.
4. מסלול — האם עורך דין באמת נדרש, או שזה מסלול עצמאי (תביעות קטנות עד 38,900₪ בעניין פשוט, תלונה לרשות להגנת הצרכן, פנייה לממונה)?

**להגנה פלילית ותעבורה (ב)** — אל תחפש עילה או נזק; הפונה אינו התובע.
1. האם יש הליך ממשי — חקירה, זימון, כתב אישום, דוח, שימוע?
2. מה השלב ומה המועד הקרוב (מועד להישפט, מועד לשימוע, תאריך דיון)?
3. ברירת המחדל היא validated=true: אדם שנחקר או שהוגש נגדו אישום זקוק לייצוג, גם אם הוא סבור שהוא צודק. validated=false רק אם אין הליך כלל, או שמדובר בשאלה תיאורטית.

**להליך משפחה (ג)** — אל תחפש עילה או נזק.
1. האם יש סכסוך ממשי או צורך בהסדרה משפטית (גירושין, מזונות, משמורת, הסכם, צוואה, התנגדות לצו ירושה)?
2. ברירת המחדל validated=true. validated=false רק אם אין עניין משפטי כלל.

**להליך מול רשות (ד)**
1. האם יש החלטה, שומה, דחייה או דרישה שניתן לתקוף?
2. **מועדים** — לערר ולהשגה מועדים קצרים ומחייבים; אם חלף המועד ציין זאת במפורש ב-legalBasis.
3. validated=true אם יש החלטה בת-תקיפה או הליך פתוח.

**לעסקי/מסחרי (ה)**
1. האם יש עסקה, הסכם, סכסוך או צורך בהסדרה ממשיים ולא שאלה כללית?
2. validated=true אם כן.

## כללי פלט
1. category — בדיוק אחת מהרשימה: ${CATEGORY_LIST}.
2. validated=true רק אם עבר את המבחן של סוגו ויש הצדקה אמיתית לחיבור לעורך דין.
3. title — כותרת קצרה ועניינית בעברית (עד 6 מילים).
4. summary — סיכום מקצועי של 2-3 משפטים בעברית, גוף שלישי, בלי פרטים מזהים, המסתיים ב: "הבדיקה הראשונית אינה ייעוץ משפטי."
5. legalBasis — לעיני עורכי דין: הדין הרלוונטי, השלב, המועדים והמסלול. בתביעה אזרחית — העילה, הדין וההתיישנות. בפלילי — העבירה הנטענת והשלב הדיוני. במשפחה — סוג ההליך והערכאה. מול רשות — ההחלטה הנתקפת והמועד. אם validated=false — הסבר תמציתי של הכשל.
6. recommendation — רק כש-validated=false: המלצה מעשית בגוף שני מה כן לעשות (לאן לפנות, מה להכין, מה יהפוך את זה לתיק). כש-validated=true — מחרוזת ריקה.
6ב. clientChecklist — רק כש-validated=true: 3-6 פריטים קונקרטיים שהפונה צריך להכין לפגישה, **גזורים ממה שהוא עצמו ספר** (למשל "אישורי המחלה מחודשיים אי-הכושר", "הזימון לחקירה שקיבלת", "הסכם הממון אם נחתם", "שומת המס והנימוקים"). כל פריט משפט קצר בגוף שני, בלי הסברים משפטיים. כש-validated=false — מערך ריק.
7. בשום שדה אין טלפונים, אימיילים, קישורים או שמות מזהים.
השב JSON בלבד.`;

const MEMO_SYSTEM = `אתה משפטן ישראלי בכיר שכותב תזכיר בדיקה פנימי לפני קבלת תיק. המקרה יכול להיות מכל תחום — אזרחי, פלילי, משפחה, מנהלי או מסחרי — והתזכיר מותאם לסוגו. כתוב תזכיר מובנה ויסודי בעברית (300-500 מילים) על המקרה שתקבל:

1. **עובדות** — מה קרה, למי, מתי, באילו נסיבות.
2. **הבסיס המשפטי** — לפי סוג העניין:
   · תביעה אזרחית — עילה-עילה לפי הדין הישראלי (רשלנות והפרת חובה חקוקה בפקודת הנזיקין; חוק האחריות למוצרים פגומים; פלת"ד; חוקי המגן בעבודה; חוק חוזה הביטוח; חוק הגנת הצרכן; דיני חוזים; חוק המקרקעין; חוק הנכים/קצין התגמולים). לכל עילה: יסודותיה, האם מתקיימים כאן, ומה חסר.
   · הגנה פלילית או תעבורה — העבירה הנטענת, יסודותיה, השלב הדיוני, וקווי הגנה אפשריים.
   · משפחה — הערכאה (בית משפט לענייני משפחה או בית דין דתי), ההליכים הנדרשים, וסוגיות מרכזיות (משמורת, מזונות, איזון משאבים).
   · מול רשות — ההחלטה הנתקפת, עילות התקיפה, והמסלול (השגה, ערר, עתירה מנהלית).
   · מסחרי — ההסכם או העסקה, הסיכונים, וההסדרה הנדרשת.
3. **מועדים** — חשב במפורש מול התאריך הנוכחי. התיישנות בתביעה אזרחית (נזיקין 7 שנים; ביטוח 3), ובהליכים אחרים המועד הדיוני הקרוב (מועד להישפט, מועד השגה או ערר, מועד לתגובה). מועד שחלף — ציין זאת מפורשות.
4. **נזק / חשיפה** — בתביעה אזרחית: הנזק בר-הפיצוי והקשר הסיבתי. בפלילי: החשיפה לעונש ולרישום. במשפחה ובמסחרי: מה עומד על הפרק.
5. **טענות נגד** — מה יטען הצד שכנגד או התביעה, וכמה הטענות חזקות.
6. **מסלול נכון** — ייצוג בבית משפט / הליך מול רשות / הסדרה בהסכם / הליך עצמאי בלי עו"ד (תביעות קטנות עד 38,900₪, תלונה צרכנית) / אין הליך.
7. **שורה תחתונה** — האם מוצדק לחבר את הפונה לעורך דין, ובאיזו רמת ביטחון.

אל תכלול פרטים מזהים. זהו תזכיר פנימי — היה ישיר וביקורתי.`;

const VERDICT_SYSTEM = `אתה השופט הפנימי של JustAsk. קיבלת תזכיר בדיקה משפטי על מקרה. תפקידך לבקר אותו ולהכריע סופית:
- אם התזכיר אישר קלות יתר — תקן לחומרה. אם פסל בקלות יתר — תקן לקולא. הכרעתך היא הקובעת.
- החל את המבחן של **סוג ההליך הנכון**. בתביעה אזרחית: עילה, התיישנות, נזק ומסלול. בהגנה פלילית, במשפחה ובהליך מול רשות אין "עילה" ואין "נזק" — שם השאלה היא אם יש הליך ממשי ומועד פתוח. פסילה של חשוד בפלילי בנימוק שאין לו עילת תביעה היא טעות.
${VALIDATION_SYSTEM.slice(VALIDATION_SYSTEM.indexOf("כללי פלט:"))}`;

export const validateCaseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as ValidateInput)
  .handler(async ({ data }): Promise<ValidateResult> => {
    const {
      requireUser, adminGetCase, adminNotify, adminApprovedLawyerIds, enforceDailyCap,
      adminPatch, adminUpdateCase, downloadImageBase64, notify, withErrorLog,
      countOpenCases, MAX_OPEN_CASES,
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
    const open = await countOpenCases((raw as { clientId: string }).clientId);
    if (open > MAX_OPEN_CASES) {
      throw new Error("too many open cases");
    }
    const c = raw as {
      clientId: string;
      status?: string;
      description: string;
      incidentDate?: string;
      damageType?: string;
      hasDocumentation?: boolean;
      title?: string;
      category?: string;
      summary?: string;
      legalBasis?: string;
      recommendation?: string;
      images?: { origPath: string }[];
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
        legalBasis: c.legalBasis ?? "",
        recommendation: c.recommendation ?? "",
      };
    }

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
        maxTokens: 8000,
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
        maxTokens: 8000,
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
            clientChecklist: { type: "array", items: { type: "string" } },
          },
          required: ["validated", "title", "category", "summary", "legalBasis", "recommendation"],
        },
      },
    );

    const result = JSON.parse(verdict) as ValidateResult;

    // כתיבת התוצאה מהשרת — חוקי המסד חוסמים את הלקוח מלגעת בסטטוס בעצמו
    const validatedAt = Date.now();
    await adminUpdateCase(data.caseId, {
      title: result.title,
      category: result.category,
      summary: result.summary,
      legalBasis: result.legalBasis ?? "",
      recommendation: result.recommendation ?? "",
      status: result.validated ? "matching" : "rejected",
      // הרגע שבו התיק נעשה זמין לעורכי דין — הבסיס למדידת תגובתיות
      validatedAt,
    });

    /*
     * רשימת ההכנה ללקוח — התוצר השלישי של אותו ראיון. עד כה השתמשנו בו
     * להכרעה ולתזכיר בלבד, והלקוח עצמו לא קיבל ממנו כלום.
     */
    const checklist = (result.clientChecklist ?? []).filter((x) => typeof x === "string" && x.trim());
    if (result.validated && checklist.length) {
      try {
        await adminUpdateCase(data.caseId, { clientChecklist: checklist });
      } catch {
        /* הרשימה היא תוספת — כשל לא יפיל את הוולידציה */
      }
    }

    /*
     * התזכיר המלא נשמר ואינו נזרק: הוא עבודה של משפטן בכיר — עילות, יסודותיהן,
     * התיישנות, טענות נגד ומסלול — וחוסך לעורך הדין את שעת העבודה הראשונה.
     * בתת-אוסף נפרד כדי שנוכל להגביל אותו למנוי Pro בעתיד בלי מיגרציה.
     */
    if (result.validated) {
      try {
        await adminPatch(`cases/${encodeURIComponent(data.caseId)}/memo/full`, {
          text: memo,
          at: validatedAt,
        });
      } catch {
        /* התזכיר הוא תוספת — כשל בשמירתו לא יפיל את הוולידציה */
      }
    }

    /*
     * הזמנת עורכי הדין — בשרת ולא בדפדפן של הלקוח. קודם זה רץ אצלו אחרי
     * המתנה של כדקה, כך שסגירת הטאב פירושה שאף עורך דין לא נודע על התיק.
     * הסינון לפי תחום נעשה כאן ולא בדפדפן: זו ההבטחה שהלקוח מסמן עליה וי
     * במסך ההסכמה ("יועברו רק לעורכי דין מתאימים").
     */
    let notified = 0;
    if (result.validated) {
      try {
        const ids = await adminApprovedLawyerIds(result.category);
        notified = ids.length;
        /*
         * כמה עורכי דין באמת קיבלו את התיק. בלי המספר הזה הלקוח מקבל
         * "נעדכן אותך" גם כשאין אף עורך דין בתחום — הבטחה שאין מי שיקיים.
         */
        await adminUpdateCase(data.caseId, { notifiedLawyers: notified });
        await Promise.all(
          ids.map((id) =>
            adminNotify(id, {
              type: "new_case",
              title: `תיק חדש בתחום ${result.category}`,
              body: `"${result.title}" ממתין לעורך דין — היו הראשונים להביע עניין`,
              caseId: data.caseId,
            }).catch(() => undefined),
          ),
        );
      } catch {
        /* ההזמנה נכשלה — הכשל נרשם ביומן ע"י withErrorLog אם היא זרקה */
      }
    }

    // התראה מחוץ לאפליקציה — הבדיקה לוקחת עד דקה והלקוח לרוב כבר עזב את המסך
    await notify(
      c.clientId,
      result.validated
        ? {
            title: "התיק שלך עבר את הבדיקה המשפטית ✓",
            body: notified > 0
              ? `"${result.title}" אושר — ${notified} עורכי דין בתחום קיבלו התראה`
              : `"${result.title}" אושר. עדיין אין עורך דין מאומת בתחום הזה — נודיע לך ברגע שיצטרף`,
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
    const { requireUser, enforceDailyCap, withErrorLog } = await import("./server-admin");
    return withErrorLog("detectSensitiveRegions", async () => {
    const uid = await requireUser(data.idToken);
    await enforceDailyCap(uid, "detectRegions");

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
        maxTokens: 6000,
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
    const { requireUser, adminGetCase, adminGetDoc, recordLawyerResponse, notify, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("notifyInterest", async () => {
      const uid = await requireUser(data.idToken);
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
export const recordConnectionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as RecordConnectionInput)
  .handler(async ({ data }): Promise<{ connections: number }> => {
    const { requireUser, adminGetCase, recordConnection, withErrorLog } =
      await import("./server-admin");
    return withErrorLog("recordConnection", async () => {
      const uid = await requireUser(data.idToken);
      const c = await adminGetCase(data.caseId);
      if (!c || c.clientId !== uid) return { connections: 0 };
      const lawyerId = c.chosenLawyerId as string | undefined;
      if (!lawyerId) return { connections: 0 };
      const n = await recordConnection(lawyerId, data.caseId);
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
