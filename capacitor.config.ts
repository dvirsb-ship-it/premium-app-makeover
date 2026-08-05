import type { CapacitorConfig } from "@capacitor/cli";

/**
 * מעטפת iOS.
 *
 * האפליקציה טוענת את השרת החי ולא חבילה מקומית — אותה החלטה כמו
 * ב-TWA לאנדרואיד, ומאותה סיבה: JustAsk הוא יישום SSR (TanStack Start
 * על Nitro), והמסכים נבנים בשרת. חבילה סטטית הייתה מחייבת לכתוב מחדש
 * את כל שכבת הטעינה — ולהחזיק שתי גרסאות של אותו מוצר.
 *
 * הסיכון בגישה הזו הוא כלל 4.2 של אפל ("פונקציונליות מינימלית"),
 * שנועד לדחות אתרים עטופים. התשובה שלנו אינה טיעון אלא יכולות: הגשר
 * של Capacitor מזריק את התוספים גם כשהתוכן מרוחק, ולכן האפליקציה
 * מקבלת התראות פוש מקוריות דרך APNs (מה שספארי בנייד עושה חלקית
 * בלבד), גישה למצלמה, ומשוב מישושי — שלושתם דברים שהאתר לבדו אינו
 * נותן, ושלושתם כבר בשימוש במוצר.
 */
const config: CapacitorConfig = {
  appId: "il.co.justask.app",
  appName: "JustAsk",
  webDir: "public",

  server: {
    url: "https://app.justask.co.il",
    /*
     * cleartext=false — האפליקציה לא תטען שום דבר שאינו HTTPS. לא
     * הגדרה טכנית בלבד: תיק כאן מכיל תיאור פגיעה ותמונות רפואיות.
     */
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
  },

  ios: {
    /* הרקע מאחורי התוכן בזמן טעינה ובגלילת-יתר — הדיו של המותג */
    backgroundColor: "#0F172A",
    contentInset: "always",
    /*
     * גלילה אלסטית נשארת דלוקה: בלעדיה המסך מרגיש כמו דפדפן נעול
     * ולא כמו אפליקציה מקורית, וזה בדיוק הרושם שאנחנו רוצים למנוע.
     */
    scrollEnabled: true,
    /*
     * limitsNavigationsToAppBoundDomains נשאר **כבוי**, בכוונה.
     *
     * הדליקו אותו כאן פעם אחת כ"הקשחה", והתוצאה בסימולטור הייתה מסך
     * ריק: הדגל מגביל ניווט לדומיינים המוצהרים ב-WKAppBoundDomains
     * שב-Info.plist, ואין שם אף אחד — כלומר הרשימה ריקה והכל חסום.
     *
     * וגם אילו הצהרנו על הדומיין שלנו, ההתחברות באייפון היא
     * signInWithRedirect (auth-service.ts) — ניווט מלא ל-accounts.
     * google.com. הדגל הזה חוסם בדיוק את המסלול שכל משתמש חייב לעבור.
     *
     * מה שמגן עלינו בפועל הוא cleartext:false למעלה: שום דבר שאינו
     * HTTPS לא ייטען.
     */
  },

  plugins: {
    PushNotifications: {
      /* התראה + סמל + צליל — הלקוח מחכה לתשובה על תיק, לא לניוזלטר */
      presentationOptions: ["badge", "sound", "alert"],
    },
    CapacitorHttp: { enabled: false },
  },
};

export default config;
