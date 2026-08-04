import { describe, expect, it } from "vitest";
import { DELETION_GRACE_DAYS } from "./db";

/*
 * הצינון הוא הבטחה למשתמש ("אם תתחברו שוב — המחיקה תבוטל"), ולכן הוא
 * מספר שקובעים במודע. שינוי שלו הוא החלטת מוצר שנוגעת במה שכתוב על
 * המסך, והוא חייב להיכשל כאן קודם.
 */
describe("צינון המחיקה", () => {
  it("שבעה ימים", () => {
    expect(DELETION_GRACE_DAYS).toBe(7);
  });

  it("המועד נופל שבוע קדימה, לא בעבר", () => {
    const now = Date.parse("2026-08-04T21:00:00Z");
    const scheduled = now + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
    expect(scheduled - now).toBe(604_800_000);
    expect(new Date(scheduled).getUTCDate()).toBe(11);
  });
});
