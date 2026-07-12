import { useSettings, type Lang } from "./settings";

type Dict = Record<string, { he: string; en: string }>;

export const strings = {
  // Hero / Landing
  tagline: { he: "הגישה הישירה שלך לצדק", en: "Your direct path to justice" },
  heroKicker: { he: "פלטפורמה משפטית פרמיום", en: "Premium legal platform" },
  heroHeadline: {
    he: "צדק מתחיל בשאלה אחת",
    en: "Justice begins with a single question",
  },
  enter: { he: "כניסה לאפליקציה", en: "Enter the app" },
  howCanWeHelp: { he: "כיצד נוכל לסייע לך היום?", en: "How can we help you today?" },
  clientTitle: { he: "אני זקוק/ה לייעוץ משפטי", en: "I need legal advice" },
  clientSub: {
    he: "שתפו את המקרה וקבלו הצעות מעורכי דין מומחים",
    en: "Share your case and get offers from expert lawyers",
  },
  lawyerTitle: { he: "אני עורך/ת דין", en: "I'm a lawyer" },
  lawyerSub: {
    he: "קבלו פניות רלוונטיות ומצאו לקוחות חדשים",
    en: "Receive relevant leads and find new clients",
  },
  secureNote: {
    he: "הפרטים שלך מאובטחים ומועברים רק לעורכי דין מתאימים",
    en: "Your details are secure and shared only with matching lawyers",
  },

  // Bottom nav
  navHome: { he: "ראשי", en: "Home" },
  navCases: { he: "התיקים שלי", en: "My Cases" },
  navProfile: { he: "פרופיל", en: "Profile" },
  navLawyerCases: { he: "תיקים", en: "Cases" },

  // Profile
  profile: { he: "פרופיל", en: "Profile" },
  lawyerAccount: { he: "חשבון עורך דין", en: "Lawyer account" },
  clientAccount: { he: "חשבון לקוח", en: "Client account" },
  lawyerAccountSub: { he: "קבלת פניות וניהול תיקים", en: "Manage leads and cases" },
  clientAccountSub: { he: "שיתוף מקרים ומעקב סטטוס", en: "Share cases and track status" },
  meBadge: { he: "אני", en: "Me" },
  lawyerBadge: { he: "עו״ד", en: "Adv" },
  settings: { he: "הגדרות", en: "Settings" },
  darkMode: { he: "מצב כהה", en: "Dark mode" },
  darkModeSub: { he: "עיצוב כהה ונעים לעיניים", en: "Easy-on-the-eyes dark theme" },
  language: { he: "שפה", en: "Language" },
  languageSub: { he: "בחרו את שפת הממשק", en: "Choose the interface language" },
  switchRole: { he: "החלפת תפקיד", en: "Switch role" },
  notifications: { he: "התראות", en: "Notifications" },
  privacy: { he: "פרטיות ואבטחה", en: "Privacy & security" },
  terms: { he: "תנאי שימוש", en: "Terms of use" },
  help: { he: "עזרה ותמיכה", en: "Help & support" },
  logout: { he: "התנתקות", en: "Log out" },
} satisfies Dict;

export type StringKey = keyof typeof strings;

export function translate(key: StringKey, lang: Lang) {
  return strings[key][lang];
}

export function useT() {
  const { lang } = useSettings();
  return (key: StringKey) => translate(key, lang);
}
