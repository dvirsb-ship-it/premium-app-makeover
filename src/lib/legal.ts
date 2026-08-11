/**
 * הכללים המשפטיים הטהורים של JustAsk — התיישנות, תקרת שכר טרחה, ת״ז.
 *
 * הם ישבו קודם בתוך db.ts (שנוגע ב-firebase) ובתוך קומפוננטת ההצטרפות,
 * כלומר לא היה אפשר לבדוק אותם בלי להרים חצי אפליקציה. אלו החישובים
 * שמוצגים לעורך דין ומשפיעים על החלטה מקצועית — הם צריכים בדיקות.
 *
 * הקובץ טהור בכוונה: אין כאן firebase, אין React.
 */

/* ---------- התיישנות ---------- */

/**
 * תקופות ההתיישנות לפי קטגוריה, בשנים.
 * ברירת המחדל היא 7 שנים לפי חוק ההתיישנות; תביעת תגמולי ביטוח מתיישנת
 * בתוך 3 שנים לפי חוק חוזה הביטוח.
 */
export const LIMITATION_YEARS: Record<string, number> = { "ביטוח": 3 };
export const DEFAULT_LIMITATION_YEARS = 7;

/**
 * חודשים שנותרו עד ההתיישנות, או undefined כשאי אפשר לדעת.
 *
 * שמרני בכוונה: שותק כשהתאריך לא נקרא כ-YYYY-MM-DD. מספר שגוי כאן גרוע
 * בהרבה מאי-הצגה — עורך דין עשוי לקבל על סמכו החלטה אם לקחת תיק.
 *
 * @param now מוזרק כדי שאפשר יהיה לבדוק; ברירת המחדל היא הזמן הנוכחי.
 */
export function limitationMonthsLeft(
  incidentDate: string | undefined,
  category: string,
  now: number = Date.now(),
): number | undefined {
  if (!incidentDate || !/^\d{4}-\d{2}-\d{2}$/.test(incidentDate)) return undefined;
  const start = new Date(`${incidentDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return undefined;
  const years = LIMITATION_YEARS[category] ?? DEFAULT_LIMITATION_YEARS;
  const deadline = new Date(start);
  deadline.setFullYear(deadline.getFullYear() + years);
  const months = Math.floor((deadline.getTime() - now) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 0 ? 0 : months;
}

/* ---------- תקרת שכר טרחה ---------- */

/** תקרת שכר הטרחה בתביעות פלת״ד לפי כללי לשכת עורכי הדין, באחוזים. */
export const PLTD_MAX_PERCENT = 13;

/** קטגוריות שבהן הצעה באחוזים עשויה להיות כפופה לתקרה סטטוטורית. */
export function categoryHasStatutoryCap(category: string): boolean {
  return category === "נזיקין ותאונות" || category === "ביטוח";
}

/**
 * בעניין פלילי אסור לעורך דין להתנות שכר בתוצאות (חוק לשכת עורכי הדין,
 * ס' 84). כאן זו חסימה ולא אזהרה: בניגוד לתקרת הפלת"ד — שחלה רק על חלק
 * מהתיקים בקטגוריה — בקטגוריה "פלילי" אין תיק שבו אחוזים מותרים.
 */
export function categoryForbidsContingency(category: string): boolean {
  return category === "פלילי";
}

/**
 * האם הצעה חורגת מהתקרה. רק הצעות באחוזים כפופות לה — תעריף שעתי או
 * סכום קבוע אינם נמדדים מול אחוז מהפיצוי.
 */
export function offerExceedsCap(
  model: "contingency" | "hourly" | "fixed",
  amount: number,
  category: string,
): boolean {
  if (model !== "contingency") return false;
  if (!categoryHasStatutoryCap(category)) return false;
  return amount > PLTD_MAX_PERCENT;
}

/* ---------- תעודת זהות ---------- */

/**
 * ביקורת ספרת ביקורת של ת״ז ישראלית (אלגוריתם לוהן מותאם).
 * משמש באימות עורכי דין — שגיאה כאן חוסמת עורך דין אמיתי מלהצטרף.
 */
export function isValidIsraeliId(id: string): boolean {
  const raw = id.replace(/\D/g, "");
  /*
   * הבדיקה הזו נוספה אחרי שהבדיקה האוטומטית תפסה את זה: מחרוזת ריקה
   * (וכל קלט בלי ספרות, למשל "abc") הפכה ע"י padStart ל-"000000000",
   * שסכום הביקורת שלו 0 — כלומר "תקינה". טופס האימות קיבל ת״ז ריקה.
   * גם ערך של אפסים בלבד אינו תעודת זהות.
   */
  if (raw.length === 0 || raw.length > 9) return false;
  if (/^0+$/.test(raw)) return false;
  const digits = raw.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = Number(digits[i]) * ((i % 2) + 1);
    if (num > 9) num -= 9;
    sum += num;
  }
  return sum % 10 === 0;
}
