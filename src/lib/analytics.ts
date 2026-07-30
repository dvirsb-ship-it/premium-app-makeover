/**
 * מדידת המשפך שלפני התיק.
 *
 * לוח הבקרה יודע לספור תיקים — אבל תיק נוצר רק בסוף. כל מי שפתח את
 * הצ'אט, כתב שתי שורות ונטש היה בלתי נראה לחלוטין, ובשלב השקה זה בדיוק
 * המידע היקר: איפה אנשים עוזבים, ובאיזה שלב.
 *
 * הקובץ היה עד עכשיו stub גנרי עם אפס קוראים — כלומר "יש לנו אנליטיקס"
 * שלא מדד כלום. מכוון להיות זול ולא פולשני:
 * - שמות אירועים בלבד, מרשימה סגורה. אין תוכן שיחה ואין טקסט חופשי.
 * - fire-and-forget: לעולם לא זורק ולעולם לא מעכב את הממשק. מדידה
 *   שמפילה שיחה של אדם שנפגע היא עסקה גרועה בכל שער.
 * - ה-uid נשמר כדי שאפשר יהיה למחוק אותו יחד עם החשבון.
 */

/** האירועים שאנחנו באמת שואלים עליהם. רשימה סגורה, לא מחרוזת חופשית. */
export type FunnelEvent =
  | "intake_opened"
  | "intake_first_message"
  | "intake_ready"
  | "intake_not_suitable"
  | "intake_submitted"
  | "intake_restarted";

type Sink = (event: FunnelEvent) => void;

let currentUserId: string | null = null;

/** ברירת מחדל: שקט. נדלק במפורש בדפדפן. */
let sink: Sink = () => {};

export function identify(userId: string | null) {
  currentUserId = userId;
}

/**
 * כותב ל-funnelEvents. אינו מחכה לתוצאה ואינו מדווח על כשל — הכתיבה
 * הזו לעולם לא צריכה להשפיע על מה שהמשתמש רואה.
 */
function firestoreSink(event: FunnelEvent) {
  const uid = currentUserId;
  if (!uid) return;
  void (async () => {
    try {
      const { addDoc, collection } = await import("firebase/firestore");
      const { fbDb } = await import("./firebase");
      await addDoc(collection(fbDb(), "funnelEvents"), { uid, event, at: Date.now() });
    } catch {
      /* מדידה אינה שווה תקלה */
    }
  })();
}

export function initAnalytics(next: Sink = firestoreSink) {
  sink = next;
}

export function track(event: FunnelEvent) {
  sink(event);
}
