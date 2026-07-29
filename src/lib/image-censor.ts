/**
 * צנזור תמונות בצד הלקוח — canvas בלבד, בלי תלויות.
 * הזיהוי (אילו אזורים להסתיר) נעשה בשרת ע"י Gemini; הציור נעשה כאן.
 */
import type { SensitiveRegion } from "./ai/intake.functions";

/** צד מקסימלי לתמונה שנשלחת — מקטין עלות ונפח, מספיק לזיהוי ולקריאה. */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;
/** שוליים סביב כל תיבה (יחסית לצד התמונה) — ביטחון נגד תיבות הדוקות מדי. */
const BOX_PADDING = 0.012;

export interface PreparedImage {
  /** JPEG דחוס — הגרסה המקורית שתישמר ללקוח. */
  origBlob: Blob;
  /** base64 בלי קידומת data: — לשליחה לשרת. */
  base64: string;
  width: number;
  height: number;
}

export interface PendingImage {
  id: string;
  origBlob: Blob;
  censBlob: Blob;
  /** תצוגה מקדימה של הגרסה המצונזרת — מה שעורכי הדין יראו. */
  previewUrl: string;
  regionCount: number;
  /** תיאור עובדתי מה-AI — נמסר לשיחה כדי שהעוזר "יראה" את התמונה. */
  description: string;
}

/** דחיסת קובץ תמונה ל-JPEG בגודל סביר. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const origBlob = await canvasToBlob(canvas);
  return {
    origBlob,
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    width: w,
    height: h,
  };
}

/** ציור מלבנים שחורים על האזורים הרגישים ([ymin,xmin,ymax,xmax] מנורמל 0-1000). */
export async function censorImage(
  prepared: PreparedImage,
  regions: SensitiveRegion[],
): Promise<Blob> {
  const bitmap = await createImageBitmap(prepared.origBlob);
  const canvas = document.createElement("canvas");
  canvas.width = prepared.width;
  canvas.height = prepared.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const padX = prepared.width * BOX_PADDING;
  const padY = prepared.height * BOX_PADDING;
  ctx.fillStyle = "#000";
  for (const r of regions) {
    const [ymin, xmin, ymax, xmax] = r.box_2d;
    const x = (xmin / 1000) * prepared.width - padX;
    const y = (ymin / 1000) * prepared.height - padY;
    const w = ((xmax - xmin) / 1000) * prepared.width + padX * 2;
    const h = ((ymax - ymin) / 1000) * prepared.height + padY * 2;
    ctx.fillRect(x, y, w, h);
  }
  return canvasToBlob(canvas);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
