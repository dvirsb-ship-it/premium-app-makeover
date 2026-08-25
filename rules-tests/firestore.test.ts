import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

/**
 * חוקי הגישה הם ההגנה היחידה בין משתמש מחובר אקראי לבין תיקים משפטיים
 * של אנשים אמיתיים. מצאנו בהם חמש פרצות הסלמה — בקריאה ידנית.
 *
 * הבדיקות כאן מנסחות כל אחת מהפרצות האלה כתרחיש תקיפה, כדי שהשישית
 * תיתפס כאן ולא אצל לקוח.
 */

const SUPER = "justask.adv@gmail.com"; // אדמין-על — מאשר ומכריע
const VIEWER = "dvirsb@gmail.com"; // אדמין צופה — חשבון הבדיקות כלקוח
const OUTSIDER = "someone@example.com";

let env: RulesTestEnvironment;

/** משתמש מחובר עם אימייל בטוקן (החוקים בודקים request.auth.token.email). */
function as(uid: string, email = `${uid}@example.com`) {
  return env.authenticatedContext(uid, { email }).firestore();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "justask-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8181,
    },
  });
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // תפקידים
    await setDoc(doc(db, "users/client1"), { role: "client" });
    await setDoc(doc(db, "users/lawyerOk"), { role: "lawyer" });
    await setDoc(doc(db, "users/lawyerPending"), { role: "lawyer" });
    await setDoc(doc(db, "users/lawyerOther"), { role: "lawyer" });
    // מי מאומת ומי לא
    await setDoc(doc(db, "verifications/lawyerOk"), { status: "approved", specialties: ["injury"] });
    await setDoc(doc(db, "verifications/lawyerPending"), { status: "pending", specialties: ["injury"] });
    await setDoc(doc(db, "verifications/lawyerOther"), { status: "approved", specialties: ["injury"] });
    // תיק פתוח בפיד
    await setDoc(doc(db, "cases/openCase"), {
      clientId: "client1",
      status: "matching",
      title: "תיק",
      category: "נזיקין ותאונות",
      interested: [],
      interestedIds: [],
      createdAt: Date.now(),
    });
  });
});

/* ---------- פרצה 1: אישור עצמי כעורך דין ---------- */

describe("verifications", () => {
  it("בעל הבקשה אינו יכול לאשר את עצמו", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerPending"), "verifications/lawyerPending"), { status: "approved" }),
    );
  });

  /*
   * מסך עריכת התחומים (settings.specialties) נשען על ההיתר הזה: הוא
   * מעדכן את התחומים בלי לגעת בסטטוס, כדי שעורך דין מאומת שמוסיף תחום
   * לא יאבד את האימות ואת מקומו בפיד.
   *
   * מי שיהדק את הכלל ויחסום עדכון של עו"ד מאושר — ישבור את המסך הזה
   * בשקט, כי בקוד זו הבטחה שאין לה ביטוי. כאן היא כתובה.
   */
  it("עו״ד מאומת מעדכן תחומים בלי לגעת בסטטוס — מותר", async () => {
    await assertSucceeds(
      updateDoc(doc(as("lawyerOk"), "verifications/lawyerOk"), {
        specialties: ["injury", "realestate"],
      }),
    );
  });

  /*
   * הבדיקה הזו נכתבה תחילה על עו"ד מאושר, ונכשלה — בצדק. `diff` משווה
   * ערכים, ומי שכבר approved וכותב approved לא שינה דבר. המקרה שבאמת
   * מסוכן הוא ממתין שמנסה להבריח אישור בתוך עדכון תחומים תמים.
   */
  it("ממתין שמבריח status:approved בתוך עדכון תחומים — נחסם", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerPending"), "verifications/lawyerPending"), {
        specialties: ["injury", "realestate"],
        status: "approved",
      }),
    );
  });

  it("בעל הבקשה כן יכול לתקן פרטים ולהגיש מחדש", async () => {
    await assertSucceeds(
      updateDoc(doc(as("lawyerPending"), "verifications/lawyerPending"), {
        status: "pending",
        barNumber: "12345",
      }),
    );
  });

  it("בעל הבקשה אינו יכול לזייף תאריך בדיקה", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerPending"), "verifications/lawyerPending"), { reviewedAt: Date.now() }),
    );
  });

  it("בעל הבקשה אינו יכול להעיד על עצמו שנבדק מול הפנקס", async () => {
    /*
     * זו הראיה היחידה לכך שהאישור לא ניתן על סמך מסמך שהוא עצמו העלה.
     * אם הוא יכול לכתוב אותה — אין לה שום ערך.
     */
    await assertFails(
      updateDoc(doc(as("lawyerPending"), "verifications/lawyerPending"), {
        registryCheckedAt: Date.now(),
      }),
    );
    await assertFails(
      updateDoc(doc(as("lawyerPending"), "verifications/lawyerPending"), {
        registryCheckedBy: "justask.adv@gmail.com",
      }),
    );
  });

  it("אדמין-על רושם את הבדיקה מול הפנקס יחד עם האישור", async () => {
    await assertSucceeds(
      updateDoc(doc(as("super", SUPER), "verifications/lawyerPending"), {
        status: "approved",
        reviewedAt: Date.now(),
        registryCheckedAt: Date.now(),
        registryCheckedBy: "justask.adv@gmail.com",
      }),
    );
  });

  it("אדמין-על מאשר; אדמין-צופה לא", async () => {
    await assertFails(
      updateDoc(doc(as("viewer", VIEWER), "verifications/lawyerPending"), {
        status: "approved",
        reviewedAt: Date.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(as("super", SUPER), "verifications/lawyerPending"), {
        status: "approved",
        reviewedAt: Date.now(),
      }),
    );
  });

  it("זר אינו קורא בקשת אימות של אחר", async () => {
    await assertFails(getDoc(doc(as("outsider", OUTSIDER), "verifications/lawyerOk")));
  });
});

/* ---------- פרצה 2: קריאת כל התיקים בפיד ---------- */

describe("קריאת תיקים", () => {
  it("עו״ד מאושר רואה תיקים בפיד", async () => {
    await assertSucceeds(getDoc(doc(as("lawyerOk"), "cases/openCase")));
  });

  it("עו״ד שטרם אושר אינו רואה תיקים — גם אם role=lawyer", async () => {
    await assertFails(getDoc(doc(as("lawyerPending"), "cases/openCase")));
  });

  it("משתמש שכתב לעצמו role=lawyer אינו רואה כלום בלי אימות", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/attacker"), { role: "lawyer" });
    });
    await assertFails(getDoc(doc(as("attacker", OUTSIDER), "cases/openCase")));
  });

  it("הלקוח קורא את התיק שלו", async () => {
    await assertSucceeds(getDoc(doc(as("client1"), "cases/openCase")));
  });

  it("לקוח אחר אינו קורא תיק שאינו שלו", async () => {
    await assertFails(getDoc(doc(as("client2"), "cases/openCase")));
  });
});

/* ---------- פרצה 3: עקיפת שומר הסף ---------- */

describe("יצירת תיק", () => {
  const base = {
    clientId: "client1",
    title: "",
    category: "",
    interested: [],
    interestedIds: [],
    createdAt: Date.now(),
  };

  it("תיק נולד תמיד במצב בדיקה", async () => {
    await assertSucceeds(
      setDoc(doc(as("client1"), "cases/new1"), { ...base, status: "validating" }),
    );
  });

  it("אי אפשר ליצור תיק ישירות בפיד — זו עקיפת הוולידציה", async () => {
    await assertFails(setDoc(doc(as("client1"), "cases/new2"), { ...base, status: "matching" }));
  });

  it("אי אפשר ליצור תיק בשם מישהו אחר", async () => {
    await assertFails(
      setDoc(doc(as("client2"), "cases/new3"), { ...base, status: "validating" }),
    );
  });

  it("אי אפשר להיוולד עם מתעניינים או הצעות", async () => {
    await assertFails(
      setDoc(doc(as("client1"), "cases/new4"), {
        ...base,
        status: "validating",
        interestedIds: ["lawyerOk"],
      }),
    );
    await assertFails(
      setDoc(doc(as("client1"), "cases/new5"), {
        ...base,
        status: "validating",
        offers: { lawyerOk: { amount: 10 } },
      }),
    );
  });

  it("הלקוח אינו יכול לדחוף תיק שנדחה/בבדיקה אל תוך הפיד", async () => {
    /*
     * זו עקיפת שומר הסף האמיתית: לקוח שהתיק שלו נדחה מגלגל אותו בעצמו
     * ל-matching. הגרסה הקודמת של הבדיקה עדכנה status ל-matching על תיק
     * שכבר היה matching — כלומר diff ריק, ולכן היא עברה בלי לבדוק כלום.
     */
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cases/pending1"), {
        clientId: "client1",
        status: "validating",
        title: "",
        category: "",
        interested: [],
        interestedIds: [],
        createdAt: Date.now(),
      });
      await setDoc(doc(ctx.firestore(), "cases/rejected1"), {
        clientId: "client1",
        status: "rejected",
        title: "",
        category: "",
        interested: [],
        interestedIds: [],
        createdAt: Date.now(),
      });
    });
    await assertFails(updateDoc(doc(as("client1"), "cases/pending1"), { status: "matching" }));
    await assertFails(updateDoc(doc(as("client1"), "cases/rejected1"), { status: "matching" }));
    await assertFails(
      updateDoc(doc(as("client1"), "cases/pending1"), { status: "has_interest" }),
    );
  });

  it("תיק אינו נמחק לעולם", async () => {
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(deleteDoc(doc(as("client1"), "cases/openCase")));
    await assertFails(deleteDoc(doc(as("super", SUPER), "cases/openCase")));
  });
});

/* ---------- פרצה 4: מחיקת הצעות מתחרים ---------- */

describe("הבעת עניין והצעות", () => {
  /* חותמת קבועה — כדי שאפשר יהיה לשחזר את הצעת המתחרה בדיוק, בלי לגעת בה */
  const OTHER_OFFER = { amount: 15, at: 1700000000000 };

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "cases/openCase"), {
        status: "has_interest",
        interested: [{ id: "lawyerOther" }],
        interestedIds: ["lawyerOther"],
        offers: { lawyerOther: OTHER_OFFER },
      });
    });
  });

  it("עו״ד מאושר מוסיף את עצמו ואת ההצעה שלו", async () => {
    await assertSucceeds(
      updateDoc(doc(as("lawyerOk"), "cases/openCase"), {
        status: "has_interest",
        interested: [{ id: "lawyerOther" }, { id: "lawyerOk" }],
        interestedIds: ["lawyerOther", "lawyerOk"],
        offers: { lawyerOther: OTHER_OFFER, lawyerOk: { amount: 12, at: 2 } },
      }),
    );
  });

  it("עו״ד אינו יכול לשנות את ההצעה של מתחרה", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerOk"), "cases/openCase"), {
        status: "has_interest",
        interested: [{ id: "lawyerOther" }, { id: "lawyerOk" }],
        interestedIds: ["lawyerOther", "lawyerOk"],
        offers: { lawyerOther: { ...OTHER_OFFER, amount: 99 }, lawyerOk: { amount: 12, at: 2 } },
      }),
    );
  });

  it("תיק מלא אינו מקבל הצעה נוספת — תקרת MAX_OFFERS_PER_CASE", async () => {
    /*
     * התקרה נבדקת כאן ולא רק במסך: הבעת עניין היא כתיבה ישירה
     * ל-Firestore, ולכן בדיקה בקוד הלקוח בלבד היא בקשה ולא מגבלה.
     */
    const ten = Array.from({ length: 10 }, (_, i) => `l${i}`);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "cases/openCase"), {
        status: "has_interest",
        interested: ten.map((id) => ({ id })),
        interestedIds: ten,
      });
    });
    await assertFails(
      updateDoc(doc(as("lawyerOk"), "cases/openCase"), {
        status: "has_interest",
        interested: [...ten.map((id) => ({ id })), { id: "lawyerOk" }],
        interestedIds: [...ten, "lawyerOk"],
      }),
    );
  });

  it("התיק העשירי עדיין נכנס — הגבול הוא 10 ולא 9", async () => {
    const nine = Array.from({ length: 9 }, (_, i) => `l${i}`);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "cases/openCase"), {
        status: "has_interest",
        interested: nine.map((id) => ({ id })),
        interestedIds: nine,
      });
    });
    await assertSucceeds(
      updateDoc(doc(as("lawyerOk"), "cases/openCase"), {
        status: "has_interest",
        interested: [...nine.map((id) => ({ id })), { id: "lawyerOk" }],
        interestedIds: [...nine, "lawyerOk"],
      }),
    );
  });

  it("רשימת המתעניינים אינה יכולה להתכווץ", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerOk"), "cases/openCase"), {
        status: "has_interest",
        interested: [{ id: "lawyerOk" }],
        interestedIds: ["lawyerOk"],
      }),
    );
  });

  it("עו״ד שטרם אושר אינו יכול להביע עניין", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerPending"), "cases/openCase"), {
        status: "has_interest",
        interested: [{ id: "lawyerOther" }, { id: "lawyerPending" }],
        interestedIds: ["lawyerOther", "lawyerPending"],
      }),
    );
  });
});

/* ---------- אבני דרך: בסיס לחיוב, ולכן הוספה-בלבד ---------- */

describe("milestones", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "cases/openCase"), {
        status: "connected",
        chosenLawyerId: "lawyerOk",
      });
    });
  });

  it("העו״ד הנבחר מסמן אבן דרך בחותמת אמת", async () => {
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "cases/openCase/milestones/met"), {
        key: "met",
        at: Date.now(),
      }),
    );
  });

  it("אי אפשר לתארך אבן דרך אחורה", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "cases/openCase/milestones/filed"), {
        key: "filed",
        at: Date.now() - 90 * 24 * 60 * 60 * 1000,
      }),
    );
  });

  it("עו״ד אחר אינו מסמן על תיק שאינו שלו", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOther"), "cases/openCase/milestones/met"), {
        key: "met",
        at: Date.now(),
      }),
    );
  });

  it("אבן דרך שסומנה אינה נמחקת ואינה משתנה", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cases/openCase/milestones/met"), {
        key: "met",
        at: Date.now(),
      });
    });
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(
      updateDoc(doc(as("lawyerOk"), "cases/openCase/milestones/met"), { at: 1 }),
    );
    await assertFails(deleteDoc(doc(as("lawyerOk"), "cases/openCase/milestones/met")));
  });

  it("העו״ד הנבחר סוגר את התיק כשסיים", async () => {
    await assertSucceeds(
      updateDoc(doc(as("lawyerOk"), "cases/openCase"), { status: "closed" }),
    );
  });

  it("עו״ד אחר אינו סוגר תיק שאינו שלו, והלקוח אינו סוגר בעצמו", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerOther"), "cases/openCase"), { status: "closed" }),
    );
    await assertFails(
      updateDoc(doc(as("client1"), "cases/openCase"), { status: "closed" }),
    );
  });

  it("סגירה אינה יכולה לגרור שינוי שדה נוסף", async () => {
    await assertFails(
      updateDoc(doc(as("lawyerOk"), "cases/openCase"), {
        status: "closed",
        title: "שונה",
      }),
    );
  });

  it("הלקוח קורא את ציר הזמן", async () => {
    await assertSucceeds(getDocs(collection(as("client1"), "cases/openCase/milestones")));
  });
});

/* ---------- פרטי קשר: נחשפים רק אחרי בחירה ---------- */

describe("פרטי קשר של עו״ד על התיק", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cases/openCase/contacts/lawyerOk"), {
        phone: "050-0000000",
      });
    });
  });

  it("הלקוח אינו רואה פרטי קשר לפני שבחר", async () => {
    await assertFails(getDoc(doc(as("client1"), "cases/openCase/contacts/lawyerOk")));
  });

  it("אחרי הבחירה — הלקוח רואה", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "cases/openCase"), { chosenLawyerId: "lawyerOk" });
    });
    await assertSucceeds(getDoc(doc(as("client1"), "cases/openCase/contacts/lawyerOk")));
  });

  it("עו״ד אחר לעולם אינו רואה", async () => {
    await assertFails(getDoc(doc(as("lawyerOther"), "cases/openCase/contacts/lawyerOk")));
  });
});

/* ---------- אוספים שנכתבים בשרת בלבד ---------- */

describe("נתונים שרק השרת כותב", () => {
  it("מדד התגובתיות אינו ניתן לניפוח מהדפדפן", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "lawyerStats/lawyerOk"), { responses: 999, ratingSum: 5000 }),
    );
  });

  it("דירוגים נכתבים רק בשרת", async () => {
    await assertFails(
      setDoc(doc(as("client1"), "ratings/openCase"), {
        clientId: "client1",
        lawyerId: "lawyerOk",
        stars: 5,
      }),
    );
  });

  it("הלקוח קורא את הדירוג שנתן; זר לא", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "ratings/openCase"), {
        clientId: "client1",
        lawyerId: "lawyerOk",
        stars: 5,
      });
    });
    await assertSucceeds(getDoc(doc(as("client1"), "ratings/openCase")));
    await assertSucceeds(getDoc(doc(as("lawyerOk"), "ratings/openCase")));
    await assertFails(getDoc(doc(as("lawyerOther"), "ratings/openCase")));
  });

  it("מונה השימוש היומי אינו ניתן לאיפוס מהדפדפן", async () => {
    await assertFails(setDoc(doc(as("client1"), "usage/client1"), { intakeTurn: 0 }));
  });

  it("יומן התקלות אינו ניתן לכתיבה, ורק אדמין קורא", async () => {
    await assertFails(setDoc(doc(as("client1"), "serverErrors/x"), { message: "x" }));
    await assertFails(getDoc(doc(as("client1"), "serverErrors/x")));
    await assertSucceeds(getDoc(doc(as("viewer", VIEWER), "serverErrors/x")));
  });
});

/* ---------- התזכיר המשפטי: עבודה שנועדה לעו״ד מאומת ---------- */

describe("memo", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cases/openCase/memo/full"), { text: "ניתוח" });
    });
  });

  it("עו״ד מאושר אינו קורא עוד תזכיר של תיק בפיד (הפיבוט, 20/8/2026)", async () => {
    // openCase הוא במצב matching בלי chosenLawyerId — במודל הישן זה
    // הספיק; היום תזכיר נקרא רק על תיק שחובר לעורך הדין הקורא.
    await assertFails(getDoc(doc(as("lawyerOk"), "cases/openCase/memo/full")));
  });

  it("עו״ד שטרם אושר אינו קורא", async () => {
    await assertFails(getDoc(doc(as("lawyerPending"), "cases/openCase/memo/full")));
  });

  it("אף אחד אינו כותב לתזכיר", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "cases/openCase/memo/full"), { text: "שוכתב" }),
    );
  });
});

/* ---------- מדידת המשפך ---------- */

describe("funnelEvents", () => {
  it("משתמש כותב אירוע על עצמו", async () => {
    await assertSucceeds(
      setDoc(doc(as("client1"), "funnelEvents/e1"), {
        uid: "client1",
        event: "intake_opened",
        at: Date.now(),
      }),
    );
  });

  it("אי אפשר לכתוב אירוע בשם מישהו אחר", async () => {
    await assertFails(
      setDoc(doc(as("client1"), "funnelEvents/e2"), {
        uid: "client2",
        event: "intake_opened",
        at: Date.now(),
      }),
    );
  });

  it("האוסף אינו צינור כתיבה חופשי", async () => {
    // שדה נוסף, טקסט ארוך, או חותמת שאינה מספר — הכל נדחה
    await assertFails(
      setDoc(doc(as("client1"), "funnelEvents/e3"), {
        uid: "client1",
        event: "intake_opened",
        at: Date.now(),
        payload: "תוכן השיחה של המשתמש",
      }),
    );
    await assertFails(
      setDoc(doc(as("client1"), "funnelEvents/e4"), {
        uid: "client1",
        event: "x".repeat(60),
        at: Date.now(),
      }),
    );
  });

  it("אירוע שנכתב אינו ניתן לשינוי או למחיקה מהדפדפן", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "funnelEvents/e5"), {
        uid: "client1",
        event: "intake_opened",
        at: Date.now(),
      });
    });
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(updateDoc(doc(as("client1"), "funnelEvents/e5"), { event: "x" }));
    await assertFails(deleteDoc(doc(as("client1"), "funnelEvents/e5")));
  });

  it("רק האדמין קורא", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "funnelEvents/e6"), {
        uid: "client1",
        event: "intake_opened",
        at: Date.now(),
      });
    });
    await assertFails(getDoc(doc(as("client1"), "funnelEvents/e6")));
    await assertSucceeds(getDoc(doc(as("viewer", VIEWER), "funnelEvents/e6")));
  });
});

/* ---------- ברירת המחדל: הכל חסום ---------- */

/* ---------- פרצה 6: פרטי הקשר של הלקוח דולפים לפיד ---------- */

describe("פרטי הקשר של הלקוח", () => {
  it("לקוח אינו יכול לכתוב פרטי קשר על תיק שעדיין בפיד", async () => {
    /*
     * זו ההבטחה שבדף הנחיתה: "הפנייה נפתחת בפניך, בלי שם ובלי פרטי
     * קשר". Firestore אינו יודע להסתיר שדה בודד — ברגע ש-clientContact
     * יושב על תיק בסטטוס matching, כל עורך דין מאושר בפיד קורא את
     * הטלפון. עד היום זה נמנע רק בסדר הפעולות של הקוד.
     */
    await assertFails(
      updateDoc(doc(as("client1"), "cases/openCase"), {
        clientContact: { name: "דנה", phone: "0500000000", email: "d@e.com" },
      }),
    );
  });

  it("פרטי קשר מותרים כשהתיק נעשה מחובר — באותה כתיבה", async () => {
    await assertSucceeds(
      updateDoc(doc(as("client1"), "cases/openCase"), {
        chosenLawyerId: "lawyerOk",
        status: "connected",
        clientContact: { name: "דנה", phone: "0500000000", email: "d@e.com" },
      }),
    );
  });

  it("עו״ד בפיד אינו רואה תיק מחובר שאינו שלו", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cases/connectedCase"), {
        clientId: "client1",
        chosenLawyerId: "lawyerOk",
        status: "connected",
        clientContact: { name: "דנה", phone: "0500000000", email: "d@e.com" },
        interested: [],
        interestedIds: [],
      });
    });
    await assertFails(getDoc(doc(as("lawyerOther"), "cases/connectedCase")));
    await assertSucceeds(getDoc(doc(as("lawyerOk"), "cases/connectedCase")));
  });
});

/* ---------- פרצה 7: התראות כצינור פישינג ---------- */

describe("התראות", () => {
  const base = {
    userId: "client1",
    type: "lawyer_interest",
    title: "עורך דין הביע עניין",
    body: "יש התעניינות בתיק שלך",
    read: false,
  };

  it("התראה תקינה נכתבת", async () => {
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "notifications/n1"), { ...base, createdAt: Date.now() }),
    );
  });

  it("not_chosen נכתבת מהדפדפן — הלקוח שבוחר הוא מי ששולח אותה", async () => {
    /*
     * ההתראה למי שלא נבחר נשלחת מהטאב של הלקוח ברגע הבחירה, בדיוק כמו
     * 'chosen'. סוג שחסר ברשימת ההיתרים נדחה בשקט — וזו בדיוק התקלה
     * שההערה בחוקים מתעדת, אז הסוג החדש מקובע כאן.
     */
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "notifications/n1b"), {
        ...base,
        type: "not_chosen",
        createdAt: Date.now(),
      }),
    );
  });

  it("סוג של השרת נדחה — 'תיק חדש בתחום שלך' לא ניתן לזיוף מהדפדפן", async () => {
    /*
     * case_validated דווקא כן נכתב מהדפדפן (מסך הוולידציה רץ בטאב של
     * הלקוח) — הדוגמה כאן חייבת להיות סוג שנשלח רק ב-Admin SDK, כמו
     * ההפצה לעורכי הדין על תיק חדש.
     */
    await assertFails(
      setDoc(doc(as("lawyerOk"), "notifications/n2"), {
        ...base,
        type: "new_case",
        createdAt: Date.now(),
      }),
    );
  });

  it("כותרת ארוכה מדי נדחית", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "notifications/n3"), {
        ...base,
        title: "א".repeat(200),
        createdAt: Date.now(),
      }),
    );
  });

  it("חותמת זמן מזויפת נדחית", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "notifications/n4"), {
        ...base,
        createdAt: Date.now() + 86400000,
      }),
    );
  });

  it("read:true בכתיבה נדחה — התראה נולדת שלא־נקראה", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "notifications/n5"), {
        ...base,
        read: true,
        createdAt: Date.now(),
      }),
    );
  });
});

/* ---------- פרצה 8: פנייה לתמיכה בשם מישהו אחר ---------- */

describe("פניות תמיכה", () => {
  it("פנייה חייבת לשאת את מזהה פותחה", async () => {
    await assertFails(
      setDoc(doc(as("client1"), "supportTickets/t1"), {
        userId: "someoneElse",
        email: "a@b.com",
        message: "שלום",
        status: "open",
        createdAt: Date.now(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(as("client1"), "supportTickets/t2"), {
        userId: "client1",
        email: "a@b.com",
        message: "שלום",
        status: "open",
        createdAt: Date.now(),
      }),
    );
  });
});

describe("ברירת מחדל", () => {
  it("אוסף שלא הוגדר בחוקים חסום לגמרי", async () => {
    await assertFails(getDoc(doc(as("client1"), "somethingElse/x")));
    await assertFails(setDoc(doc(as("client1"), "somethingElse/x"), { a: 1 }));
  });
});

/*
 * מחיקה מתוזמנת. זו הבטחה שנשענת על החוקים: אם אפשר לסמן "done"
 * מהדפדפן, מחיקה מבוטלת בלי שקרתה — והמשתמש כבר התבשר שהיא תקרה.
 */
describe("מחיקת חשבון מתוזמנת", () => {
  const req = (uid: string) => ({
    userId: uid,
    email: "a@b.com",
    reason: "",
    status: "scheduled",
    createdAt: Date.now(),
    scheduledFor: Date.now() + 7 * 86400_000,
  });

  it("משתמש מתזמן מחיקה של עצמו", async () => {
    await assertSucceeds(
      setDoc(doc(as("client"), "deletionRequests/client"), req("client")),
    );
  });

  it("אי אפשר לתזמן מחיקה של מישהו אחר", async () => {
    await assertFails(
      setDoc(doc(as("client"), "deletionRequests/victim"), req("victim")),
    );
  });

  it("התחברות מבטלת — ביטול מותר", async () => {
    await setDoc(doc(as("client"), "deletionRequests/client"), req("client"));
    await assertSucceeds(
      updateDoc(doc(as("client"), "deletionRequests/client"), {
        status: "cancelled",
        cancelledAt: Date.now(),
      }),
    );
  });

  it("סימון 'בוצע' מהדפדפן נדחה — אחרת מוחקים בלי למחוק", async () => {
    await setDoc(doc(as("client"), "deletionRequests/client"), req("client"));
    await assertFails(
      updateDoc(doc(as("client"), "deletionRequests/client"), {
        status: "done",
        purgedAt: Date.now(),
      }),
    );
  });

  it("דחיית המועד נדחית — אחרת אפשר לדחות את המחיקה לנצח", async () => {
    await setDoc(doc(as("client"), "deletionRequests/client"), req("client"));
    await assertFails(
      updateDoc(doc(as("client"), "deletionRequests/client"), {
        scheduledFor: Date.now() + 999 * 86400_000,
      }),
    );
  });
});

/*
 * משיכת פנייה. הכלל שאסור שיישחק: תיק מחובר אינו נמשך בלחיצה חד-צדדית,
 * כי בשלב הזה יש כבר יחסי עו"ד-לקוח.
 */
describe("משיכת פנייה ע\"י הפונה", () => {
  const mk = (status: string, extra: Record<string, unknown> = {}) => ({
    clientId: "client",
    title: "t",
    category: "נזיקין ותאונות",
    summary: "s",
    description: "d",
    status,
    createdAt: Date.now(),
    interested: [],
    interestedIds: [],
    ...extra,
  });
  const withdraw = { status: "withdrawn", withdrawnAt: Date.now() };
  const seed = async (id: string, status: string, extra = {}) =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `cases/${id}`), mk(status, extra));
    });

  it("מושך פנייה שממתינה לעורכי דין", async () => {
    await seed("c1", "matching");
    await assertSucceeds(updateDoc(doc(as("client"), "cases/c1"), withdraw));
  });

  it("מושך פנייה שיש בה התעניינות", async () => {
    await seed("c2", "has_interest");
    await assertSucceeds(updateDoc(doc(as("client"), "cases/c2"), withdraw));
  });

  /*
   * מודל הבחירה (25/8/2026): המסך אפשר משיכה מ-summary_ready
   * ו-awaiting_selection, אבל החוק הכיר רק בסטטוסי הפיד הישנים —
   * וכל משיכה של תיק חדש נדחתה. הבדיקות האלה מקבעות את התיקון.
   */
  it("מושך פנייה עם סיכום שממתין לאישור (מודל הבחירה)", async () => {
    await seed("c6", "summary_ready");
    await assertSucceeds(updateDoc(doc(as("client"), "cases/c6"), withdraw));
  });

  it("מושך פנייה שממתינה לבחירת עורך דין (מודל הבחירה)", async () => {
    await seed("c7", "awaiting_selection");
    await assertSucceeds(updateDoc(doc(as("client"), "cases/c7"), withdraw));
  });

  it("אי אפשר למשוך תיק מחובר — יש כבר עו\"ד שעובד עליו", async () => {
    await seed("c3", "connected", { chosenLawyerId: "lawyerOk" });
    await assertFails(updateDoc(doc(as("client"), "cases/c3"), withdraw));
  });

  it("אי אפשר למשוך תיק של מישהו אחר", async () => {
    await seed("c4", "matching", { clientId: "someoneElse" });
    await assertFails(updateDoc(doc(as("client"), "cases/c4"), withdraw));
  });

  it("המשיכה אינה משמשת כדי לשנות שדות אחרים", async () => {
    await seed("c5", "has_interest");
    await assertFails(
      updateDoc(doc(as("client"), "cases/c5"), { ...withdraw, category: "פלילי" }),
    );
  });
});

/* ---------- פרצה 6: התזכיר חי מחוץ לחלון של התיק ---------- */

/*
 * שמונה בלוקי חוקים לא נגעו בהם בדיקות עד 18/8/2026, וביניהם השניים
 * שנושאים את המידע הרגיש ביותר: התזכיר ופרטי הקשר. הקבוצה הזו סוגרת
 * את שניהם, ואת הסיבה שהפער נוצר מלכתחילה — **תת-אוסף אינו יורש את
 * חוקי האב ב-Firestore.** חסימת מסמך התיק אינה חוסמת מה שמתחתיו.
 */
describe("תת-אוספים של תיק", () => {
  async function seedMemo(
    caseId: string,
    status: string,
    chosenLawyerId: string | null = null,
  ) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, `cases/${caseId}`), {
        clientId: "client1",
        status,
        ...(chosenLawyerId ? { chosenLawyerId } : {}),
        interestedIds: [],
        createdAt: Date.now(),
      });
      await setDoc(doc(db, `cases/${caseId}/memo/full`), { text: "פרטים רפואיים" });
    });
  }

  it("תזכיר ישן בפיד — אינו נקרא עוד מאז הפיבוט (20/8/2026)", async () => {
    // הזרוע של matching הוסרה: תזכירים הם שריד המודל הישן, וקוראים
    // אותם רק על תיק שחובר. תיק שנשאר בסטטוס פיד ישן — סגור.
    await seedMemo("mFeed", "matching");
    await assertFails(getDoc(doc(as("lawyerOk"), "cases/mFeed/memo/full")));
  });

  it("הנבחר ממשיך לקרוא אחרי החיבור", async () => {
    await seedMemo("mMine", "connected", "lawyerOk");
    await assertSucceeds(getDoc(doc(as("lawyerOk"), "cases/mMine/memo/full")));
  });

  it("עו״ד אחר אינו קורא תזכיר של תיק שחובר למישהו", async () => {
    await seedMemo("mTaken", "connected", "lawyerOther");
    await assertFails(getDoc(doc(as("lawyerOk"), "cases/mTaken/memo/full")));
  });

  it("תיק סגור אינו נקרא יותר", async () => {
    await seedMemo("mClosed", "closed");
    await assertFails(getDoc(doc(as("lawyerOk"), "cases/mClosed/memo/full")));
  });

  it("תיק שנדחה אינו נקרא", async () => {
    await seedMemo("mRejected", "rejected");
    await assertFails(getDoc(doc(as("lawyerOk"), "cases/mRejected/memo/full")));
  });

  it("עו״ד שטרם אושר אינו קורא תזכיר כלל", async () => {
    await seedMemo("mFeed2", "matching");
    await assertFails(getDoc(doc(as("lawyerPending"), "cases/mFeed2/memo/full")));
  });

  it("הלקוח עצמו אינו קורא את התזכיר — הוא נכתב לעורך הדין", async () => {
    await seedMemo("mFeed3", "matching");
    await assertFails(getDoc(doc(as("client1"), "cases/mFeed3/memo/full")));
  });

  it("איש אינו כותב תזכיר מהדפדפן", async () => {
    await seedMemo("mFeed4", "matching");
    await assertFails(
      setDoc(doc(as("lawyerOk"), "cases/mFeed4/memo/full"), { text: "מזויף" }),
    );
  });

  /* ---------- פרטי הקשר של עורך הדין על התיק ---------- */

  async function seedContact(caseId: string, chosenLawyerId: string | null) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, `cases/${caseId}`), {
        clientId: "client1",
        status: chosenLawyerId ? "connected" : "has_interest",
        ...(chosenLawyerId ? { chosenLawyerId } : {}),
        interestedIds: ["lawyerOk"],
        createdAt: Date.now(),
      });
      await setDoc(doc(db, `cases/${caseId}/contacts/lawyerOk`), { phone: "050" });
    });
  }

  it("הלקוח קורא פרטי קשר רק של מי שבחר", async () => {
    await seedContact("kMine", "lawyerOk");
    await assertSucceeds(getDoc(doc(as("client1"), "cases/kMine/contacts/lawyerOk")));
  });

  it("הלקוח אינו קורא פרטי קשר לפני שבחר", async () => {
    await seedContact("kOpen", null);
    await assertFails(getDoc(doc(as("client1"), "cases/kOpen/contacts/lawyerOk")));
  });

  it("עו״ד אינו קורא את פרטי הקשר של עו״ד אחר", async () => {
    await seedContact("kOther", "lawyerOk");
    await assertFails(getDoc(doc(as("lawyerOther"), "cases/kOther/contacts/lawyerOk")));
  });

  it("עו״ד אינו כותב פרטי קשר בשם עמית", async () => {
    await seedContact("kSpoof", null);
    await assertFails(
      setDoc(doc(as("lawyerOther"), "cases/kSpoof/contacts/lawyerOk"), { phone: "052" }),
    );
  });
});

/* ---------- ששת הבלוקים שנשארו בלי כיסוי ---------- */

/*
 * לא פרצות ידועות — כיסוי. כל אחד מהם נקרא ידנית ב-18/8/2026 ונמצא
 * תקין; הבדיקות כאן מקבעות את ההתנהגות כדי ששינוי עתידי לא יפתח
 * אותה בשקט, כפי שקרה לתזכיר.
 */
describe("אוספים ללא כיסוי קודם", () => {
  it("lawyerProfiles — הבעלים כותב, אחר לא", async () => {
    await assertSucceeds(setDoc(doc(as("lawyerOk"), "lawyerProfiles/lawyerOk"), { bio: "שלי" }));
    await assertFails(setDoc(doc(as("lawyerOther"), "lawyerProfiles/lawyerOk"), { bio: "גנוב" }));
  });

  /*
   * הפרופיל אינו דורש אימות — כל מחובר יכול לכתוב פרופיל על ה-uid
   * שלו. היום זה בלתי מזיק: אין מסך שמפרט פרופילים, והם נקראים לפי
   * uid של עורך דין שכבר הגיש הצעה. **זה משתנה ברגע שיהיה מדריך** —
   * ואז יידרש כאן isApprovedLawyer(). הבדיקה מתעדת את המצב הנוכחי
   * כדי שהמעבר יהיה החלטה ולא הפתעה.
   */
  it("lawyerProfiles — כרגע גם לקוח יכול לכתוב פרופיל על עצמו", async () => {
    await assertSucceeds(setDoc(doc(as("client1"), "lawyerProfiles/client1"), { bio: "אני" }));
  });

  it("lawyerContacts — רק הבעלים והאדמין קוראים", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "lawyerContacts/lawyerOk"), { phone: "050" });
    });
    await assertSucceeds(getDoc(doc(as("lawyerOk"), "lawyerContacts/lawyerOk")));
    await assertSucceeds(getDoc(doc(as("admin", SUPER), "lawyerContacts/lawyerOk")));
    await assertFails(getDoc(doc(as("lawyerOther"), "lawyerContacts/lawyerOk")));
    await assertFails(getDoc(doc(as("client1"), "lawyerContacts/lawyerOk")));
  });

  it("lawyerLeads — איש אינו כותב, רק אדמין קורא", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "lawyerLeads/l1"), { email: "a@b.c" });
    });
    await assertSucceeds(getDoc(doc(as("admin", SUPER), "lawyerLeads/l1")));
    await assertFails(getDoc(doc(as("lawyerOk"), "lawyerLeads/l1")));
    await assertFails(setDoc(doc(as("lawyerOk"), "lawyerLeads/l2"), { email: "x@y.z" }));
  });

  it("system — אדמין קורא, איש אינו כותב", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "system/config"), { v: 1 });
    });
    await assertSucceeds(getDoc(doc(as("admin", SUPER), "system/config")));
    await assertFails(getDoc(doc(as("lawyerOk"), "system/config")));
    await assertFails(setDoc(doc(as("admin", SUPER), "system/config"), { v: 2 }));
  });

  it("appeals — מגיש בשמו בלבד, ורק אדמין-על מכריע", async () => {
    // המזהה חייב להיות lawyerId_caseId מאז 18/8/2026 — ראו describe("תקרות")
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "appeals/lawyerOk_ca"), {
        lawyerId: "lawyerOk", caseId: "ca", status: "open",
      }),
    );
    await assertFails(
      setDoc(doc(as("lawyerOk"), "appeals/lawyerOther_ca"), {
        lawyerId: "lawyerOther", caseId: "ca", status: "open",
      }),
    );
    // הצופה (VIEWER) הוא אדמין אך לא אדמין-על — אינו מכריע
    await assertFails(
      updateDoc(doc(as("viewer", VIEWER), "appeals/lawyerOk_ca"), { status: "accepted" }),
    );
    await assertSucceeds(
      updateDoc(doc(as("admin", SUPER), "appeals/lawyerOk_ca"), {
        status: "accepted", reviewedAt: Date.now(),
      }),
    );
  });

  it("milestones — הנבחר מסמן בחותמת אמת, ואינו מתארך אחורה", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cases/msCase"), {
        clientId: "client1",
        chosenLawyerId: "lawyerOk",
        status: "connected",
        interestedIds: [],
        createdAt: Date.now(),
      });
    });
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "cases/msCase/milestones/met"), { key: "met", at: Date.now() }),
    );
    // חותמת ישנה בשבוע — נדחית
    await assertFails(
      setDoc(doc(as("lawyerOk"), "cases/msCase/milestones/filed"), {
        key: "filed",
        at: Date.now() - 7 * 24 * 60 * 60 * 1000,
      }),
    );
    // עו״ד שאינו הנבחר
    await assertFails(
      setDoc(doc(as("lawyerOther"), "cases/msCase/milestones/closed"), {
        key: "closed",
        at: Date.now(),
      }),
    );
    // אבן דרך שסומנה אינה נמחקת
    await assertFails(updateDoc(doc(as("lawyerOk"), "cases/msCase/milestones/met"), { at: 1 }));
  });
});

/* ---------- תקרות: מה יכול להציף אותנו ---------- */

/*
 * מיפוי משטח ההצפה (18/8/2026). חוקי Firestore אינם יודעים לספור
 * מסמכים, ולכן תקרה שנאכפת בחוקים חייבת לנבוע מ**צורת המזהה**.
 * הערעורים הם המקרה שבו זה גם נכון סמנטית.
 */
describe("תקרות", () => {
  it("ערעור — מזהה חייב להיות lawyerId_caseId", async () => {
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "appeals/lawyerOk_c1"), {
        lawyerId: "lawyerOk", caseId: "c1", status: "open",
      }),
    );
  });

  it("ערעור — מזהה חופשי נדחה, ולכן אי אפשר להציף", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "appeals/spam1"), {
        lawyerId: "lawyerOk", caseId: "c1", status: "open",
      }),
    );
    await assertFails(
      setDoc(doc(as("lawyerOk"), "appeals/spam2"), {
        lawyerId: "lawyerOk", caseId: "c1", status: "open",
      }),
    );
  });

  it("ערעור — אי אפשר להגיש בשם עורך דין אחר", async () => {
    await assertFails(
      setDoc(doc(as("lawyerOk"), "appeals/lawyerOther_c1"), {
        lawyerId: "lawyerOther", caseId: "c1", status: "open",
      }),
    );
  });

  it("ערעור — הגשה חוזרת דורסת ואינה פותחת מסמך שני", async () => {
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "appeals/lawyerOk_c2"), {
        lawyerId: "lawyerOk", caseId: "c2", status: "open",
      }),
    );
    await assertSucceeds(
      setDoc(doc(as("lawyerOk"), "appeals/lawyerOk_c2"), {
        lawyerId: "lawyerOk", caseId: "c2", status: "open", reason: "ניסוח מתוקן",
      }),
    );
  });

  it("ערעור — עורך דין אינו מכריע בעצמו", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "appeals/lawyerOk_c3"), {
        lawyerId: "lawyerOk", caseId: "c3", status: "open",
      });
    });
    await assertFails(
      setDoc(doc(as("lawyerOk"), "appeals/lawyerOk_c3"), {
        lawyerId: "lawyerOk", caseId: "c3", status: "accepted",
      }),
    );
  });

  it("פניית תמיכה — נפתחת בשם המגיש בלבד", async () => {
    await assertSucceeds(
      setDoc(doc(as("client1"), "supportTickets/t1"), {
        userId: "client1", email: "a@b.c", message: "שלום", status: "open",
      }),
    );
    await assertFails(
      setDoc(doc(as("client1"), "supportTickets/t2"), {
        userId: "lawyerOk", email: "a@b.c", message: "התחזות", status: "open",
      }),
    );
  });
});

/* ---------- פניות — המתווה החדש ---------- */

describe("referrals", () => {
  async function seedReferral(id: string, clientId: string, lawyerId: string) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `referrals/${id}`), {
        caseId: "c1", clientId, lawyerId,
        status: "names_check", parties: "הפונה; חברת ביטוח",
        createdAt: Date.now(),
      });
    });
  }

  it("הפונה ועורך הדין הנמען קוראים; זר לא", async () => {
    await seedReferral("c1_lawyerOk", "client1", "lawyerOk");
    await assertSucceeds(getDoc(doc(as("client1"), "referrals/c1_lawyerOk")));
    await assertSucceeds(getDoc(doc(as("lawyerOk"), "referrals/c1_lawyerOk")));
    await assertFails(getDoc(doc(as("lawyerOther"), "referrals/c1_lawyerOk")));
  });

  it("איש אינו כותב פנייה מהדפדפן — גם לא הצדדים עצמם", async () => {
    await seedReferral("c1_lawyerB", "client1", "lawyerOk");
    await assertFails(
      setDoc(doc(as("client1"), "referrals/c1_lawyerC"), {
        caseId: "c1", clientId: "client1", lawyerId: "lawyerOther", status: "names_check",
      }),
    );
    await assertFails(
      updateDoc(doc(as("lawyerOk"), "referrals/c1_lawyerB"), { status: "cleared" }),
    );
  });
});
