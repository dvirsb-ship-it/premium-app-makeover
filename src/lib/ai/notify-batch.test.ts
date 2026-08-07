import { describe, expect, it } from "vitest";
import { BATCH_MAX, buildNotifyWrites } from "./server-admin";

/*
 * הבדיקות כאן קיימות בגלל תקלה שלא הייתה מתגלה בהדרגה.
 *
 * הקוד הקודם עשה `Promise.all` על הרשימה שמחזירה adminApprovedLawyerIds,
 * שתקרתה 500. כלומר בקשה אחת של לקוח פתחה עד 500 חיבורי HTTPS מקבילים
 * ממכונה עם CPU אחד — **והלקוח המתין לכולם** לפני שקיבל תשובה.
 *
 * עם עורך דין אחד רשום זה בלתי נראה לחלוטין. שני התנאים שמפילים את זה —
 * הרבה עורכי דין, והרבה תיקים — מתקיימים לראשונה באותו יום עצמו: היום
 * שבו קמפיין שיווקי עובד.
 */

const N = { type: "new_case", title: "תיק חדש", body: "ממתין לעורך דין" };
const ids = (count: number) => Array.from({ length: count }, (_, i) => `lawyer-${i}`);

describe("חלוקה לקבוצות", () => {
  it("רשימה ריקה — אין מה לשלוח", () => {
    expect(buildNotifyWrites([], N)).toEqual([]);
  });

  it("מתחת לתקרה — קבוצה אחת", () => {
    const chunks = buildNotifyWrites(ids(120), N);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(120);
  });

  it("בדיוק בתקרה — עדיין קבוצה אחת, לא שתיים", () => {
    const chunks = buildNotifyWrites(ids(BATCH_MAX), N);
    expect(chunks).toHaveLength(1);
  });

  it("מעל התקרה — מתפצל, ואף קבוצה אינה חורגת", () => {
    const chunks = buildNotifyWrites(ids(1250), N);
    expect(chunks).toHaveLength(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(BATCH_MAX);
  });

  it("אף נמען אינו נופל בין הקבוצות", () => {
    const input = ids(1250);
    const got = buildNotifyWrites(input, N)
      .flat()
      .map((w) => w.update.fields.userId.stringValue);
    expect(got).toHaveLength(input.length);
    expect(new Set(got).size).toBe(input.length);
    expect(got).toEqual(input);
  });
});

describe("מזהי המסמכים", () => {
  /*
   * שני מזהים זהים אינם מחזירים שגיאה — הכתיבה השנייה דורסת את הראשונה
   * בשקט, ועורך דין אחד פשוט לא מקבל התראה. זו התקלה שאי אפשר לראות.
   */
  it("ייחודיים בתוך קבוצה מלאה", () => {
    const w = buildNotifyWrites(ids(BATCH_MAX), N)[0];
    expect(new Set(w.map((x) => x.update.name)).size).toBe(BATCH_MAX);
  });

  it("ייחודיים גם על פני קבוצות, ואפילו כשהשעון קפוא", () => {
    const all = buildNotifyWrites(ids(1250), N, 1_700_000_000_000).flat();
    expect(new Set(all.map((x) => x.update.name)).size).toBe(1250);
  });

  it("הנתיב מצביע לאוסף ההתראות", () => {
    const w = buildNotifyWrites(ids(1), N)[0][0];
    expect(w.update.name).toContain("/notifications/");
  });
});

describe("תוכן ההתראה", () => {
  it("השדות שחוקי הגישה דורשים — כולם קיימים", () => {
    const f = buildNotifyWrites(ids(1), N)[0][0].update.fields;
    for (const k of ["userId", "type", "title", "body", "read", "createdAt"]) {
      expect(f, k).toHaveProperty(k);
    }
  });

  it("נולדת שלא-נקראה — החוקים דוחים read:true", () => {
    expect(buildNotifyWrites(ids(1), N)[0][0].update.fields.read.booleanValue).toBe(false);
  });

  it("caseId נכנס רק כשקיים — Firestore דוחה undefined", () => {
    expect(buildNotifyWrites(ids(1), N)[0][0].update.fields).not.toHaveProperty("caseId");
    const withCase = buildNotifyWrites(ids(1), { ...N, caseId: "c1" })[0][0];
    expect(withCase.update.fields.caseId?.stringValue).toBe("c1");
  });

  it("חותמת הזמן זהה לכל הנמענים באותה שליחה", () => {
    const stamps = buildNotifyWrites(ids(300), N, 1_700_000_000_000)
      .flat()
      .map((w) => w.update.fields.createdAt.integerValue);
    expect(new Set(stamps).size).toBe(1);
  });
});
