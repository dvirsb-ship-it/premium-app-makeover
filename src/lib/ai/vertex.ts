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
 * ⚠️ כבוי — 6/8/2026.
 *
 * דורש הפעלת Vertex AI API בקונסולה ומתן הרשאת `aiplatform.user` לחשבון
 * השירות של App Hosting. עד שזה נעשה, קריאה תיכשל ב-403 — ולכן המתג
 * נשאר כבוי והצינור ממשיך דרך ה-Developer API בדיוק כמו קודם.
 *
 * **להדליק רק אחרי שדביר הפעיל את ה-API**, ואז לפתוח תיק בדיקה אחד.
 * רשום ב-LAUNCH-CHECKLIST.md.
 */
export const AI_VERTEX_ENABLED = false;

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
