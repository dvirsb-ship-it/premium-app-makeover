import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, describe, it } from "vitest";

/**
 * חוקי ה-Storage של סרטון האימות.
 *
 * הסרטון הוא תיעוד פנים — המידע הרגיש ביותר שאנחנו מחזיקים, לזמן הקצר
 * ביותר. החוקים חייבים להבטיח שרק בעל החשבון מעלה, שרק הוא והאדמין
 * צופים, ושהחריגה מ-15MB שניתנה לווידאו לא נפרצת לקבצים אחרים.
 */

const ADMIN_EMAIL = "justask.adv@gmail.com";

let env: RulesTestEnvironment;

function storageAs(uid: string, email = `${uid}@example.com`) {
  return env.authenticatedContext(uid, { email }).storage();
}

/** תוכן בגודל נתון — הבדיקה המעניינת היא סביב גבול ה-15MB הישן. */
function bytes(mb: number): Uint8Array {
  return new Uint8Array(Math.round(mb * 1024 * 1024));
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "justask-rules-test",
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("סרטון האימות — כתיבה", () => {
  it("בעל החשבון מעלה סרטון — גם מעל 15MB (החוק החדש)", async () => {
    await assertSucceeds(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/selfieVideo.mp4"), bytes(20), {
        contentType: "video/mp4",
      }),
    );
  });

  it("קובץ שאינו וידאו לא נהנה מהחריגה — 20MB של תמונה נדחים", async () => {
    await assertFails(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/selfieVideo.jpg"), bytes(20), {
        contentType: "image/jpeg",
      }),
    );
  });

  it("סרטון מעל 80MB נדחה", async () => {
    await assertFails(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/selfieVideo.mp4"), bytes(81), {
        contentType: "video/mp4",
      }),
    );
  });

  it("משתמש אחר לא מעלה לתיקייה של עורך הדין", async () => {
    await assertFails(
      uploadBytes(ref(storageAs("law2"), "verifications/law1/selfieVideo.mp4"), bytes(1), {
        contentType: "video/mp4",
      }),
    );
  });

  it("בלי התחברות — נדחה", async () => {
    await assertFails(
      uploadBytes(
        ref(env.unauthenticatedContext().storage(), "verifications/law1/selfieVideo.mp4"),
        bytes(1),
        { contentType: "video/mp4" },
      ),
    );
  });

  it("החריגה תקפה רק לנתיב selfieVideo.* — קובץ וידאו בשם אחר חוזר לתקרה הישנה", async () => {
    await assertFails(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/other.mp4"), bytes(20), {
        contentType: "video/mp4",
      }),
    );
  });
});

describe("סרטון האימות — קריאה", () => {
  beforeAll(async () => {
    await assertSucceeds(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/selfieVideo.mp4"), bytes(1), {
        contentType: "video/mp4",
      }),
    );
  });

  it("בעל החשבון קורא את הסרטון של עצמו", async () => {
    await assertSucceeds(getBytes(ref(storageAs("law1"), "verifications/law1/selfieVideo.mp4")));
  });

  it("האדמין קורא — זו ההשוואה מול התעודה", async () => {
    await assertSucceeds(
      getBytes(ref(storageAs("adminUid", ADMIN_EMAIL), "verifications/law1/selfieVideo.mp4")),
    );
  });

  it("עורך דין אחר לא צופה בפנים של מתחרה", async () => {
    await assertFails(getBytes(ref(storageAs("law2"), "verifications/law1/selfieVideo.mp4")));
  });
});

/*
 * ההרחבה של 08/2026 — סקירת אבטחה: סוגי קבצים, וקריאת התמונות
 * המצונזרות. שניהם היו פתוחים יותר משנדרש.
 */

describe("סוגי קבצים שמותר להעלות", () => {
  it("HTML נדחה — קובץ כזה מוגש חזרה כדף ומהווה XSS מאוחסן", async () => {
    await assertFails(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/barCard.html"), bytes(0.001), {
        contentType: "text/html",
      }),
    );
  });

  it("PDF ותמונה עדיין מותרים — אלו המסמכים האמיתיים", async () => {
    await assertSucceeds(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/diploma.pdf"), bytes(0.5), {
        contentType: "application/pdf",
      }),
    );
    await assertSucceeds(
      uploadBytes(ref(storageAs("law1"), "verifications/law1/barCard.jpg"), bytes(0.5), {
        contentType: "image/jpeg",
      }),
    );
  });

  it("קובץ תיק של הלקוח — HTML נדחה גם כאן", async () => {
    await assertFails(
      uploadBytes(ref(storageAs("client1"), "case-files/client1/doc.html"), bytes(0.001), {
        contentType: "text/html",
      }),
    );
  });
});
