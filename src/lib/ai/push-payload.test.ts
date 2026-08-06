import { describe, expect, it } from "vitest";
import { buildPushMessage } from "./server-admin";

/*
 * הבדיקה הזו קיימת בגלל באג שאף כלי לא תפס.
 *
 * הוספתי `notification` ברמה העליונה כדי ש-iOS מקורי יציג משהו, ובלי
 * לשים לב ה-PWA התחיל להראות **שתי** התראות זהות: אחת שה-service worker
 * הציג מתוך `data`, ואחת שהדפדפן הציג בעצמו מתוך `notification`.
 *
 * השרת החזיר 200. הבדיקות עברו. הלוגים היו נקיים. הדרך היחידה שזה
 * התגלה הייתה צילום מסך של מסך נעילה. לכן הצורה מקובעת כאן.
 */

const msg = { title: "התיק שלך עבר את הבדיקה", body: "אושר", link: "/cases/1" };

describe("מטען ההתראה", () => {
  it("אין notification ברמה העליונה — הוא זה שיצר את הכפילות", () => {
    const m = buildPushMessage("tok", msg) as Record<string, unknown>;
    expect("notification" in (m.message as object)).toBe(false);
  });

  it("data קיים — ממנו ה-service worker מציג בעברית עם קישור", () => {
    const { message } = buildPushMessage("tok", msg);
    expect(message.data).toEqual({
      title: msg.title,
      body: msg.body,
      link: "/cases/1",
    });
  });

  it("apns נושא את הטקסט — בלעדיו iOS מקבל התראה אילמת", () => {
    const { message } = buildPushMessage("tok", msg);
    expect(message.apns.payload.aps.alert).toEqual({
      title: msg.title,
      body: msg.body,
    });
  });

  it("בלי קישור — ברירת המחדל היא הבית ולא undefined", () => {
    const { message } = buildPushMessage("tok", { title: "א", body: "ב" });
    expect(message.data.link).toBe("/");
  });

  it("הטוקן עובר כפי שהוא", () => {
    expect(buildPushMessage("abc123", msg).message.token).toBe("abc123");
  });
});
