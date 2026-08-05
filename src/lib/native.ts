/**
 * זיהוי הרצה בתוך אפליקציה מקורית.
 *
 * אותו קוד רץ בשלושה מקומות — דפדפן, PWA שהותקן, ואפליקציית iOS —
 * ובשלישי חלק מהיכולות עובדות אחרת לגמרי (בעיקר התראות). הבדיקה
 * מרוכזת כאן ולא מפוזרת, כדי שלא ייווצרו שלוש הגדרות שונות ל"מקורי".
 *
 * הייבוא דינמי בכוונה: Capacitor אינו קיים בבנייה של השרת, וייבוא
 * סטטי היה מפיל את ה-SSR.
 */

let cached: boolean | null = null;

/** האם אנחנו רצים בתוך מעטפת מקורית (iOS/Android), ולא בדפדפן. */
export function isNativeApp(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return (cached = false);
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  cached = !!cap?.isNativePlatform?.();
  return cached;
}

/** "ios" | "android" | "web" — לצרכים שבהם המעטפת עצמה משנה. */
export function nativePlatform(): string {
  if (typeof window === "undefined") return "web";
  const cap = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return cap?.getPlatform?.() ?? "web";
}
