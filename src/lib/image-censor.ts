/**
 * צנזור תמונות בצד הלקוח — canvas בלבד, בלי תלויות.
 * הזיהוי (אילו אזורים להסתיר) נעשה בשרת ע"י Gemini; הציור נעשה כאן.
 */
import type { SensitiveRegion } from "./ai/intake.functions";

/**
 * התמונה היא ראיה — מסמך רפואי מטושטש מאבד את ערכו.
 * לכן שומרים ברזולוציה גבוהה, ושולחים ל-AI עותק מוקטן בלבד:
 * הזיהוי מחזיר קואורדינטות מנורמלות, כך שהן מתאימות לכל רזולוציה.
 */
const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.92;
const DETECT_MAX_SIDE = 1280;
const DETECT_QUALITY = 0.8;
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

function draw(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** מכין שתי גרסאות: איכותית לשמירה, ומוקטנת לזיהוי ה-AI. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const full = draw(bitmap, MAX_SIDE);
  const small = draw(bitmap, DETECT_MAX_SIDE);
  bitmap.close();

  const dataUrl = small.toDataURL("image/jpeg", DETECT_QUALITY);
  const origBlob = await canvasToBlob(full);
  return {
    origBlob,
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    width: full.width,
    height: full.height,
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
