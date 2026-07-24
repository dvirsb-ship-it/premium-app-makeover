import { useCallback } from "react";
import { useSettings, type Lang } from "./settings";

type Dict = Record<string, { he: string; en: string }>;

export const strings = {
  // Hero / Landing
  tagline: { he: "הגישה הישירה שלך לצדק", en: "Your direct path to justice" },
  heroKicker: { he: "פלטפורמה משפטית פרמיום", en: "Premium legal platform" },
  heroHeadline: { he: "צדק מתחיל בשאלה אחת", en: "Justice begins with a single question" },
  heroTagline: { he: "המהפכה המשפטית שלך מתחילה כאן", en: "Your legal revolution starts here" },
  enter: { he: "כניסה לאפליקציה", en: "Enter the app" },
  howCanWeHelp: { he: "כיצד נוכל לסייע לך היום?", en: "How can we help you today?" },
  clientTitle: { he: "אני זקוק/ה לייעוץ משפטי", en: "I need legal advice" },
  clientSub: { he: "שתפו את המקרה וקבלו הצעות מעורכי דין מומחים", en: "Share your case and get offers from expert lawyers" },
  lawyerTitle: { he: "אני עורך/ת דין", en: "I'm a lawyer" },
  lawyerSub: { he: "קבלו פניות רלוונטיות ומצאו לקוחות חדשים", en: "Receive relevant leads and find new clients" },
  secureNote: { he: "הפרטים שלך מאובטחים ומועברים רק לעורכי דין מתאימים", en: "Your details are secure and shared only with matching lawyers" },
  clientCTA: { he: "אני מחפש ייעוץ", en: "I'm seeking advice" },
  clientCTASub: { he: "מצא את עורך הדין המתאים לך ביותר", en: "Find the best lawyer for you" },
  lawyerCTA: { he: "אני עורך דין", en: "I'm a lawyer" },
  lawyerCTASub: { he: "הצטרף לנבחרת המומחים המובילה", en: "Join the leading experts" },
  trustBadge: { he: "2,500+ עורכי דין מומחים כבר איתנו", en: "2,500+ expert lawyers already with us" },

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

  // Auth / sign-up
  authTitle: { he: "יצירת חשבון", en: "Create your account" },
  authSub: { he: "התחברו בכמה שניות והתחילו לקבל ייעוץ משפטי", en: "Sign in within seconds and start getting legal advice" },
  continueGoogle: { he: "המשך עם Google", en: "Continue with Google" },
  continueApple: { he: "המשך עם Apple", en: "Continue with Apple" },
  continueEmail: { he: "המשך עם אימייל", en: "Continue with email" },
  continuePhone: { he: "המשך עם טלפון", en: "Continue with phone" },
  authOr: { he: "או", en: "or" },
  emailLabel: { he: "כתובת אימייל", en: "Email address" },
  emailPlaceholder: { he: "name@email.com", en: "name@email.com" },
  phoneLabel: { he: "מספר טלפון", en: "Phone number" },
  phonePlaceholder: { he: "050-000-0000", en: "050-000-0000" },
  authContinueBtn: { he: "המשך", en: "Continue" },
  authTerms: { he: "בהמשך אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות", en: "By continuing you agree to the Terms and Privacy Policy" },
  authErrEmail: { he: "כתובת האימייל לא תקינה", en: "That email address doesn't look right" },
  authErrPhone: { he: "מספר הטלפון לא תקין", en: "That phone number doesn't look right" },
  authErrGeneric: { he: "לא הצלחנו להתחבר. נסו שוב.", en: "We couldn't sign you in. Please try again." },
  authToastSent: { he: "שלחנו קישור התחברות", en: "Sign-in link sent" },
  authToastSentSub: { he: "בדקו את תיבת הדואר או ההודעות", en: "Check your inbox or messages" },
  authToastWelcome: { he: "ברוכים הבאים ל־JustAsk", en: "Welcome to JustAsk" },

  // Common
  backAria: { he: "חזרה", en: "Back" },
  loading: { he: "טוען…", en: "Loading…" },
  signingIn: { he: "מתחבר…", en: "Signing in…" },
  sending: { he: "שולח…", en: "Sending…" },
  urgent: { he: "דחוף", en: "Urgent" },
  today: { he: "היום", en: "Today" },
  active: { he: "פעיל", en: "Active" },

  // Onboarding (consent)
  onboardTitle: { he: "לפני שמתחילים", en: "Before we start" },
  onboardSubtitle: { he: "הסכמה קצרה להמשך", en: "A short consent to continue" },
  onboardIntro: {
    he: "כדי שנוכל לעזור לך בצורה הטובה ביותר, חשוב שנסכים על כמה דברים:",
    en: "So we can help you as best we can, we need to agree on a few things:",
  },
  term1: { he: "המידע שאשתף הוא אמיתי ומדויק למיטב ידיעתי.", en: "The information I share is true and accurate to the best of my knowledge." },
  term2: { he: "הבדיקה הראשונית אינה ייעוץ משפטי ואינה מהווה ייצוג.", en: "The initial review is not legal advice and does not constitute representation." },
  term3: { he: "פרטי הפנייה יישמרו ויועברו רק לעורכי דין מתאימים.", en: "My request details will be stored and shared only with matching lawyers." },
  term4: { he: "אני פונה מתוך כוונה אמיתית לקבל סיוע משפטי.", en: "I'm reaching out with a genuine intent to receive legal help." },
  agreeText: { he: "קראתי ואני מתחייב/ת לאמור לעיל", en: "I've read and agree to the above" },
  confirmContinue: { he: "אני מאשר/ת וממשיך/ה", en: "I agree and continue" },

  // Intake (chat)
  intakeTitle: { he: "שיתוף הסיפור", en: "Share your story" },
  intakeSubtitle: { he: "שיחה מאובטחת", en: "Secure conversation" },
  secureBadge: { he: "מאובטח", en: "Secure" },
  opener1: { he: "שלום 👋 אני העוזר המשפטי של JustAsk. אני כאן כדי לשמוע על המקרה שלך ולבדוק התאמה ראשונית.", en: "Hi 👋 I'm the JustAsk legal assistant. I'm here to hear about your case and check an initial match." },
  opener2: { he: "ספר/י לי בחופשיות מה קרה — אני אשאל שאלות תוך כדי.", en: "Tell me freely what happened — I'll ask questions along the way." },
  followUp1: { he: "תודה ששיתפת. מתי בערך זה קרה, והאם יש מסמכים או תיעוד רלוונטי?", en: "Thanks for sharing. Roughly when did it happen, and are there any relevant documents?" },
  followUp2: { he: "הבנתי. האם כבר פנית לגורם כלשהו בנושא (ביטוח, מעסיק, רשות)?", en: "Got it. Have you already contacted anyone about this (insurance, employer, authority)?" },
  followUp3: { he: "מעולה, יש לי מספיק פרטים כדי להתחיל בבדיקת ההתאמה. אפשר להמשיך 👇", en: "Great, I have enough details to start the matching check. We can continue 👇" },
  submitForMatch: { he: "שליחה לבדיקת התאמה", en: "Send for matching" },
  composerPlaceholder: { he: "כתוב/י כאן…", en: "Type here…" },
  sendAria: { he: "שליחה", en: "Send" },

  // Validating
  valStep1: { he: "מנתח את פרטי המקרה", en: "Analyzing case details" },
  valStep2: { he: "בודק התאמה לדיני נזיקין", en: "Checking match to tort law" },
  valStep3: { he: "בודק התיישנות ומסווג תחום", en: "Checking limitations and classifying" },
  valStep4: { he: "מאתר עורכי דין מומחים", en: "Locating expert lawyers" },
  valTitle: { he: "בודקים את הפנייה שלך", en: "Reviewing your request" },
  valSub: { he: "זה ייקח כמה שניות", en: "This will take a few seconds" },
  defaultSummary: { he: "פנייה משפטית חדשה", en: "New legal request" },
  defaultCategory: { he: "נזיקין ותאונות דרכים", en: "Personal Injury & Traffic" },

  // Submitted
  submittedTitle: { he: "המקרה שלך נשלח בהצלחה", en: "Your case was submitted successfully" },
  submittedSub: { he: "עורכי דין מתאימים בתחומך יקבלו את הפנייה. נעדכן אותך ברגע שמישהו יביע עניין.", en: "Matching lawyers in your field will receive the request. We'll notify you as soon as one shows interest." },
  viewStatus: { he: "צפייה בסטטוס המקרה", en: "View case status" },
  backHome: { he: "חזרה לדף הבית", en: "Back to home" },

  // Cases list
  myCasesTitle: { he: "התיקים שלי", en: "My cases" },
  myCasesSub: { he: "מעקב אחר הפניות והסטטוס שלהן", en: "Track your requests and their status" },
  newCaseAria: { he: "מקרה חדש", en: "New case" },
  noCases: { he: "אין עדיין תיקים", en: "No cases yet" },
  shareNewCase: { he: "שיתוף מקרה חדש", en: "Share a new case" },
  lawyersInterestedCount: { he: "עורכי דין הביעו עניין", en: "lawyers expressed interest" },
  connectedWithLawyer: { he: "נוצר חיבור עם עורך דין", en: "Connected with a lawyer" },

  // Case detail (client)
  caseNotFound: { he: "תיק לא נמצא", en: "Case not found" },
  caseNotExist: { he: "התיק המבוקש אינו קיים.", en: "The requested case does not exist." },
  toMyCases: { he: "לתיקים שלי", en: "To my cases" },
  caseDetailsTitle: { he: "פרטי המקרה", en: "Case details" },
  connectedWith: { he: "נוצר חיבור עם", en: "Connected with" },
  orDirectContact: { he: "צפייה בפרופיל המלא או פנייה ישירה:", en: "View the full profile or contact directly:" },
  viewFullProfile: { he: "צפייה בפרופיל המלא", en: "View full profile" },
  messageAction: { he: "הודעה", en: "Message" },
  callAction: { he: "התקשרות", en: "Call" },
  lawyersInterestedHeader: { he: "עורכי דין שהביעו עניין", en: "Lawyers who expressed interest" },
  noInterestYet: { he: "עדיין אין התעניינות. נעדכן אותך ברגע שעורך דין יביע עניין.", en: "No interest yet. We'll update you as soon as a lawyer expresses interest." },
  yearsExperience: { he: "שנות ניסיון", en: "years experience" },
  chooseThisLawyer: { he: "בחירת עורך דין זה", en: "Choose this lawyer" },

  // Lawyer feed
  lawyerFeedMetaTitle: { he: "JustAsk — פיד עורכי דין", en: "JustAsk — Lawyer feed" },
  lawyerFeedMetaDesc: { he: "פניות משפטיות טריות המחכות להבעת עניין מעורכי דין מומחים.", en: "Fresh legal requests waiting for expert lawyers to express interest." },
  lawyerFeedOgDesc: { he: "פניות משפטיות איכותיות בזמן אמת לעורכי דין ב-JustAsk.", en: "Quality real-time legal requests for lawyers on JustAsk." },
  newLeads: { he: "פניות חדשות", en: "New leads" },
  proSubscriptionAria: { he: "מנוי Pro", en: "Pro subscription" },
  openLeads: { he: "פניות פתוחות", en: "open leads" },

  // Lawyer case detail
  leadNotFound: { he: "פנייה לא נמצאה", en: "Lead not found" },
  leadNotExist: { he: "הפנייה המבוקשת אינה קיימת.", en: "The requested lead does not exist." },
  toLeadsList: { he: "לרשימת הפניות", en: "To leads list" },
  leadDetailsTitle: { he: "פרטי הפנייה", en: "Lead details" },
  interestedSuffix: { he: "מתעניינים", en: "interested" },
  caseDescriptionHeader: { he: "תיאור המקרה", en: "Case description" },
  interestNotice: { he: "הבעת עניין מציבה אותך ברשימת עורכי הדין שהלקוח בוחר מתוכה. פרטי הקשר ייחשפו רק לאחר בחירת הלקוח.", en: "Expressing interest places you on the list the client picks from. Contact details are revealed only after the client's selection." },
  interestSent: { he: "הבעת עניין נשלחה בהצלחה", en: "Your interest was sent successfully" },
  imInterested: { he: "אני מעוניין/ת בתיק זה", en: "I'm interested in this case" },

  // Lawyer profile
  lawyerProfileMetaTitle: { he: "JustAsk — פרופיל עורך דין", en: "JustAsk — Lawyer profile" },
  lawyerProfileMetaDesc: { he: "פרופיל עורך הדין: התמחות, ניסיון, ביקורות ופרטי יצירת קשר.", en: "Lawyer profile: expertise, experience, reviews and contact." },
  lawyerProfileOgDesc: { he: "כרטיס פרופיל מלא של עורך הדין שבחרתם ב-JustAsk.", en: "Full profile card for the lawyer you chose on JustAsk." },
  profileTitle: { he: "פרופיל", en: "Profile" },
  lawyerProfileTitle: { he: "פרופיל עורך דין", en: "Lawyer profile" },
  lawyerNotFound: { he: "עורך הדין לא נמצא", en: "Lawyer not found" },
  happyClients: { he: "לקוחות מרוצים", en: "Happy clients" },
  avgRating: { he: "דירוג ממוצע", en: "Average rating" },
  casesHandled: { he: "תיקים שנוהלו", en: "Cases handled" },
  expertiseHeader: { he: "התמחות", en: "Expertise" },
  sendMessage: { he: "שליחת הודעה", en: "Send message" },

  // Lawyer onboarding
  lawyerOnboardMetaTitle: { he: "JustAsk — הרשמת עורך דין", en: "JustAsk — Lawyer signup" },
  lawyerOnboardMetaDesc: { he: "בחרו את תחומי ההתמחות שלכם כדי לקבל פניות רלוונטיות ב-JustAsk.", en: "Choose your practice areas to receive relevant leads on JustAsk." },
  lawyerOnboardOgDesc: { he: "בחירת תחומי התמחות להצטרפות לנבחרת עורכי הדין של JustAsk.", en: "Pick practice areas to join the JustAsk lawyer roster." },
  lawyerOnboardTitle: { he: "הרשמת עורך דין", en: "Lawyer signup" },
  lawyerOnboardSubtitle: { he: "בחרו את תחומי ההתמחות שלכם", en: "Choose your practice areas" },
  joinRosterBadge: { he: "JustAsk · הצטרפות לנבחרת", en: "JustAsk · Join the roster" },
  onboardHeading1: { he: "באילו תחומים", en: "In which areas" },
  onboardHeading2: { he: "אתם מתמחים?", en: "do you specialize?" },
  onboardDesc: { he: "תקבלו רק פניות שמתאימות להתמחויות שבחרתם. ניתן לבחור יותר מתחום אחד.", en: "You'll only receive requests that match the areas you pick. You can select more than one." },
  dragToJoin: { he: "גררו להצטרפות", en: "Slide to join" },

  // Specialty labels
  specInjury: { he: "נזיקין ותאונות", en: "Injury & Accidents" },
  specEmployment: { he: "דיני עבודה", en: "Employment Law" },
  specEstate: { he: "מקרקעין", en: "Real Estate" },
  specCivil: { he: "אזרחי כללי", en: "General Civil" },
  specFamily: { he: "דיני משפחה", en: "Family Law" },
  specCriminal: { he: "פלילי", en: "Criminal" },
  specCommercial: { he: "מסחרי וחוזים", en: "Commercial & Contracts" },
  specTax: { he: "מיסים", en: "Tax" },

  // Lawyer subscription
  subMetaTitle: { he: "JustAsk Pro — מנוי לעורכי דין", en: "JustAsk Pro — Lawyer membership" },
  subMetaDesc: { he: "פתחו גישה מלאה ללידים איכותיים, כלי AI ותכונות מתקדמות לעורכי דין.", en: "Unlock full access to quality leads, AI tools and advanced features for lawyers." },
  subOgDesc: { he: "מנוי חודשי או שנתי לעורכי דין ב-JustAsk.", en: "Monthly or yearly membership for lawyers on JustAsk." },
  subFeat1: { he: "גישה מלאה לכל הפניות", en: "Full access to every lead" },
  subFeat2: { he: "התראות בזמן אמת ללידים חדשים", en: "Real-time notifications for new leads" },
  subFeat3: { he: "הבעות עניין ללא הגבלה", en: "Unlimited interest expressions" },
  subFeat4: { he: "כלי AI לניתוח תיקים", en: "AI tools for case analysis" },
  subFeat5: { he: "פרופיל מקצועי מודגש", en: "Highlighted professional profile" },
  subHeroTitle1: { he: "הפכו את הלידים", en: "Turn leads" },
  subHeroTitle2: { he: "ללקוחות", en: "into clients" },
  subHeroDesc: { he: "גישה בלתי מוגבלת לפניות איכותיות, כלי AI מתקדמים והתראות בזמן אמת — הכל במקום אחד.", en: "Unlimited access to quality leads, advanced AI tools and real-time notifications — all in one place." },
  planMonthly: { he: "חודשי", en: "Monthly" },
  planYearly: { he: "שנתי", en: "Yearly" },
  monthlyBill: { he: "חיוב חודשי", en: "Billed monthly" },
  yearlyBill: { he: "חיוב שנתי", en: "Billed yearly" },
  save17: { he: "חסכו 17%", en: "Save 17%" },
  joinPro: { he: "הצטרפו ל-Pro", en: "Join Pro" },
  subFineText: { he: "ניתן לבטל בכל עת · תמיכה 24/7 · חשבונית מס כדין", en: "Cancel anytime · 24/7 support · Proper VAT invoice" },

  // Root meta
  rootMetaTitle: { he: "JustAsk — הגישה הישירה שלך לצדק", en: "JustAsk — Your direct path to justice" },
  rootMetaDesc: { he: "JustAsk מחברת בין נפגעים לעורכי דין מומחים. שתפו את המקרה, עברו בדיקת התאמה וקבלו הצעות מעורכי דין רלוונטיים.", en: "JustAsk connects people with expert lawyers. Share your case, get matched, and receive offers from relevant lawyers." },
  rootOgDesc: { he: "פלטפורמה משפטית פרמיום המחברת בין נפגעים לעורכי דין מומחים בתחומם.", en: "A premium legal platform connecting people with expert lawyers in their field." },
} satisfies Dict;

export type StringKey = keyof typeof strings;

export function translate(key: StringKey, lang: Lang) {
  return strings[key][lang];
}

import { useCallback } from "react";

export function useT() {
  const { lang } = useSettings();
  return useCallback((key: StringKey) => translate(key, lang), [lang]);
}
