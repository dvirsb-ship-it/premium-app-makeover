/**
 * מעבר ל-Vertex AI — הניתוח באזור מוגדר במקום "שרתי גוגל, לא בהכרח בישראל".
 *
 * ה-Gemini Developer API שבו השתמשנו עד כה אינו מאפשר לקבע את מיקום
 * העיבוד. Vertex כן, וזה כל טעם המעבר: תיק כאן מכיל תיאור פגיעה ותמונות
 * רפואיות של אדם ישראלי, ומדיניות הפרטיות שלנו נאלצה להודות שהניתוח
 * מתבצע "לא בהכרח בישראל".
 *
 * **למה אירופה ולא ישראל:** גוגל אינה מתחייבת על מיקום עיבוד ML באזור
 * `me-west1` (תל אביב). ההתחייבות קיימת רק באזורים מסוימים בארה"ב
 * ובאיחוד האירופי. תקנות הגנת הפרטיות מתירות העברה למדינות שמקבלות
 * מידע מהאיחוד באותם תנאים — ולכן אירופה היא מסלול מוגן, ו"שרת גלובלי
 * לא מוגדר" אינו.
 *
 * **למה `europe-west4` ולא בלגיה:** שרת האפליקציה כבר רץ שם. אותו אזור
 * פירושו פחות latency, וסיפור אחד להסביר לעורך דין ולאפל במקום שניים.
 */

export const VERTEX_PROJECT = "justask-6bfb9";
export const VERTEX_LOCATION = "europe-west4";

/**
 * דלוק — 6/8/2026.
 *
 * שני התנאים בוצעו ואומתו: ה-API הופעל (בקונסולה הוא נקרא היום
 * **Agent Platform API**, לא Vertex AI — וזו הסיבה שהוא לא נמצא
 * בחיפוש), וחשבון השירות `firebase-app-hosting-compute` קיבל את
 * התפקיד `roles/aiplatform.user` (בקונסולה: **Agent Platform User**).
 *
 * החיפוש נעשה לפי מזהה התפקיד ולא לפי שמו — שני שמות דומים הופיעו,
 * והמזהה הוא היחיד שאינו משתמע לשתי פנים.
 *
 * אם קריאות מתחילות לחזור 403 — ההרשאה או ה-API כבו. חזרה ל-false
 * מחזירה את הצינור ל-Developer API בלי שום שינוי אחר.
 */
export const AI_VERTEX_ENABLED = true;

/**
 * שמות המודלים ב-Vertex.
 *
 * ב-Developer API יש כינויים נעים (`gemini-flash-latest`) שמצביעים תמיד
 * על הגרסה העדכנית. ב-Vertex אין — שם המודל הוא גרסה מפורשת. תרגום
 * שקט כאן היה נכשל ב-404 על כל קריאה, ולכן המיפוי מפורש ובדוק.
 */
const MODEL_MAP: Record<string, string> = {
  "gemini-flash-latest": "gemini-2.5-flash",
  "gemini-pro-latest": "gemini-2.5-pro",
};

/** שם המודל כפי ש-Vertex מכיר אותו. שם לא ידוע עובר כמות שהוא. */
export function vertexModel(model: string): string {
  return MODEL_MAP[model] ?? model;
}

/** כתובת הקריאה באזור הנעוץ. */
export function vertexUrl(model: string): string {
  return (
    `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1` +
    `/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}` +
    `/publishers/google/models/${vertexModel(model)}:generateContent`
  );
}

/**
 * המרת שמות שדות ל-camelCase.
 *
 * שתי ה-APIs מקבלות פרוטובוף-JSON ולכן מקבלות גם snake_case, אבל התיעוד
 * של Vertex כתוב כולו ב-camelCase. ההמרה מפורשת כדי שלא נגלה הבדל
 * שקט בגרסה עתידית — ובעיקר כדי שההבדל יהיה כתוב במקום אחד ובדוק.
 */
export function toVertexBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };

  if ("system_instruction" in out) {
    out.systemInstruction = out.system_instruction;
    delete out.system_instruction;
  }

  const contents = out.contents as
    | { role: string; parts: Record<string, unknown>[] }[]
    | undefined;
  if (Array.isArray(contents)) {
    out.contents = contents.map((c) => ({
      ...c,
      parts: c.parts.map((p) => {
        if (!("inline_data" in p)) return p;
        const { inline_data, ...rest } = p as {
          inline_data: { mime_type: string; data: string };
        } & Record<string, unknown>;
        return {
          ...rest,
          inlineData: { mimeType: inline_data.mime_type, data: inline_data.data },
        };
      }),
    }));
  }

  return out;
}
