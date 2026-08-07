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

  it("עו״ד מאושר קורא", async () => {
    await assertSucceeds(getDoc(doc(as("lawyerOk"), "cases/openCase/memo/full")));
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
