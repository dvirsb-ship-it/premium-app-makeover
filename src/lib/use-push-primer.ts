import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { enablePush, pushEnabledLocally, pushSupport } from "./push";
import { translate } from "./i18n";

/** נדחה — נשאל שוב בהזדמנות הבאה, אבל לא באותו שבוע. */
const SNOOZE_KEY = "justask-push-primer-snoozed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * ניהול מסך ההסבר שלפני בקשת ההרשאה.
 *
 * הכלל שמכתיב את המבנה: המערכת נותנת בקשה אחת בלבד. לכן קוראים ל-
 * Notification.requestPermission רק אחרי שהמשתמש אמר "כן" למסך שלנו —
 * וכל עוד הוא לא אמר, ההרשאה נשארת בתולית ואפשר לשאול שוב.
 *
 * הדחייה נשמרת לשבוע: לשאול בכל כניסה זו הטרדה, ולא לשאול לעולם זה
 * לוותר על הערוץ היחיד שיש לנו.
 */
export function usePushPrimer(uid: string | undefined, ready: boolean) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !uid) return;
    // כבר מופעל, נדחה בעבר, או שהדפדפן לא תומך — אין מה להציג
    if (pushSupport() !== "ready" || pushEnabledLocally()) return;
    try {
      const at = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
      if (at && Date.now() - at < SNOOZE_MS) return;
    } catch {
      /* ignore */
    }
    /* השהיה קצרה — שלא ייפול על המשתמש באותו רגע שהמסך נטען */
    const tm = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(tm);
  }, [uid, ready]);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const allow = useCallback(async () => {
    setOpen(false);
    if (!uid) return;
    try {
      const ok = await enablePush(uid);
      toast[ok ? "success" : "info"](
        translate(ok ? "pushEnabled" : "pushDeniedMsg", "he"),
      );
      /*
       * סירוב בחלון של המערכת הוא סופי — אין טעם לשאול שוב, ולכן
       * נרשמת דחייה ארוכה במקום להציק בכל כניסה.
       */
      if (!ok) dismiss();
    } catch {
      toast.error(translate("authErrGeneric", "he"));
    }
  }, [uid, dismiss]);

  return { open, allow, dismiss };
}
