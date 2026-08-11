/**
 * הכללים המשפטיים הטהורים של JustAsk — התיישנות, תקרת שכר טרחה, ת״ז.
 *
 * הם ישבו קודם בתוך db.ts (שנוגע ב-firebase) ובתוך קומפוננטת ההצטרפות,
 * כלומר לא היה אפשר לבדוק אותם בלי להרים חצי אפליקציה. אלו החישובים
 * שמוצגים לעורך דין ומשפיעים על החלטה מקצועית — הם צריכים בדיקות.
 *
 * הקובץ טהור בכוונה: אין כאן firebase, אין React.
 */

/* ---------- גיל האירוע ---------- */

/**
 * כמה חודשים עברו מאז האירוע, או undefined כשאי אפשר לדעת.
 *
 * ═══ החליף חישוב התיישנות (10/8/2026) ═══
 *
 * קודם ישבה כאן `limitationMonthsLeft`, שהחזיקה טבלת תקופות (7 שנים
 * כברירת מחדל, 3 בביטוח) והציגה לעורך הדין "נותרו להתיישנות X חודשים".
 *
 * זו קביעה משפטית, ואנחנו לא מוסמכים לקבוע אותה. גם לגופה היא הייתה
 * שגויה לעיתים קרובות: לחוק ההתיישנות יש כלל גילוי, השעיה לקטינים,
 * השעיה מחמת ליקוי נפשי, וכללים נפרדים לגמרי בפלילי, במנהלי ובמשפחה.
 * מספר שגוי שעורך דין מסתמך עליו גרוע מאין מספר בכלל.
 *
 * מה שנשאר הוא **העובדה**: מתי האירוע קרה. המסקנה המשפטית ממנה היא של
 * עורך הדין, והוא זה שיודע להחיל עליה את החריגים.
 *
 * שמרני בכוונה: שותק כשהתאריך לא נקרא כ-YYYY-MM-DD.
 *
 * @param now מוזרק כדי שאפשר יהיה לבדוק; ברירת המחדל היא הזמן הנוכחי.
 */
export function monthsSinceIncident(
  incidentDate: string | undefined,
  now: number = Date.now(),
): number | undefined {
  if (!incidentDate || !/^\d{4}-\d{2}-\d{2}$/.test(incidentDate)) return undefined;
  const start = new Date(`${incidentDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return undefined;
  const end = new Date(now);
  /*
   * חודשים קלנדריים ולא חלוקה בחודש ממוצע.
   *
   * חישוב לפי 30.44 יום מדווח בחסר באופן שיטתי: אירוע בן ארבע שנים
   * בדיוק יוצא 47 חודשים ולא 48, ותג שמותנה בסף היה מפספס אותו. כאן
   * ההפרש הוא בין תאריכים אמיתיים.
   */
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
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
