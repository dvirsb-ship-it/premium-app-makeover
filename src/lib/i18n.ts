import { useCallback } from "react";
import { useSettings, type Lang } from "./settings";

type Dict = Record<string, { he: string; en: string }>;

export const strings = {
  // Hero / Landing
  heroTagline: { he: "כתבו מה קרה — והגיעו לעורך הדין הנכון מוכנים", en: "Write what happened — and reach the right lawyer prepared" },
  enter: { he: "כניסה לאפליקציה", en: "Enter the app" },
  /*
   * "אני מחפש **עורך דין**" ולא "ייעוץ" (10/8/2026).
   *
   * JustAsk אינה נותנת ייעוץ משפטי ואינה רשאית לתת — היא מחברת לעורך
   * דין, והתקנון אומר את זה במפורש. כפתור שמבטיח ייעוץ סותר את התקנון
   * של עצמנו במסך הראשון שאדם רואה.
   */
  clientCTA: { he: "אני מחפש עורך דין", en: "I'm looking for a lawyer" },
  clientCTASub: { he: "ספרו מה קרה, אשרו את הסיכום — ובחרו עורך דין בעצמכם", en: "Tell what happened, approve the summary — and choose a lawyer yourself" },
  lawyerCTA: { he: "אני עורך דין", en: "I'm a lawyer" },
  lawyerCTASub: { he: "פניות ממי שבחר בך", en: "Requests from clients who chose you" },
  trustBadge: { he: "שלב השקה · השירות ללקוחות חינם — תמיד", en: "Launch phase · always free for clients" },

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
  switchRoleConfirm: { he: "בטוח? מעבר למסך בחירת התפקיד", en: "Sure? Back to role selection" },
  specialtiesTitle: { he: "תחומי התמחות", en: "Practice areas" },
  notifications: { he: "התראות", en: "Notifications" },
  privacy: { he: "פרטיות ואבטחה", en: "Privacy & security" },
  terms: { he: "תנאי שימוש", en: "Terms of use" },
  help: { he: "עזרה ותמיכה", en: "Help & support" },
  logout: { he: "התנתקות", en: "Log out" },

  // Auth / sign-up
  authTitle: { he: "יצירת חשבון", en: "Create your account" },
  /* מה שקורה באמת אחרי ההתחברות — לא הבטחה שאיננו יכולים לקיים */
  authSub: { he: "התחברו בכמה שניות וספרו מה קרה", en: "Sign in within seconds and tell us what happened" },
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
  authCompleting: { he: "מסיימים את ההתחברות…", en: "Finishing sign-in…" },
  authRedirectFailed: { he: "ההתחברות לא הושלמה", en: "Sign-in didn't complete" },
  authRedirectFailedHint: {
    he: "חזרתם מגוגל בלי חשבון מחובר. אם הדפדפן חוסם קובצי Cookie של צד שלישי או שאתם בגלישה פרטית — כבו את החסימה ונסו שוב.",
    en: "You came back from Google without a signed-in account. If your browser blocks third-party cookies or you're in private browsing, turn that off and try again.",
  },
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
  term2: { he: "הסיכום שאאשר הוא ארגון עובדתי של מה שמסרתי — אינו ייעוץ משפטי, אינו הערכת סיכויים, ואינו מבטיח דבר. ההערכה המקצועית היא של עורך הדין שאבחר.", en: "The summary I approve is a factual organisation of what I provided — not legal advice, not an assessment of prospects, and no promise. The professional assessment belongs to the lawyer I choose." },
  term3: { he: "פרטי הפנייה יישמרו ויוצגו רק לעורכי הדין המאומתים שאבחר. שמות הצדדים יימסרו להם תחילה לבדיקת ניגוד עניינים, ופרטי הקשר שלי יימסרו רק לעורך הדין שאבחר לבסוף.", en: "My request will be stored and shown only to the verified lawyers I choose. Party names are shared with them first for a conflict-of-interest check, and my contact details go only to the lawyer I finally pick." },
  term4: { he: "אני פונה מתוך כוונה אמיתית לקבל סיוע משפטי.", en: "I'm reaching out with a genuine intent to receive legal help." },
  /*
   * שני הסעיפים האלה אינם ויתור, ובכוונה.
   *
   * ויתור גורף ("כל מה שאשתף באחריותי") לא היה מעביר אחריות: חובות
   * אבטחת המידע חלות על בעל המאגר ואינן ניתנות לוויתור, וסעיף גורף
   * בחוזה אחיד מול צרכן הוא מועמד לתנאי מקפח — כלומר סעיף שנפסל ולא
   * מגן על כלום. וחשוב מזה: לבקש מאדם שזה עתה נפגע לוותר על זכויות
   * לפני שיספר מה קרה לו הוא בדיוק ההפך ממה שהמוצר הזה מוכר.
   *
   * מה שכן: term5 הוא הסכמה מדעת להעברת מידע אל מחוץ לגבולות המדינה —
   * אחד הבסיסים המותרים בתקנות — ולכן הוא מנוסח מדויק, עם האזור ועם
   * מה שלא נשלח. term6 סוגר פער אמיתי: מסמך רפואי או תמונת תאונה
   * מכילים לעיתים פרטים של אנשים אחרים, וההסכמה של הפונה אינה מכסה
   * אותם.
   */
  term5: { he: "תיאור המקרה שאמסור יעובד ע״י שירות בינה מלאכותית של גוגל בשרתים באיחוד האירופי, לצורך ארגון הסיכום העובדתי בלבד. מספר תעודת זהות, טלפון ודוא״ל מוסרים אוטומטית לפני העיבוד.", en: "The case description I provide will be processed by a Google AI service on servers in the European Union, only to organise the factual summary. ID number, phone and email are stripped automatically before processing." },
  term6: { he: "אם אציין שקיים בידי תיעוד — הוא באמת קיים, ואביא אותו לעורך הדין שאבחר.", en: "If I state that I have documentation — it genuinely exists, and I will bring it to the lawyer I choose." },
  term7: { he: "מלאו לי 18 שנים, או שאני הורה או אפוטרופוס הפונה בשם קטין.", en: "I am 18 or older, or a parent or legal guardian applying on behalf of a minor." },
  agreeText: { he: "קראתי ואני מתחייב/ת לאמור לעיל", en: "I've read and agree to the above" },
  confirmContinue: { he: "אני מאשר/ת וממשיך/ה", en: "I agree and continue" },

  // Intake (chat)
  intakeTitle: { he: "שיתוף הסיפור", en: "Share your story" },
  intakeCollecting: { he: "אוספים את הפרטים", en: "Gathering the details" },
  intakeReadyBadge: { he: "הכול נאסף — אפשר לשלוח", en: "All gathered — ready to send" },
  intakeSubtitle: { he: "שיחה מאובטחת", en: "Secure conversation" },
  secureBadge: { he: "מאובטח", en: "Secure" },
  opener1: { he: "שלום 👋 אני עוזר הקליטה של JustAsk. אני כאן כדי לשמוע מה קרה ולארגן ממנו פנייה מסודרת לעורך הדין שתבחרו.", en: "Hi 👋 I'm JustAsk's intake assistant. I'm here to hear what happened and organise it into a clear request for the lawyer you'll choose." },
  opener2: { he: "ספר/י לי בחופשיות מה קרה — אני אשאל שאלות תוך כדי.", en: "Tell me freely what happened — I'll ask questions along the way." },
  /*
   * ═══ הבקשה המפורשת (12/8/2026) ═══
   *
   * זו אינה עוד תיבת סימון בתקנון. היא יושבת לבדה, ברגע שלפני
   * השליחה, ובניסוח של **בקשה** ולא של הסכמה.
   *
   * ההבדל אינו סמנטי: "אני משתף את המקרה שלי" מתאר אדם שמפרסם
   * מידע, ומי שמגיב לו יוזם פנייה אליו. **"אני מבקש לקבל הצעות"**
   * מתאר אדם שביקש — ומי שעונה לו משיב לבקשה. זהו כיוון הפעולה
   * שכללי האתיקה שואלים עליו, והוא מתועד כאן עם חותמת זמן.
   *
   * חשוב לדעת מה זה **לא** עושה: תיבת סימון אינה מרפאה איסור.
   * לקוח אינו יכול לוותר בשם עורך הדין על כלל שחל עליו. מה שהיא
   * עושה הוא לבסס את התיאור העובדתי — שהפנייה באה מהלקוח.
   */
  /* ── סימני התיעוד (12/8/2026) ──────────────────────────────
     החליפו את העלאת הקבצים. עורך הדין מקבל את אותו אות — מה קיים
     בתיק — בלי שאיש מאיתנו מחזיק מסמך רפואי של אדם פגוע. */
  docsHeader: { he: "תיעוד שקיים אצל הפונה", en: "Documentation the client has" },
  docsNote: { he: "לפי הצהרת הפונה. המסמכים עצמם אינם נשמרים אצלנו — הוא יביא אותם לפגישה.", en: "As stated by the client. The documents themselves are not stored with us — they'll bring them to the meeting." },
  docMedical: { he: "מסמכים רפואיים", en: "Medical records" },
  docScene: { he: "תמונות מהמקום", en: "Photos of the scene" },
  docMessages: { he: "התכתבויות", en: "Correspondence" },
  docFinancial: { he: "קבלות ואישורים כספיים", en: "Receipts and financial records" },
  docWitnesses: { he: "עדים", en: "Witnesses" },
  docOfficial: { he: "מסמך רשמי", en: "An official document" },
  offersRequestLabel: { he: "אני מבקש שפנייתי תישלח לעורכי הדין שאבחר מהאינדקס, ומבין ששמות הצדדים יימסרו להם תחילה לבדיקת ניגוד עניינים.", en: "I am asking for my request to be sent to the lawyers I choose from the index, and understand the party names are shared with them first for a conflict-of-interest check." },
  offersRequestWhy: { he: "בלי הבקשה הזאת הפנייה לא תישלח לאיש. אתם בוחרים למי לפנות, ופרטי הקשר שלכם נחשפים רק לעורך הדין שתבחרו לבסוף.", en: "Without this request nothing is sent to anyone. You choose whom to approach, and your contact details are revealed only to the lawyer you finally pick." },
  submitForMatch: { he: "שליחה להכנת הסיכום", en: "Send to prepare the summary" },
  composerPlaceholder: { he: "כתוב/י כאן…", en: "Type here…" },
  sendAria: { he: "שליחה", en: "Send" },

  // Intake tips (pre-chat)
  intakeTipsTitle: { he: "לפני שמתחילים לשתף", en: "Before you share" },
  intakeTipsSubtitle: { he: "כמה טיפים קצרים לשיחה מוצלחת", en: "A few quick tips for a great chat" },
  tipsHeroTitle: { he: "דברו איתי בטבעיות — אני AI", en: "Talk to me naturally — I'm AI" },
  tipsHeroBody: {
    he: "אין צורך בשפה משפטית או בניסוחים מדויקים. ספרו את הסיפור במילים שלכם, כמו שהייתם מספרים לחבר. אני כאן כדי לעזור לכם — לא לשפוט.",
    en: "No legal jargon or formal wording needed. Tell the story in your own words, the way you'd tell a friend. I'm here to help — not to judge.",
  },
  tipTalkTitle: { he: "דברו חופשי לגמרי", en: "Speak completely freely" },
  tipTalkBody: {
    he: "כתבו כמו שאתם חושבים. אין תשובה נכונה או שגויה, ואפשר לחזור, לתקן ולהוסיף בכל שלב.",
    en: "Write the way you think. There's no right or wrong answer — you can revise or add anything at any point.",
  },
  tipDatesTitle: { he: "הוסיפו תאריכים מדויקים", en: "Add precise dates" },
  tipDatesBody: { he: "תאריכים — ולו משוערים — עוזרים לבנות ציר זמן ברור של מה שקרה.", en: "Dates — even approximate — help build a clear timeline of what happened." },
  tipPhotosTitle: { he: "דעו מה קיים אצלכם", en: "Know what you have" },
  tipPhotosBody: { he: "מסמכים רפואיים, תמונות מהמקום, התכתבויות, קבלות, עדים או מסמך רשמי. אתם לא מעלים לכאן כלום — רק אומרים מה קיים, ומביאים אותו לפגישה עם עורך הדין.", en: "Medical records, photos of the scene, correspondence, receipts, witnesses or an official document. You upload nothing here — you just say what exists, and bring it to the meeting with the lawyer." },
  tipDetailsTitle: { he: "כמה שיותר פרטים", en: "As many details as possible" },
  tipDetailsBody: {
    he: "ככל שתשתפו יותר, הסיכום שעורך הדין יקבל יהיה מלא ומדויק יותר.",
    en: "The more you share, the fuller and more accurate the summary your lawyer receives.",
  },
  tipsFooterNote: {
    he: "🔒 כל מה שתשתפו מוצפן. תיאור המקרה מעובד ע״י שירות AI של גוגל באיחוד האירופי לצורך ארגון הסיכום, והנתונים נשמרים בשרתים מאובטחים. פרטי הקשר ייחשפו רק לעורך הדין שתבחרו.",
    en: "🔒 Everything you share is encrypted. The case description is processed by a Google AI service in the EU to organise the summary, and data is stored on secured servers. Contact details are revealed only to the lawyer you choose.",
  },
  tipsStartCta: { he: "הבנתי, בואו נתחיל", en: "Got it, let's start" },

  // Validating
  valStep1: { he: "קורא את פרטי המקרה", en: "Reading your case details" },
  valStep2: { he: "מארגן את העובדות לפי סדר", en: "Organising the facts in order" },
  valStep3: { he: "מנסח סיכום עובדתי", en: "Writing the factual summary" },
  valStep4: { he: "מכין רשימת מסמכים לעורך הדין", en: "Preparing the document checklist" },
  valTitle: { he: "מכינים את הסיכום שלך", en: "Preparing your summary" },
  valSub: { he: "מכינים את הסיכום — עד דקה", en: "Preparing your summary — up to a minute" },
  defaultSummary: { he: "פנייה משפטית חדשה", en: "New legal request" },
  defaultCategory: { he: "נזיקין ותאונות דרכים", en: "Personal Injury & Traffic" },

  // Submitted
  backHome: { he: "חזרה לדף הבית", en: "Back to home" },

  // Cases list
  myCasesTitle: { he: "התיקים שלי", en: "My cases" },
  myCasesSub: { he: "מעקב אחר הפניות והסטטוס שלהן", en: "Track your requests and their status" },
  newCaseAria: { he: "מקרה חדש", en: "New case" },
  noCases: { he: "אין עדיין תיקים", en: "No cases yet" },
  shareNewCase: { he: "שיתוף מקרה חדש", en: "Share a new case" },
  /*
   * רגע ההגעה: מישהו אמר "אני יכול לעזור לך". עד עכשיו הוא נאמר בפס
   * דק בתחתית הכרטיס, בלשון סטטוס ("1 עורכי דין הביעו עניין" — גם
   * שגוי דקדוקית ביחיד). זה הרגע שכל המסע הוביר אליו, והוא צריך
   * להיקרא כהזמנה לפעולה, לא כהערת שוליים.
   */
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
  yearsExperience: { he: "שנות ניסיון", en: "years experience" },
  chooseThisLawyer: { he: "בחירת עורך דין זה", en: "Choose this lawyer" },

  // Lawyer feed
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
  expertiseHeader: { he: "התמחות", en: "Expertise" },

  // Lawyer onboarding
  lawyerOnboardMetaTitle: { he: "JustAsk — הרשמת עורך דין", en: "JustAsk — Lawyer signup" },
  lawyerOnboardMetaDesc: { he: "בחרו את תחומי ההתמחות שלכם כדי לקבל פניות רלוונטיות ב-JustAsk.", en: "Choose your practice areas to receive relevant leads on JustAsk." },
  lawyerOnboardOgDesc: { he: "בחירת תחומי התמחות כדי להופיע באינדקס ולקבל פניות ממי שבחר בך.", en: "Pick practice areas to appear in the index and receive requests from clients who choose you." },
  lawyerOnboardTitle: { he: "הרשמת עורך דין", en: "Lawyer signup" },
  lawyerOnboardSubtitle: { he: "אימות זהות, רישיון ותחומים — כמה דקות", en: "Identity, licence and fields — a few minutes" },
  joinRosterBadge: { he: "JustAsk · הצטרפות כעורך דין", en: "JustAsk · Join as a lawyer" },
  onboardHeading1: { he: "באילו תחומים", en: "In which areas" },
  onboardHeading2: { he: "אתם מתמחים?", en: "do you specialize?" },
  onboardDesc: { he: "תקבלו רק פניות שמתאימות להתמחויות שבחרתם. ניתן לבחור יותר מתחום אחד.", en: "You'll only receive requests that match the areas you pick. You can select more than one." },
  dragToJoin: { he: "גררו להצטרפות", en: "Slide to join" },

  // Specialty labels
  specGroupInjury: { he: "נזקי גוף ותאונות", en: "Injury & accidents" },
  specGroupCivil: { he: "אזרחי וכספי", en: "Civil & monetary" },
  specGroupProperty: { he: "נכסים ורכוש", en: "Property" },
  specGroupFamily: { he: "משפחה", en: "Family" },
  specGroupCriminal: { he: "פלילי וצבאי", en: "Criminal & military" },
  specGroupBusiness: { he: "עסקים וכספים", en: "Business & finance" },
  specGroupPublic: { he: "מול רשויות", en: "Public authorities" },
  specTraffic: { he: "תעבורה", en: "Traffic offences" },
  specPlanning: { he: "תכנון ובנייה", en: "Planning & construction" },
  specInheritance: { he: "ירושה וצוואות", en: "Inheritance & wills" },
  specBanking: { he: "בנקאות ופיננסים", en: "Banking & finance" },
  specEnforcement: { he: "הוצאה לפועל וחדלות פירעון", en: "Enforcement & insolvency" },
  specFamily: { he: "דיני משפחה", en: "Family law" },
  specCriminal: { he: "פלילי", en: "Criminal" },
  specCommercial: { he: "מסחרי וחוזים", en: "Commercial & contracts" },
  specTax: { he: "מיסים", en: "Tax" },
  specCorporate: { he: "תאגידים וחברות", en: "Corporate" },
  specIp: { he: "קניין רוחני", en: "Intellectual property" },
  specImmigration: { he: "הגירה ואשרות", en: "Immigration & visas" },
  specAdministrative: { he: "מנהלי וחוקתי", en: "Administrative & constitutional" },
  specMilitary: { he: "צבאי וביטחוני", en: "Military & security" },
  specInjury: { he: "נזיקין ותאונות", en: "Injury & Accidents" },
  specEmployment: { he: "דיני עבודה", en: "Employment Law" },
  specEstate: { he: "מקרקעין", en: "Real Estate" },
  specCivil: { he: "אזרחי כללי", en: "General Civil" },
  specMedical: { he: "רשלנות רפואית", en: "Medical Malpractice" },
  specInsurance: { he: "ביטוח", en: "Insurance" },
  specConsumer: { he: "צרכנות", en: "Consumer Protection" },

  // Lawyer subscription
  subMetaTitle: { he: "JustAsk Pro — מנוי לעורכי דין", en: "JustAsk Pro — Lawyer membership" },
  subMetaDesc: { he: "פתחו גישה מלאה ללידים איכותיים, כלי AI ותכונות מתקדמות לעורכי דין.", en: "Unlock full access to quality leads, AI tools and advanced features for lawyers." },
  subOgDesc: { he: "מנוי חודשי קבוע לעורכי דין — נוכחות באינדקס, פניות ממי שבחר בך, וכלי קליטה וניהול.", en: "A fixed monthly subscription for lawyers — index presence, referrals from people who chose you, and intake tools." },
  subHeroDesc: { he: "פניות ממי שבחר בך מהאינדקס — עם סיכום עובדתי מסודר שהפונה אישר.", en: "Referrals from people who chose you from the index — with an organised, applicant-approved factual summary." },

  // Root meta
  rootMetaTitle: { he: "JustAsk — אתר ובחר עורך דין, בחינם", en: "JustAsk — Find and choose a lawyer, free" },
  rootMetaDesc: { he: "ספרו מה קרה בשיחה קצרה, קבלו סיכום מסודר שאתם מאשרים, ובחרו עורך דין מאומת מהאינדקס — לפי תחום, אזור ושפה. השירות חינם לפונים.", en: "Tell us what happened, approve an organised summary, and choose a verified lawyer from the index — by field, area and language. Free for applicants." },
  rootOgDesc: { he: "ספרו מה קרה, אשרו את הסיכום, ובחרו בעצמכם עורך דין מאומת. ההערכה המקצועית — של עורך הדין שתבחרו. השירות חינם.", en: "Tell what happened, approve your summary, and choose a verified lawyer yourself. The professional assessment is theirs. Free." },

  // Welcome onboarding
  welcomeSkip: { he: "דלג", en: "Skip" },
  welcomeScrollHint: { he: "גללו מעלה כדי להיכנס", en: "Swipe up to enter" },
  welcomeNext: { he: "הבא", en: "Next" },
  welcomeStart: { he: "בואו נתחיל", en: "Let's start" },
  handshakeWelcome: { he: "לחיצת יד לתחילת הדרך", en: "Sealed with a handshake" },
  welcomeSlide1Title: { he: "קודם כל — מגיעים מוכנים", en: "First — arrive prepared" },
  welcomeSlide1Body: { he: "ספרו מה קרה בשיחה קצרה. נארגן מזה סיכום מסודר וציר זמן — ואתם מאשרים כל מילה לפני שהיא יוצאת מכם.", en: "Tell what happened in a short chat. We organise it into a summary and timeline — and you approve every word before it leaves you." },
  welcomeSlide2Title: { he: "אתם בוחרים את עורך הדין", en: "You choose the lawyer" },
  welcomeSlide2Body: { he: "אינדקס של עורכי דין מאומתים, לפי תחום ואזור. אתם שולחים פנייה למי שבחרתם — עד שלושה במקביל.", en: "An index of verified lawyers, by field and area. You send your request to the ones you picked — up to three at a time." },
  welcomeSlide3Title: { he: "הפרטים שלכם, בשליטתכם", en: "Your details, your control" },
  welcomeSlide3Body: { he: "עורך הדין מקבל תחילה שמות בלבד — לבדיקת ניגוד עניינים. הסיפור שלכם נחשף רק אחרי שאישר, ופרטי הקשר רק למי שבחרתם לבסוף.", en: "The lawyer first receives names only — for a conflict check. Your story opens only after they confirm, and your contact details go only to the one you finally choose." },

  // Validating — retry
  valStuckTitle: { he: "הבדיקה מתעכבת", en: "This is taking longer than usual" },
  valStuckSub: { he: "נראה שהחיבור איטי. נסו שוב או המשיכו לתיקים שלכם.", en: "The connection seems slow. Try again or continue to your cases." },
  valRetry: { he: "נסה שוב", en: "Try again" },
  valGoCases: { he: "לתיקים שלי", en: "To my cases" },

  // Lawyer verification wizard
  lawyerVerifyStepOf: { he: "שלב {n} מתוך {total}", en: "Step {n} of {total}" },
  lawyerVerifyIntroBadge: { he: "אימות זהות ורישיון", en: "Identity & license verification" },
  lawyerVerifyTitle: { he: "בואו נאמת שהכל תקין", en: "Let's verify your credentials" },
  lawyerVerifySub: { he: "כדי לשמור על איכות הפלטפורמה, אנו מאמתים כל עורך דין לפני שהוא מופיע באינדקס.", en: "To keep the platform trustworthy, we verify every lawyer before they appear in the index." },
  lawyerVerifyBegin: { he: "התחלת אימות", en: "Begin verification" },

  stepIdentityTitle: { he: "פרטים אישיים", en: "Personal details" },
  stepIdentityDesc: { he: "השם המלא כפי שמופיע בתעודת הזהות ובלשכת עורכי הדין.", en: "Full name as it appears on your ID and bar records." },
  fieldFullName: { he: "שם מלא", en: "Full name" },
  fieldFullNamePh: { he: "לדוגמה: מיכל אברהמי", en: "e.g. Michal Avrahami" },
  fieldIdNumber: { he: "מספר תעודת זהות", en: "National ID number" },
  fieldIdNumberPh: { he: "9 ספרות", en: "9 digits" },
  fieldEmail: { he: "אימייל מקצועי", en: "Professional email" },
  fieldPhone: { he: "טלפון", en: "Phone" },

  stepBarTitle: { he: "רישיון עורך דין", en: "Bar license" },
  stepBarDesc: { he: "מספר הרישיון בלשכת עורכי הדין בישראל וצילום התעודה בתוקף.", en: "Israel Bar Association license number and a photo of your valid card." },
  fieldBarNumber: { he: "מספר רישיון", en: "License number" },
  fieldBarNumberPh: { he: "לדוגמה: 12345", en: "e.g. 12345" },
  fieldBarYear: { he: "שנת הסמכה", en: "Year of admission" },
  uploadBarCard: { he: "צילום תעודת עו״ד", en: "Photo of bar card" },
  uploadSelfieVideo: { he: "סרטון סלפי לאימות", en: "Verification selfie video" },
  selfieVideoHint: {
    he: "עד 20 שניות: פנים גלויות, תעודת עו״ד ביד, ואמרו — ״שמי ___, ואני נרשם/ת ל-JustAsk״",
    en: "Up to 20s: face visible, bar card in hand, and say — \"My name is ___, registering for JustAsk\"",
  },
  selfieVideoPrivacy: {
    he: "הסרטון משמש להשוואה מול התעודה בלבד, ונמחק מיד לאחר החלטת האימות.",
    en: "The video is used only to compare against your card, and is deleted right after the decision.",
  },

  stepEducationTitle: { he: "תעודת השכלה", en: "Education certificate" },
  stepEducationDesc: { he: "צירוף תעודת סיום התואר במשפטים לאימות ההכשרה.", en: "Attach your LL.B. diploma to verify your training." },
  fieldUniversity: { he: "מוסד לימודים", en: "Institution" },
  fieldUniversityPh: { he: "לדוגמה: אוניברסיטת תל אביב", en: "e.g. Tel Aviv University" },
  fieldGradYear: { he: "שנת סיום", en: "Graduation year" },
  uploadDiploma: { he: "צילום תעודת בוגר", en: "Photo of diploma" },

  stepSpecTitle: { he: "תחומי התמחות", en: "Practice areas" },
  stepSpecDesc: { he: "בחרו את התחומים שבהם אתם מייצגים. אלה האינדקסים שבהם תופיעו — ומהם לקוחות בוחרים.", en: "Pick the fields you practise. These are the indexes you'll appear in — where clients choose." },

  stepReviewTitle: { he: "סקירה ואישור", en: "Review & submit" },
  stepReviewDesc: { he: "בדקו שהכל נכון. אחרי השליחה נבדוק את המסמכים ונעדכן אתכם בהתראה.", en: "Check everything looks right. After submission we review the documents and notify you." },
  reviewIdentity: { he: "זהות", en: "Identity" },
  reviewLicense: { he: "רישיון", en: "License" },
  reviewEducation: { he: "השכלה", en: "Education" },
  reviewSpecialties: { he: "תחומים", en: "Practice areas" },
  reviewSubmit: { he: "שליחה לאימות", en: "Submit for verification" },
  reviewFinePrint: { he: "בשליחה אני מאשר/ת שכל הפרטים נכונים ומאמת/ת את זהותי בפני JustAsk.", en: "By submitting I confirm all details are accurate and consent to identity verification by JustAsk." },
  verifySuccess: { he: "בקשת האימות התקבלה — נחזור אליכם בקרוב", en: "Verification request received — we'll be in touch soon" },

  uploadTap: { he: "הקש/י כדי להעלות", en: "Tap to upload" },
  uploadReplace: { he: "החלפה", en: "Replace" },
  uploadHint: { he: "PDF, JPG או PNG · עד 10MB", en: "PDF, JPG or PNG · up to 10MB" },
  fieldRequired: { he: "שדה חובה", en: "Required" },
  invalidId: { he: "מספר ת״ז לא תקין", en: "Invalid ID number" },
  nextStep: { he: "המשך", en: "Continue" },
  prevStep: { he: "חזרה", en: "Back" },

  // AI verification
  aiVerifyBadge: { he: "בדיקת שלמות הפרטים", en: "Completeness check" },
  aiVerifyTitle: { he: "בודקים שלא חסר כלום", en: "Making sure nothing is missing" },
  aiVerifySub: { he: "עוברים על הטופס לפני השליחה. בדיקת המסמכים עצמם נעשית אצלנו, ידנית.", en: "Checking the form before submission. The documents themselves are reviewed by us, manually." },
  aiStep1: { he: "פרטים אישיים הושלמו", en: "Personal details complete" },
  aiStep2: { he: "מספר רישיון ושנת הסמכה הוזנו", en: "License number and year entered" },
  aiStep3: { he: "המסמכים צורפו", en: "Documents attached" },
  aiStep4: { he: "תחומי התמחות נבחרו", en: "Practice areas selected" },
  aiPassTitle: { he: "הפרטים נקלטו", en: "Details received" },
  aiPassSub: { he: "הבקשה הועברה לבדיקה אנושית של המסמכים. עם האישור תופיע באינדקס עורכי הדין — ופניות יגיעו ממי שיבחר בך.", en: "Your application moved to human document review. Once approved you'll appear in the lawyer index — and requests will come from clients who choose you." },
  aiPassCta: { he: "סיום", en: "Done" },
  aiFailTitle: { he: "מצאנו כמה דברים שצריך לתקן", en: "We found a few things to fix" },
  aiFailSub: { he: "כדי להשלים את ההצטרפות, יש להשלים או לתקן את הפריטים הבאים:", en: "To finish onboarding, please complete or fix the items below:" },
  aiFailCta: { he: "תיקון הפרטים", en: "Fix the details" },
  aiRunAgain: { he: "בדיקה מחדש", en: "Run check again" },

  // Validation issue messages
  issueFullName: { he: "יש להזין שם מלא של לפחות שני תווים.", en: "Enter a full name of at least two characters." },
  issueIdNumber: { he: "מספר תעודת הזהות שהוזן אינו תקין. יש להזין 9 ספרות תקינות.", en: "The ID number is invalid. Enter a valid 9-digit Israeli ID." },
  issueEmail: { he: "כתובת האימייל אינה תקינה.", en: "The email address isn't valid." },
  issuePhone: { he: "מספר טלפון קצר מדי — נדרשות לפחות 9 ספרות.", en: "Phone number is too short — at least 9 digits required." },
  issueBarNumber: { he: "מספר רישיון עורך דין חסר או קצר מדי.", en: "Bar license number is missing or too short." },
  issueBarYear: { he: "יש להזין שנת הסמכה תקינה (4 ספרות).", en: "Enter a valid admission year (4 digits)." },
  issueBarCard: { he: "לא הועלה צילום תעודת עורך דין.", en: "No photo of your bar card was uploaded." },
  issueSelfieVideo: { he: "חסר סרטון סלפי לאימות — צלמו סרטון קצר עם התעודה ביד.", en: "Verification selfie video is missing — record a short video holding your card." },
  issueSelfieVideoFile: { he: "הקובץ אינו סרטון, או גדול מ-80MB.", en: "The file is not a video, or exceeds 80MB." },
  issueUniversity: { he: "יש להזין שם מוסד הלימודים.", en: "Enter the name of your institution." },
  issueGradYear: { he: "יש להזין שנת סיום תואר תקינה (4 ספרות).", en: "Enter a valid graduation year (4 digits)." },
  issueDiploma: { he: "לא הועלתה תעודת בוגר.", en: "No diploma was uploaded." },
  issueSpecialties: { he: "יש לבחור לפחות תחום התמחות אחד.", en: "Pick at least one practice area." },
  issueFixIn: { he: "מעבר לשלב הרלוונטי", en: "Jump to the step" },
  officialSummary: { he: "סיכום רשמי להגשה", en: "Official submission summary" },
  submittedOn: { he: "הוגש בתאריך", en: "Submitted on" },
  downloadPdf: { he: "הורדת PDF רשמי", en: "Download official PDF" },
  pdfExported: { he: "המסמך הרשמי הורד", en: "Official document downloaded" },

  // Admin verification queue
  adminQueueTitle: { he: "תור אימות עורכי דין", en: "Lawyer verification queue" },
  adminQueueSub: { he: "בדיקה ואישור של בקשות חדשות", en: "Review and approve incoming applications" },
  queueEmpty: { he: "אין בקשות ממתינות", en: "No pending applications" },
  queueEmptySub: { he: "בקשות חדשות יופיעו כאן אוטומטית.", en: "New applications will appear here automatically." },
  statusPending: { he: "ממתין", en: "Pending" },
  statusApproved: { he: "מאושר", en: "Approved" },
  statusRejected: { he: "נדחה", en: "Rejected" },
  approve: { he: "אישור", en: "Approve" },
  reject: { he: "דחייה", en: "Reject" },
  approvedToast: { he: "הבקשה אושרה", en: "Application approved" },
  rejectedToast: { he: "הבקשה נדחתה", en: "Application rejected" },

  // Settings — Notifications
  notifTitle: { he: "התראות", en: "Notifications" },
  notifSub: { he: "בחרו על מה לקבל עדכונים", en: "Choose what you want to hear about" },
  notifCaseUpdates: { he: "עדכוני תיקים", en: "Case updates" },
  notifCaseUpdatesSub: { he: "התקדמות, בקשות ותוצאות", en: "Progress, requests and outcomes" },
  notifChannelsHeader: { he: "ערוצי משלוח", en: "Delivery channels" },
  notifPush: { he: "התראות בפוש", en: "Push notifications" },
  notifPushSub: { he: "ישירות למכשיר", en: "Directly to your device" },

  // Settings — Privacy
  privacyTitle: { he: "פרטיות ואבטחה", en: "Privacy & security" },
  privacySub: { he: "איך אנחנו שומרים עליכם", en: "How we protect you" },
  privacyIntro: {
    he: "הפרטיות שלכם היא הבסיס של JustAsk. הפרטים שאתם משתפים מוצפנים, נשמרים באזור מאובטח ומועברים רק לעורכי דין שאתם בוחרים.",
    en: "Your privacy is the foundation of JustAsk. What you share is encrypted, kept in a secured region, and shared only with lawyers you pick.",
  },
  privacyEnc: { he: "הצפנה במעבר ובאחסון", en: "Encrypted in transit and at rest" },
  privacyEncSub: { he: "כל שיחה מוצפנת בהעברה ובשרתי גוגל. שימו לב: זו אינה הצפנה מקצה לקצה — הכנת הסיכום מחייבת שהמערכת תוכל לקרוא את התוכן. מסמכים אינם נשלחים אלינו כלל.", en: "Every conversation is encrypted in transit and on Google's servers. Note: this is not end-to-end encryption — preparing the summary requires the system to read the content. Documents are never sent to us at all." },
  privacyControl: { he: "אתם בשליטה", en: "You're in control" },
  privacyControlSub: { he: "פרטי הקשר נחשפים רק לאחר בחירתכם בעורך דין ספציפי.", en: "Contact details are revealed only after you pick a specific lawyer." },
  privacyRls: { he: "בידוד בין משתמשים", en: "User isolation" },
  privacyRlsSub: { he: "חוקי גישה בשרת מגבילים כל משתמש למידע שלו. עורך דין רואה רק פניות שנשלחו אליו — ופרטי הקשר שלכם נחשפים רק לעורך הדין שתבחרו לבסוף.", en: "Server-side rules limit each user to their own data. A lawyer sees only requests sent to them — and your contact details are revealed only to the lawyer you finally choose." },
  privacyDelete: { he: "מחיקת חשבון ונתונים", en: "Delete account & data" },
  privacyDeleteSub: { he: "מחיקה מלאה זמינה כאן במסך, בכל עת — ומושלמת בתוך 14 יום.", en: "Full deletion is available right here on this screen, any time — completed within 14 days." },
  privacyContact: { he: "לשאלות פרטיות: justask.adv@gmail.com", en: "Privacy inquiries: justask.adv@gmail.com" },

  // Settings — Terms
  termsTitle: { he: "תנאי שימוש", en: "Terms of use" },
  termsSub: { he: "השימוש בשירות כפוף לתנאים הבאים", en: "Use of the service is subject to the following terms" },
  termsSection1Title: { he: "1. אודות השירות", en: "1. About the service" },
  termsSection1Body: {
    he: "JustAsk מהווה פלטפורמת חיבור בין נפגעים לעורכי דין. השירות אינו תחליף לייעוץ משפטי מקצועי ואינו יוצר יחסי עו״ד–לקוח. השירות מיועד לבני 18 ומעלה; פנייה בעניינו של קטין תוגש בידי הורה או אפוטרופוס.",
    en: "JustAsk is a matching platform between people and lawyers. The service is not a substitute for professional legal advice and does not create an attorney-client relationship. The service is intended for ages 18 and up; a matter concerning a minor must be submitted by a parent or legal guardian.",
  },
  termsSection2Title: { he: "2. אמינות המידע", en: "2. Accuracy of information" },
  termsSection2Body: {
    he: "המשתמש מתחייב לספק פרטים מלאים, נכונים ומדויקים. מסירת מידע כוזב עלולה להוביל להשעיית החשבון.",
    en: "Users must provide complete, correct and accurate details. Providing false information may lead to account suspension.",
  },
  termsSection3Title: { he: "3. אחריות", en: "3. Liability" },
  termsSection3Body: {
    he: "האחריות על הייצוג המשפטי, ההסכמים והתוצאות היא של עורך הדין הנבחר בלבד. JustAsk אינה צד להליך המשפטי.",
    en: "Responsibility for legal representation, agreements and outcomes lies solely with the chosen lawyer. JustAsk is not a party to the legal proceedings.",
  },
  termsSection4Title: { he: "4. תשלומים", en: "4. Payments" },
  termsSection4Body: {
    he: "ללקוחות — השירות חינם, תמיד. שיתוף המקרה, הסיכום, הבחירה והחיבור לעורך דין אינם כרוכים בתשלום. שכר הטרחה סוכם ישירות מול עורך הדין הנבחר; JustAsk אינה צד להסכם ואינה נוטלת חלק כלשהו בשכר הטרחה.\n\nלעורכי דין — מנוי חודשי קבוע, הכולל הופעה באינדקס עורכי הדין, קבלת פניות מלקוחות שבחרו בכם, את הסיכום העובדתי שאושר על כל פנייה שנשלחה אליכם, התראות בזמן אמת וצירוף הצעת שכר טרחה. המנוי אינו תלוי במספר הלקוחות שהתקבלו, ואינו כולל עמלה או חלק כלשהו בשכר הטרחה. תשלום אינו משפיע על סדר התצוגה: האינדקס מסודר בסדר קבוע ואחיד, אין מיקום ממומן ואין קידום בתשלום. ניתן לבטל בכל עת. בתקופת ההשקה המנוי ניתן ללא תשלום, ומועד תחילת החיוב יוצג באפליקציה מראש.",
    /*
     * האנגלית פיגרה אחרי העברית ואחרי המוצר: היא הבטיחה תשלום
     * "per completed connection" ו-"feed priority" — שניהם נשקלו ונדחו.
     * דף הגיוס מבטיח לעורכי דין את ההפך המדויק ("לא עמלה על תוצאה",
     * "אין מקום בתור תמורת תשלום"), ותקנון שסותר את מה שהובטח בפומבי
     * הוא בדיוק מה שעורך דין לאתיקה מחפש. תשלום אינו קונה חשיפה.
     */
    en: "The service is free for clients — always, including sharing your case, the summary, choosing and connecting with a lawyer. Legal fees are agreed directly with the chosen lawyer; JustAsk is not a party to that agreement and takes no share of the fee.\n\nLawyers: a fixed monthly subscription, covering a listing in the lawyer index, requests from clients who chose you, the approved factual summary of each request sent to you, real-time alerts and the ability to submit a fee proposal. The subscription does not depend on how many clients you receive, and includes no commission or share of any fee. Payment does not affect placement: the index is shown in a fixed, uniform order — no sponsored placement and no paid promotion. Cancel any time. During the launch period the subscription is free, and the billing start date will be shown in the app in advance.",
  },
  termsSection6Title: { he: "6. תקשורת דרך הפלטפורמה", en: "6. Communication through the platform" },
  termsSection7Title: { he: "7. עיבוד המידע שלך", en: "7. Processing your information" },
  termsSection7Body: { he: "תיאור המקרה שתמסרו מעובד ע״י שירות בינה מלאכותית של גוגל, בשרתים באיחוד האירופי, לצורך ארגון הסיכום העובדתי בלבד — לא לאימון המודל ולא לפרסום. מזהים ישירים (מספר תעודת זהות, טלפון ודוא״ל) מוסרים אוטומטית לפני העיבוד.\n\nהפלטפורמה אינה מקבלת קבצים ואינה מאחסנת מסמכים. תיעוד שברשותכם נשאר אצלכם, ואתם מביאים אותו ישירות לעורך הדין שתבחרו.", en: "The case description you provide is processed by a Google AI service on servers in the European Union, only to organise the factual summary — not for model training and not for publication. Direct identifiers (ID number, phone, email) are stripped automatically before processing.\n\nThe platform does not accept files and does not store documents. Any documentation you hold stays with you, and you bring it directly to the lawyer you choose." },
  termsSection8Title: { he: "8. מסירת מידע, מטרות וזכויותיך", en: "8. Providing information, purposes and your rights" },
  termsSection8Body: { he: "אינך חייב על פי חוק למסור לנו מידע — המסירה תלויה ברצונך ובהסכמתך. בלי הפרטים הדרושים לא נוכל להכין את הסיכום או להעביר את פנייתך לעורך הדין שתבחר.\n\nהמידע נאסף לארבע מטרות בלבד: הכנת הסיכום העובדתי, העברת פנייתך לעורכי דין שבחרת, יצירת החיבור לאחר בחירתך, ותפעול השירות ואבטחתו.\n\nהמידע מועבר רק למי שנדרש לכך: לעורכי הדין המאומתים שבחרת — תחילה שמות הצדדים בלבד, לבדיקת ניגוד עניינים, ופרטי הקשר רק לאחר בחירתך הסופית — ולספקי התשתית והעיבוד של גוגל (Firebase ו-Vertex AI), הפועלים עבורנו בלבד. איננו מוכרים מידע ואיננו מעבירים אותו לאיש מעבר לכך.\n\nעומדת לך זכות לעיין במידע השמור עליך, לבקש תיקון של מידע שאינו נכון או מעודכן, ולמחוק את החשבון והנתונים — מתוך האפליקציה (הגדרות ← פרטיות ואבטחה) או בכתובת justask.adv@gmail.com. מחיקה מושלמת בתוך 14 יום.", en: "You are under no legal obligation to provide us with information — doing so depends on your choice and consent. Without the required details we cannot prepare the summary or send your request to the lawyer you choose.\n\nInformation is collected for four purposes only: preparing the factual summary, sending your request to the lawyers you chose, making the connection after you choose, and operating and securing the service.\n\nInformation is shared only with those who need it: the verified lawyers you chose — party names first, for a conflict-of-interest check, with your contact details shared only after your final choice — and Google's infrastructure and processing providers (Firebase and Vertex AI), acting solely on our behalf. We do not sell data and share it with no one else.\n\nYou have the right to review the information we hold about you, to request correction of inaccurate or outdated information, and to delete your account and data — from the app (Settings → Privacy & security) or at justask.adv@gmail.com. Deletion completes within 14 days." },
  termsSection6Body: {
    he: "עד ליצירת חיבור רשמי בין לקוח לעורך דין, התקשורת מתקיימת דרך הפלטפורמה בלבד ופרטי הקשר המלאים אינם נחשפים. שיתוף פרטי קשר, שמות מלאים או פרטי משרד בתוכן חופשי במטרה לעקוף את הפלטפורמה מהווה הפרת תנאים ועלול להוביל להשעיית החשבון.",
    en: "Until an official client–lawyer connection is made, communication takes place exclusively through the platform and full contact details are not disclosed. Sharing contact details, full names or firm details in free-text content in order to bypass the platform constitutes a breach of these terms and may lead to account suspension.",
  },
  termsSection5Title: { he: "5. שינויים בתנאים", en: "5. Changes to terms" },
  termsSection5Body: {
    he: "אנו רשאים לעדכן את התנאים מעת לעת. עדכון מהותי יוצג באפליקציה לפני כניסתו לתוקף.",
    en: "We may update these terms from time to time. Material changes will be shown in-app before taking effect.",
  },
  termsLastUpdated: { he: "עודכן לאחרונה: אוגוסט 2026", en: "Last updated: August 2026" },

  // Settings — Help
  helpTitle: { he: "עזרה ותמיכה", en: "Help & support" },
  helpSub: { he: "אנחנו כאן לענות על כל שאלה", en: "We're here to answer any question" },
  helpFaqHeader: { he: "שאלות נפוצות", en: "Frequently asked" },
  faq1Q: { he: "כמה זמן לוקח לקבל תשובה מעורך דין?", en: "How long until a lawyer responds?" },
  faq1A: { he: "אתם שולחים את הפנייה לעד שלושה עורכי דין שבחרתם מהאינדקס, ולכל אחד 48 שעות להשיב על בדיקת ניגוד העניינים. תקבלו התראה על כל תשובה — וגם אם עורך דין אינו זמין, תמיד אפשר לבחור אחר.", en: "You send your request to up to three lawyers you pick from the index, and each has 48 hours to answer the conflict check. You get an alert on every response — and if a lawyer isn't available, you can always pick another." },
  faq2Q: { he: "האם השירות בתשלום?", en: "Is the service paid?" },
  faq2A: { he: "לפונים — הכול חינם, תמיד: השיחה, הסיכום, שליחת הפניות והחיבור לעורך דין. שכר הטרחה נסגר ישירות מול עורך הדין שבחרתם.", en: "For clients — everything is free, always: the conversation, the summary, sending requests and connecting. Legal fees are agreed directly with the lawyer you chose." },
  faq3Q: { he: "איך אני מוחק את החשבון שלי?", en: "How do I delete my account?" },
  faq3A: { he: "שלחו בקשה דרך טופס התמיכה למטה ונשלים מחיקה מלאה של החשבון והנתונים בתוך 14 יום, כנדרש בדין.", en: "Send a request via the support form below and we'll complete full deletion of your account and data within 14 days, as required by law." },
  faq4Q: { he: "האם עורכי הדין נבדקים?", en: "Are lawyers vetted?" },
  faq4A: { he: "כל עורך דין עובר אימות תעודות, רישיון והצלבה מול פנקס הלשכה, בבדיקה אנושית — לפני שהוא מופיע באינדקס.", en: "Every lawyer passes certificate and licence verification, cross-checked against the Bar registry by a human reviewer — before appearing in the index." },
  helpContactHeader: { he: "צריכים עוד עזרה?", en: "Need more help?" },
  helpContactSub: { he: "השאירו הודעה ונחזור אליכם בהקדם", en: "Leave a message and we'll get back to you" },
  helpMessagePh: { he: "כתבו לנו במה נוכל לעזור…", en: "Tell us how we can help…" },
  helpSend: { he: "שליחת הודעה", en: "Send message" },
  helpSent: { he: "ההודעה נשלחה, תודה!", en: "Message sent — thanks!" },
  helpEmailDirect: { he: "או במייל: justask.adv@gmail.com", en: "Or by email: justask.adv@gmail.com" },


  // Auth — phone OTP step (Firebase)
  authCodeLabel: { he: "קוד אימות מה-SMS", en: "SMS verification code" },
  authCodePlaceholder: { he: "123456", en: "123456" },
  authVerifyBtn: { he: "אימות והתחברות", en: "Verify & sign in" },
  authCodeSent: { he: "שלחנו קוד אימות", en: "Verification code sent" },
  authCodeSentSub: { he: "בדקו את ההודעות בטלפון", en: "Check your messages" },
  authErrCode: { he: "הקוד שגוי או שפג תוקפו. נסו שוב.", en: "The code is incorrect or expired. Try again." },
  authAppleSoon: { he: "ההתחברות עם Apple תופעל בקרוב — השתמשו בינתיים בגוגל, אימייל או טלפון.", en: "Apple sign-in is coming soon — use Google, email or phone for now." },
  intakeError: { he: "מצטערים, הייתה תקלה רגעית בחיבור. אפשר לשלוח שוב את ההודעה.", en: "Sorry, there was a momentary connection issue. Please send your message again." },
  valRejectedTitle: { he: "הפנייה לא אושרה בשלב זה", en: "Your case wasn't approved at this stage" },
  valRejectedSub: { he: "הפקת הסיכום לא הושלמה הפעם. אפשר לנסות שוב, לפתוח פנייה חדשה — או לפנות לעורך דין ישירות.", en: "The summary wasn't completed this time. Try again, open a new request — or contact a lawyer directly." },
  valNewRequest: { he: "פנייה חדשה", en: "New request" },
  notifCenterTitle: { he: "התראות", en: "Notifications" },
  notifCenterSub: { he: "כל העדכונים על התיקים שלך", en: "All updates about your cases" },
  notifEmpty: { he: "אין התראות עדיין", en: "No notifications yet" },
  notifEmptySub: { he: "כאן יופיעו העדכונים — כשהסיכום מוכן, כשעורך דין משיב, וכשמתקבלת הצעה.", en: "Updates appear here — when your summary is ready, a lawyer replies, or an offer arrives." },
  notifEmptySubLawyer: { he: "כאן יופיעו העדכונים — כשלקוח בוחר בך, משתף סיכום, או כשתיק מתקדם.", en: "Updates appear here — when a client picks you, shares a summary, or a case moves." },
  notifAria: { he: "פתיחת מרכז ההתראות", en: "Open notifications" },
  verifyUploadError: { he: "ההגשה לא הושלמה. בדקו את החיבור ונסו שוב — אפשר לשלוח שוב בבטחה.", en: "Your submission didn't complete. Check your connection and try again — resubmitting is safe." },
  verPendingBanner: { he: "הפרופיל שלך בבדיקה", en: "Your profile is under review" },
  verPendingBannerSub: { he: "אנחנו בודקים את המסמכים. ברגע שהאימות יאושר תופיע באינדקס, ופניות יגיעו ממי שיבחר בך — נעדכן בהתראה.", en: "We're reviewing your documents. Once approved you'll appear in the index, and requests will come from clients who choose you — we'll alert you." },
  verRejectedBanner: { he: "האימות לא אושר — אפשר להגיש שוב עם מסמכים מעודכנים", en: "Verification wasn't approved — you can resubmit with updated documents" },
  verRejectedBannerCta: { he: "הגשה מחדש", en: "Resubmit" },
  docBarCard: { he: "רישיון לשכה", en: "Bar card" },
  docDiploma: { he: "תעודת בוגר", en: "Diploma" },
  docSelfieVideo: { he: "סרטון אימות", en: "Verification video" },
  selfiePurgedNote: { he: "הסרטון נמחק לאחר ההחלטה (פרטיות)", en: "Video deleted after decision (privacy)" },
  interestLockedTitle: { he: "קבלת פניות נפתחת לאחר אימות הפרופיל", en: "Receiving requests opens after profile verification" },
  interestLockedPending: { he: "הבקשה שלך בבדיקה — נעדכן אותך ברגע שתאושר.", en: "Your application is under review — we'll notify you the moment it's approved." },
  interestLockedCta: { he: "לאימות הפרופיל", en: "Verify my profile" },
  clientContactHeader: { he: "פרטי הלקוח", en: "Client contact" },
  contactUnavailable: { he: "פרטי הקשר עוד לא זמינים", en: "Contact details aren't available yet" },
  fieldCity: { he: "עיר", en: "City" },
  fieldCityPh: { he: "למשל: תל אביב", en: "e.g. Tel Aviv" },
  issueCity: { he: "יש להזין עיר — כך נחבר אליך לקוחות קרובים", en: "Please enter a city — this connects you with nearby clients" },
  matchHigh: { he: "התאמה גבוהה", en: "Strong match" },
  matchMedium: { he: "התאמה טובה", en: "Good match" },
  /*
   * "רקע עובדתי" ולא "מדוע התיק אושר" (10/8/2026).
   *
   * הכותרת הישנה הצהירה שאנחנו **אישרנו** את התיק לגופו. איננו
   * מאשרים תיקים — אנחנו ממיינים לתחום, והשדה עצמו מכיל עובדות
   * שהפונה מסר. הכותרת מתארת עכשיו את מה שיש מתחתיה.
   */
  caseContextHeader: { he: "הבסיס להערכה", en: "Basis for the assessment" },
  incidentDateLabel: { he: "תאריך האירוע", en: "Incident date" },
  damageTypeLabel: { he: "סוג הנזק", en: "Damage type" },
  documentationLabel: { he: "תיעוד", en: "Documentation" },
  damageBody: { he: "נזקי גוף", en: "Bodily injury" },
  damageFinancial: { he: "נזק כספי", en: "Financial damage" },
  damageBoth: { he: "גוף וכספי", en: "Bodily & financial" },
  docYes: { he: "קיים", en: "Available" },
  docNo: { he: "אין עדיין", en: "None yet" },
  appealLink: { he: "משהו לא נראה תקין? דווחו על בדיקה שגויה", en: "Something seems off? Report an incorrect assessment" },
  appealPlaceholder: { he: "מה לדעתך שגוי בבדיקה המשפטית של התיק הזה?", en: "What do you think is wrong with this case's assessment?" },
  appealSend: { he: "שליחת דיווח", en: "Send report" },
  appealSentMsg: { he: "הדיווח התקבל — נבדוק ונעדכן אותך. תודה ששמרת על איכות המערכת!", en: "Report received — we'll review and update you. Thanks for keeping the system honest!" },
  cancelAction: { he: "ביטול", en: "Cancel" },
  offerTitle: { he: "הצעת שכר הטרחה שלך לפונה", en: "Your fee offer to the client" },
  offerFeeLabel: { he: "שכר טרחה מוצע", en: "Proposed fee" },
  offerFeePh: { he: "למשל: 15% מהפיצוי", en: "e.g. 15% of compensation" },
  offerDurationLabel: { he: "משך משוער לתהליך", en: "Estimated duration" },
  offerDurationPh: { he: "למשל: 6–12 חודשים", en: "e.g. 6–12 months" },
  offerNoteLabel: { he: "מסר אישי ללקוח", en: "Personal note to the client" },
  offerNotePh: { he: "כמה מילים על הניסיון שלך במקרים כאלה…", en: "A few words about your experience with such cases…" },
  offerSend: { he: "שליחת ההצעה לפונה", en: "Send offer to client" },
  offerHeader: { he: "ההצעה של עורך הדין", en: "Lawyer's offer" },
  offerFeeShort: { he: "שכ״ט", en: "Fee" },
  offerDurationShort: { he: "משך משוער", en: "Est. duration" },
  adminAppealsHeader: { he: "ערעורים על הבדיקה", en: "Assessment appeals" },
  appealsEmpty: { he: "אין ערעורים — כשעורך דין ידווח על בדיקה שגויה, זה יופיע כאן.", en: "No appeals — when a lawyer reports an incorrect assessment it will appear here." },
  appealBy: { he: "דווח ע״י", en: "Reported by" },
  appealAccept: { he: "קבלת הערעור", en: "Accept appeal" },
  appealDismiss: { he: "דחיית הערעור", en: "Dismiss" },
  appealAcceptedToast: { he: "הדיווח התקבל והפנייה הוסרה", en: "Report accepted — the request was removed" },
  appealDismissedToast: { he: "הערעור נדחה — הבדיקה בתוקף", en: "Appeal dismissed — the assessment stands" },
  adminSupportHeader: { he: "פניות תמיכה", en: "Support inbox" },
  supportEmpty: { he: "אין פניות — הודעות מטופס העזרה יופיעו כאן.", en: "No tickets — messages from the help form will appear here." },
  ticketMarkHandled: { he: "סימון כטופל", en: "Mark handled" },
  ticketHandled: { he: "טופל", en: "Handled" },
  adminCasesHeader: { he: "ארכיון תיקים", en: "Cases archive" },
  adminCasesEmpty: { he: "אין תיקים עדיין.", en: "No cases yet." },
  caseValidatedChip: { he: "הסיכום אושר", en: "Summary approved" },
  adminOfficeBtn: { he: "המשרד הטכנולוגי", en: "Admin office" },
  adminOfficeSub: { he: "אימותים, ערעורים, פניות תמיכה וארכיון", en: "Verifications, appeals, support & archive" },
  intakeNotSuitableTitle: { he: "לא הצלחנו להמשיך עם הפנייה הזו", en: "We couldn't continue with this request" },
  intakeNotSuitableRec: { he: "מה כן מומלץ לעשות", en: "What we recommend instead" },
  /*
   * קצר בכוונה. הנוסח הקודם — "רוצה לתקן או להוסיף פרט? כתבו כאן…" —
   * נחתך באמצע על מסך טלפון, כי ה-textarea חולק את השורה עם שני
   * כפתורים. placeholder חתוך נראה כתקלה ולא כהזמנה.
   */
  composerFixPlaceholder: { he: "לתקן או להוסיף פרט?", en: "Fix or add a detail?" },

  // ציר הזמן שאחרי החיבור
  timelineHeader: { he: "מה קרה בתיק", en: "Case progress" },
  timelineLawyerHeader: { he: "עדכון התקדמות", en: "Update progress" },
  timelineLawyerSub: { he: "הלקוח מקבל התראה על כל אבן דרך. זה מה שחוסך את שאלת ״מה קורה עם התיק שלי״.", en: "The client is notified on each milestone — it saves the \"what's happening with my case\" question." },
  ms_met: { he: "נפגשתם עם עורך הדין", en: "Met with the lawyer" },
  ms_demandSent: { he: "נשלח מכתב דרישה", en: "Demand letter sent" },
  ms_filed: { he: "הוגשה תביעה", en: "Claim filed" },
  ms_closed: { he: "התיק הסתיים", en: "Case closed" },
  msMarkBtn: { he: "סימון", en: "Mark" },
  msMarked: { he: "סומן", en: "Marked" },
  msNotePh: { he: "הערה ללקוח (לא חובה)", en: "Note to the client (optional)" },

  // רשימת ההכנה ללקוח
  checklistHeader: { he: "מה להכין לפגישה", en: "What to prepare for the meeting" },
  checklistSub: { he: "נגזר ממה שספרתם בשיחה — כך הפגישה הראשונה תהיה יעילה.", en: "Derived from what you told us — so the first meeting is productive." },

  closeAria: { he: "סגירה", en: "Close" },
  intakeRestart: { he: "התחלת שיחה חדשה", en: "Start a new conversation" },
  /* לחיצה שנייה — ההגנה על שיחה שלמה שנמחקת בלחיצה אחת */
  intakeRestartConfirm: { he: "בטוח? כל מה שסיפרת יימחק", en: "Sure? Everything you told us is erased" },

  adminWaiting: { he: "ממתין לך", en: "Waiting for you" },
  adminWaitingSub: { he: "אימותים, ערעורים, פניות תמיכה, בקשות מחיקה ותקלות שטרם טופלו — הכול מרוכז כאן.", en: "Verifications, appeals, support tickets, deletion requests and unhandled errors — all counted here." },
  proLaunchFree: { he: "בתקופת ההשקה — הכול כלול, בחינם", en: "During launch — everything included, free" },
  proLaunchFreeSub: { he: "אין כרגע מה לרכוש: כל התכונות פתוחות לכל עורך דין מאומת. נעדכן מראש לפני שמנוי ייכנס לתוקף.", en: "There is nothing to buy right now — every feature is open to all verified lawyers. We'll give notice before any subscription starts." },
  actionFailedRetry: { he: "הפעולה לא נשמרה. בדקו את החיבור ונסו שוב.", en: "That didn't save. Check your connection and try again." },
  proNoPriorityTitle: { he: "תשלום לא קונה מקום בתור", en: "Paying buys no place in the queue" },
  proNoPriority: { he: "האינדקס מסודר בסדר קבוע ואחיד — לא לפי מי משלם. אין מיקום ממומן, אין קידום, ואין הצעה שמוצגת ראשונה בתמורה. הלקוח בוחר בך בשמך, משווה את כל ההצעות באותו מסך ומכריע בעצמו.", en: "The index is shown in a fixed, uniform order — not by who pays. No sponsored placement, no promotion, no offer shown first in exchange for payment. The client picks you by name, compares every offer on one screen and decides." },
  conflictTitle: { he: "בדיקת ניגוד עניינים", en: "Conflict check" },
  conflictBody: { he: "אשרו לפני ההגשה: אינכם מייצגים את הצד שכנגד בעניין זה, אין לכם או למשרדכם ניגוד עניינים בתיק, ולא ייצגתם בו צד אחר בעבר.", en: "Confirm before submitting: you do not represent the opposing party in this matter, neither you nor your firm has a conflict in this case, and you have not previously acted for another party in it." },
  conflictAgree: { he: "בדקתי — אין ניגוד עניינים", en: "I've checked — no conflict" },
  conflictWhy: { he: "הבדיקה עליכם ולא עלינו: איננו יודעים מי הצדדים בתיקים שלכם. הסימון נשמר עם ההצעה.", en: "The check is yours, not ours — we don't know the parties in your cases. Your confirmation is stored with the offer." },
  undertakingTitle: { he: "ההתחייבות המקצועית שלך", en: "Your professional undertaking" },
  undertakingDesc: { he: "לפני השליחה — שש נקודות שעליהן אתם מצהירים. הן קיימות כדי להגן עליכם, על הפונים, ועל מעמד השירות.", en: "Before you submit — six declarations. They exist to protect you, the people who apply, and the standing of the service." },
  undertake1: { he: "אני עורך/ת דין בעל/ת רישיון בתוקף, חבר/ת לשכת עורכי הדין בישראל, ואינני מושעה/ית או מוגבל/ת בעיסוק.", en: "I hold a valid licence, am a member of the Israel Bar, and am not suspended or restricted from practice." },
  undertake2: { he: "כל פנייה שאראה — גם כזו שלא אבחר בה ולא איבחר בה — היא מידע חסוי. לא אעשה בה שימוש, לא אעביר אותה ולא אחשוף אותה לאיש.", en: "Every request I see — including ones I don't take and am not chosen for — is confidential. I will not use, transfer or disclose it." },
  undertake3: { he: "לא אנסה ליצור קשר עם פונה מחוץ לפלטפורמה לפני שבחר בי, ולא אבקש ממנו פרטי קשר בשום דרך.", en: "I will not attempt to contact an applicant outside the platform before they choose me, nor request their contact details in any way." },
  undertake4: { he: "אבדוק ניגוד עניינים על שמות הצדדים מיד עם קבלת פנייה, בטרם אקרא את סיכום המקרה, ואמנע מהמשך טיפול בפנייה שבה קיים ניגוד — לרבות כזה הנוגע לצד שכנגד.", en: "I will check for conflicts of interest against the party names immediately upon receiving a request, before reading the case summary, and will not proceed with any request where a conflict exists — including one concerning the opposing party." },
  undertake5: { he: "הצעת שכר הטרחה שאגיש תעמוד בכללי לשכת עורכי הדין החלים על אותו סוג תיק, לרבות תקרות אחוזים ואיסור התניית שכר בתוצאה בהליך פלילי.", en: "My fee proposal will comply with the Bar rules for that case type, including percentage caps and the ban on outcome-contingent fees in criminal matters." },
  undertake6: { he: "ידוע לי ש-JustAsk אינה צד להסכם שכר הטרחה, אינה נוטלת חלק בו, ואינה מקנה עדיפות בתמורה לתשלום. הייצוג והאחריות המקצועית הם שלי בלבד.", en: "I understand JustAsk is not a party to the fee agreement, takes no share of it, and grants no paid priority. Representation and professional responsibility are mine alone." },
  undertakeAgree: { he: "קראתי ואני מתחייב/ת לאמור לעיל", en: "I have read and undertake the above" },
  undertakeRequired: { he: "יש לאשר את ההתחייבות המקצועית לפני השליחה", en: "Please confirm the professional undertaking before submitting" },
  docScanTitle: { he: "מה קורה עם המסמכים שלך", en: "What happens to your documents" },
  docScanNote: { he: "המסמכים נקראים בסיוע אוטומטי ומוצלבים מול הפרטים שהקלדת — כדי לתפוס טעות הקלדה או קובץ שהועלה בשוגג. ההחלטה עצמה אנושית תמיד, וסרטון הפנים נמחק ברגע שהיא מתקבלת.", en: "Your documents are read with automated assistance and cross-checked against the details you entered — to catch a typo or a file uploaded by mistake. The decision itself is always human, and the selfie video is deleted the moment it is made." },
  presentationTitle: { he: "איך אתם מוצגים", en: "How you appear" },
  presentationSub: { he: "תמונה ומשפט קצר — זה מה שהלקוח רואה בהצעה", en: "Photo and a short line — what clients see on your offer" },
  photoLabel: { he: "תמונת פרופיל", en: "Profile photo" },
  photoHelp: { he: "תמונה אמיתית שלכם. לקוח בוחר בין כמה הצעות, ופנים מוכרות עושות את ההבדל.", en: "A real photo of you. Clients compare several offers, and a face makes the difference." },
  photoUpload: { he: "העלאת תמונה", en: "Upload photo" },
  photoReplace: { he: "החלפת תמונה", en: "Replace photo" },
  photoRemove: { he: "הסרת התמונה", en: "Remove photo" },
  photoTooLarge: { he: "התמונה גדולה מדי — עד 4MB.", en: "That image is too large — 4MB max." },
  bioLabel: { he: "על עצמכם", en: "About you" },
  bioHelp: { he: "שתי שורות בקולכם: במה אתם מתמחים ולמה כדאי לפנות אליכם. בלי פרטי קשר — הם נחשפים אחרי הבחירה.", en: "Two lines in your voice: what you focus on and why to pick you. No contact details — those are shared after you're chosen." },
  bioPlaceholder: { he: "לדוגמה: 12 שנה בנזיקין, מלווה אישית מהיום הראשון ועד הפיצוי.", en: "e.g. 12 years in personal injury, with you from day one through settlement." },
  /* תיק שהגיע לתקרת ההצעות. במפורש לא "נסו שוב" — זה מרוץ שהוכרע. */
  caseFullToast: { he: "התיק הזה כבר קיבל את מלוא ההצעות. תיקים חדשים בתחום שלכם יגיעו בהתראה.", en: "This case has reached its offer limit. You'll be notified when new cases open in your practice areas." },

  // הבית של הלקוח
  homeHello: { he: "שלום", en: "Hello" },
  homeHelloNamed: { he: "שלום, {name}", en: "Hello, {name}" },
  homeSub: { he: "התיקים שלך, במקום אחד", en: "Your cases, in one place" },
  /*
   * הברכה והשם בשורה אחת, על לוח הכותרת.
   *
   * תבנית ולא שרשור בקוד: הפסיק הוא סימן פיסוק של שפה, לא של תוכנית.
   * בערבית הוא ‎،‎ ולא ‎,‎ — שרשור ב-JSX היה נועל את כל השפות לתחביר
   * העברי, ומייצר בערבית משפט עם סימן זר באמצע.
   */
  greetNamed: { he: "{greet}, {name}", en: "{greet}, {name}" },
  homeCaseUntitled: { he: "הפנייה שלך", en: "Your case" },
  homeNewCase: { he: "פנייה חדשה", en: "New case" },
  homeFirstCase: { he: "שיתוף המקרה שלי", en: "Share my case" },
  homeEmptyTitle: { he: "עוד לא שיתפת מקרה", en: "No case shared yet" },
  homeEmptySub: { he: "ספרו מה קרה בשיחה קצרה — נארגן סיכום מסודר, ותבחרו עורך דין מהאינדקס.", en: "Tell what happened — we organise a summary, and you choose a lawyer from the index." },
  homeOtherCases: { he: "פניות נוספות", en: "Other cases" },
  homeAllCases: { he: "לכל התיקים", en: "See all cases" },

  // הפרדת הרשאות אדמין
  adminViewOnly: { he: "מצב צפייה", en: "View-only mode" },
  adminViewOnlySub: { he: "החשבון הזה רואה את כל המשרד אך אינו מבצע פעולות. אישור עורכי דין, הכרעה בערעורים וסימון טיפול נעשים מחשבון justask.adv בלבד — כך בדיקה כלקוח לא תאשר בטעות עורך דין אמיתי.", en: "This account can see everything but cannot act. Approving lawyers, resolving appeals and marking items handled are done from justask.adv only." },

  // חדר הבקרה — לוח המשפך
  funnelHeader: { he: "לוח בקרה", en: "Control room" },
  funnelSub: { he: "האם זה מצליח, לא רק האם זה עובד. מתעדכן בזמן אמת.", en: "Whether it's succeeding, not just whether it's up. Live." },
  funnelCreated: { he: "פניות שנפתחו", en: "Cases opened" },
  funnelPassed: { he: "אישרו סיכום", en: "Approved a summary" },
  funnelGotOffer: { he: "קיבלו הצעה", en: "Got an offer" },
  funnelConnected: { he: "נוצר חיבור", en: "Connected" },
  funnelRejected: { he: "נדחו (המודל הקודם)", en: "Rejected (legacy model)" },
  funnelMedianOffer: { he: "חציון להצעה ראשונה", en: "Median to first offer" },
  funnelCalibration: { he: "מדדי הקליטה", en: "Intake metrics" },
  funnelCalibrationSub: { he: "תיקים שאושרו ולא הוגשה בהם אף הצעה. אם קטגוריה בולטת כאן — ייתכן שאין בה מספיק עורכי דין, או שהפניות אליהם נשארות בלי מענה.", en: "Approved cases with no offers yet. A category standing out here may have too few lawyers — or referrals left unanswered." },
  funnelNoOffer: { he: "בלי אף הצעה", en: "no offers yet" },

  // התקציר העובדתי המלא + מדד תגובתיות
  memoHeader: { he: "הסיכום העובדתי", en: "The factual summary" },
  memoSub: { he: "ניתוח העילות, המועדים והטענות שכנגד — נכתב לפני שראיתם את התיק. הערכה ראשונית בלבד; ההכרעה שלכם.", en: "An analysis of the grounds, deadlines and counterarguments — written before you saw the case. An initial estimate only; the call is yours." },
  memoShow: { he: "הצגה", en: "Show" },
  memoHide: { he: "הסתרה", en: "Hide" },
  responseTimeLabel: { he: "מגיב בתוך", en: "Responds within" },
  responseTimeAvg: { he: "בממוצע", en: "on average" },

  // מצבי הפיד של עורך הדין
  feedErrorTitle: { he: "לא הצלחנו לטעון את הפניות", en: "Couldn't load leads" },
  feedErrorSub: { he: "ייתכן שחשבונך עדיין לא מוגדר כעורך דין, או שאין חיבור. נסו לרענן — אם זה חוזר, פנו אלינו דרך העזרה.", en: "Your account may not be set as a lawyer yet, or you're offline. Refresh — if it persists, contact us via Help." },
  feedEmpty: { he: "אין כרגע פניות חדשות בתחומכם. נעדכן ברגע שתגיע פנייה מתאימה.", en: "No new leads in your areas right now. We'll notify you when one arrives." },

  // הצעת שכר טרחה מובנית — שוק פתוח והשוואה אמיתית
  offerModelLabel: { he: "מודל שכר הטרחה", en: "Fee model" },
  feeContingency: { he: "אחוז מהפיצוי", en: "% of award" },
  feeHourly: { he: "לפי שעה", en: "Hourly" },
  feeFixed: { he: "סכום קבוע", en: "Fixed" },
  offerPercentLabel: { he: "אחוז מהפיצוי שייגבה", en: "Percentage of the award" },
  offerHourlyLabel: { he: "תעריף לשעה", en: "Rate per hour" },
  offerFixedLabel: { he: "סכום כולל", en: "Total amount" },
  offerCapWarning: { he: "בתביעות תאונות דרכים (פלת״ד) שכר הטרחה מוגבל בכללי לשכת עורכי הדין — עד 13% מהפיצוי, לפי שלב ההליך. אם זו תאונת דרכים, ההצעה הזו חורגת מהתקרה.", en: "In road-accident claims, Israeli Bar rules cap fees at up to 13% of the award depending on the stage. If this is a road accident, this offer exceeds the cap." },
  // שכר טרחה כפי שהשוק באמת מדבר: מדרגות לפי שלב, מע״מ, מקדמה, ואיסור אחוזים בפלילי
  offerStagedToggle: { he: "אחוז מדורג לפי שלב ההליך", en: "Staged percentage by case stage" },
  offerStagePreSuit: { he: "עד פשרה לפני הגשת תביעה", en: "Settlement before filing suit" },
  offerStagePostSuit: { he: "לאחר הגשת תביעה", en: "After filing suit" },
  offerStageJudgment: { he: "בפסק דין", en: "At judgment" },
  offerOfAwardPreSuit: { he: "מהפיצוי — עד פשרה מוקדמת", en: "of the award — early settlement" },
  offerRetainerLabel: { he: "מקדמה (לא חובה)", en: "Retainer (optional)" },
  offerRetainerHint: { he: "מתקזזת משכר הטרחה", en: "Credited against the fee" },
  offerVatLabel: { he: "מע״מ", en: "VAT" },
  offerVatPlus: { he: "בתוספת מע״מ", en: "Plus VAT" },
  offerVatIncluded: { he: "כולל מע״מ", en: "VAT included" },
  offerNoContingencyCriminal: { he: "בהליך פלילי אסור על עורך דין להתנות שכר טרחה בתוצאות המשפט (חוק לשכת עורכי הדין), ולכן בתיק זה מוצעים תעריף שעתי או סכום קבוע בלבד.", en: "In criminal proceedings, Israeli law forbids fees contingent on the outcome, so this case accepts hourly or fixed-fee offers only." },
  /*
   * המשפט הפשוט מתחת לכל הצעה — מה המודל הזה באמת אומר לכיס.
   *
   * "13% מהפיצוי" הוא מכניקה; "משלמים רק אם מקבלים פיצוי" הוא המשמעות.
   * הלקוח שקורא את זה לא למד משפטים, ולעיתים קרא את ההצעה חמש דקות
   * אחרי שנפגע. משפט אחד, בלי תנאים, בלי סוגריים.
   */
  offerPlainContingency: { he: "משלמים רק אם מקבלים פיצוי — אחוז ממנו. לא קיבלתם, לא שילמתם.", en: "You pay only if you receive compensation — a share of it. No award, no fee." },
  offerPlainFixed: { he: "מחיר אחד סגור לכל הטיפול, ידוע מראש — לא משנה כמה זמן ייקח.", en: "One fixed price for the whole matter, known up front — however long it takes." },
  offerPlainHourly: { he: "תשלום לפי שעות עבודה בפועל. שווה לבקש בפגישה הערכה של היקף השעות.", en: "You pay for actual hours worked. Ask for an hours estimate at the meeting." },
  meansStagedNote: { he: "לפי האחוז עד פשרה מוקדמת; בהמשך ההליך האחוז עולה.", en: "Based on the early-settlement rate; later stages carry a higher rate." },
  offerNoWinLabel: { he: "אין זכייה — אין שכר טרחה", en: "No win, no fee" },
  offerNoWinBadge: { he: "אין זכייה — אין שכר", en: "No win, no fee" },
  offerExpensesLabel: { he: "הוצאות נלוות — אגרות, חוות דעת, שמאי", en: "Case expenses — court fees, expert opinions" },
  expensesIncluded: { he: "כלולות בשכר", en: "Included" },
  expensesAdvanced: { he: "אני מממן ומקבל בחזרה מהפיצוי", en: "I advance, repaid from award" },
  expensesClient: { he: "על הלקוח", en: "Client pays" },
  offerExpensesPh: { he: "הערכה, למשל: כ-3,000₪ אגרה וחוות דעת", en: "Estimate, e.g. about ₪3,000 in fees and opinions" },
  offerExpensesShort: { he: "הוצאות", en: "Expenses" },
  offerOfAward: { he: "מהפיצוי שיתקבל", en: "of the award" },
  offerPerHour: { he: "לשעת עבודה", en: "per hour" },
  offerFixedTotal: { he: "סכום כולל", en: "total" },
  offerNonBinding: { he: "ההצעה היא הערכה ראשונית בלבד ואינה מחייבת. המחייב הוא הסכם שכר טרחה חתום. ודאו שההצעה עומדת בכללי לשכת עורכי הדין החלים על התיק.", en: "This is a preliminary, non-binding estimate. Only a signed fee agreement is binding. Make sure it complies with the Bar rules that apply to this case." },
  offerNonBindingShort: { he: "הערכה ראשונית ואינה מחייבת. המחייב הוא הסכם שכר טרחה חתום.", en: "Preliminary, non-binding estimate. Only a signed fee agreement is binding." },

  // בדיקה מעמיקה שרצה ברקע
  deepCheckRunning: { he: "הסיכום נכתב עכשיו", en: "Your summary is being written" },
  deepCheckRunningSub: { he: "אין מה לעשות מכאן — נעדכן אתכם בהתראה ברגע שהסיכום מוכן לאישור.", en: "Nothing to do here — we'll alert you the moment the summary is ready for your review." },

  // התראות דחיפה
  notifLawyerInterest: { he: "תשובות עורכי דין", en: "Lawyer responses" },
  notifLawyerInterestSub: { he: "כשעורך דין משיב לפנייתך או מגיש הצעה", en: "When a lawyer answers your request or submits a proposal" },
  notifLawyerCaseUpdates: { he: "עדכוני תיקים", en: "Case updates" },
  notifLawyerCaseUpdatesSub: { he: "כשלקוח משתף סיכום, בוחר בך, או מתקדם בתיק", en: "When a client shares a summary, chooses you, or the case moves" },
  notifLawyerReferrals: { he: "פניות אליך", en: "Requests to you" },
  notifLawyerReferralsSub: { he: "כשלקוח בוחר בך מהאינדקס — יש 48 שעות להשיב", en: "When a client picks you from the index — 48 hours to respond" },
  pushEnabled: { he: "התראות הופעלו במכשיר הזה", en: "Notifications enabled on this device" },
  pushDeniedMsg: { he: "לא ניתנה הרשאה להתראות", en: "Notification permission was not granted" },
  pushBlockedHint: { he: "ההתראות חסומות בהגדרות הדפדפן. אפשר לפתוח אותן שם ולחזור לכאן.", en: "Notifications are blocked in your browser settings. Allow them there and come back." },
  pushUnsupportedHint: { he: "הדפדפן הזה אינו תומך בהתראות.", en: "This browser does not support notifications." },
  pushIosHint: { he: "באייפון צריך קודם להוסיף את JustAsk למסך הבית (שיתוף ← הוספה למסך הבית), ואז להפעיל כאן.", en: "On iPhone, add JustAsk to your Home Screen first (Share → Add to Home Screen), then enable here." },

  // יומן שגיאות שרת במשרד הטכנולוגי
  adminErrorsHeader: { he: "תקלות שרת", en: "Server errors" },
  adminErrorsSub: { he: "כשלים בפונקציות ה-AI — כאן תראו אותם גם כשהמשתמש לא דיווח", en: "AI function failures — visible here even when no user reported them" },
  errorsEmpty: { he: "אין תקלות. הכול עובד.", en: "No errors. Everything is running." },
  errorMarkHandled: { he: "סימון כטופל", en: "Mark handled" },
  errorHandled: { he: "טופל", en: "Handled" },

  // הצהרת נגישות (ת"י 5568 / WCAG 2.0 AA)
  accessibility: { he: "נגישות", en: "Accessibility" },
  skipToContent: { he: "דלג לתוכן", en: "Skip to content" },
  refFeedTitle: { he: "הפניות אליך", en: "Referrals to you" },
  refFeedSub: { he: "רק פניות ממי שבחר בך מהאינדקס", en: "Only from people who chose you from the index" },
  refStageA: { he: "בדיקת ניגוד עניינים", en: "Conflict of interest check" },
  refParties: { he: "הצדדים", en: "Parties" },
  refStageANote: { he: "זה כל המידע בשלב הזה. הסיכום ייחשף אחרי שתאשר שאין ניגוד — ואז תוכל להגיש הצעה, או לומר שאינך זמין.", en: "This is all the information at this stage. The summary opens once you confirm there is no conflict — then you can submit a proposal, or say you are not available." },
  refClear: { he: "אין ניגוד — אקרא את הסיכום", en: "No conflict — I'll read the summary" },
  refDecline: { he: "אינני זמין לפנייה זו", en: "Not available for this one" },
  refWaitClient: { he: "אישרת שאין ניגוד · ממתין לפונה לשתף את הסיכום", en: "No conflict confirmed · waiting for the client to share the summary" },
  refExpiredLawyer: { he: "חלון המענה חלף", en: "The response window has passed" },
  refOfferCta: { he: "הגש הצעת שכר טרחה", en: "Submit a fee offer" },
  refOfferSent: { he: "ההצעה הוגשה — ההחלטה אצל הפונה", en: "Offer submitted — the decision is theirs" },
  refOfferAmount: { he: "סכום (₪)", en: "Amount (₪)" },
  refOfferModel: { he: "מודל השכר (למשל: שעתי, קבוע, באחוזים בכפוף לכללים)", en: "Fee model (e.g. hourly, fixed)" },
  refOfferNote: { he: "הערה לפונה (רשות)", en: "Note to the applicant (optional)" },
  refEmpty: { he: "אין פניות כרגע. כשמישהו יבחר בך מהאינדקס — היא תופיע כאן.", en: "No referrals right now. When someone chooses you from the index, it appears here." },
  caseRefsTitle: { he: "הפניות שלך", en: "Your referrals" },
  caseRefWaiting: { he: "ממתין לבדיקת עורך הדין", en: "Awaiting the lawyer's check" },
  caseRefCleared: { he: "אין ניגוד — אשרו את שיתוף הסיכום", en: "No conflict — approve sharing your summary" },
  caseRefShared: { he: "עורך הדין קורא את הסיכום · תקבלו הצעה או עדכון", en: "The lawyer is reading the summary · you'll get a proposal or an update" },
  caseRefDeclined: { he: "אינו זמין לפנייה זו", en: "Not available for this request" },
  caseRefClosed: { he: "הפנייה נסגרה", en: "Request closed" },
  caseRefChosen: { he: "נבחר — נוצר חיבור", en: "Chosen — connected" },
  refChosenLawyer: { he: "נבחרת! פרטי הקשר בתיק — לפתיחת התיק", en: "You were chosen! Contact details are in the case — open it" },
  refClosedLawyer: { he: "הפנייה נסגרה — הפונה התקדם עם עורך דין אחר", en: "Request closed — the client moved ahead with another lawyer" },
  caseRefExpired: { he: "החלון חלף — אפשר לבחור עורך דין אחר", en: "Window passed — you can choose another lawyer" },
  caseRefShare: { he: "אשר ושתף", en: "Approve and share" },
  caseRefOffer: { he: "הצעה", en: "Offer" },
  caseRefChoose: { he: "בחר בו", en: "Choose them" },
  caseSummaryReadyCta: { he: "הסיכום מוכן — עברו עליו ואשרו", en: "Your summary is ready — review and approve" },
  caseChooseCta: { he: "בחרו עורך דין מהאינדקס", en: "Choose a lawyer from the index" },
  idxTitle: { he: "בחירת עורך דין", en: "Choose a lawyer" },
  idxSub: { he: "עורכי דין מאומתים בתחום שבחרת", en: "Verified lawyers in your chosen field" },
  idxOrderNote: { he: "הרשימה מסודרת לפי סדר א״ב. איש אינו משלם על מיקום.", en: "Listed alphabetically. No one pays for placement." },
  idxLicense: { he: "רישיון פעיל לפי מרשם לשכת עורכי הדין", en: "Active licence per the Bar registry" },
  idxSince: { he: "עו״ד משנת {y}", en: "Lawyer since {y}" },
  idxChoose: { he: "פנה אליו לבדיקת ניגוד", en: "Send for conflict check" },
  idxSent: { he: "נשלח — ממתין לבדיקתו", en: "Sent — awaiting their check" },
  idxWhatSent: { he: "מה נשלח בשלב הזה? רק שמות הצדדים המעורבים, התחום, העיר וחודש האירוע — כדי שעורך הדין יבדוק ניגוד עניינים. תיאור המקרה שלך יישלח רק אם תאשר זאת אחרי שהוא יאשר זמינות.", en: "What is sent at this stage? Only the parties involved, the field, city and month of the event — so the lawyer can check for conflicts. Your case description is sent only if you approve it after they confirm availability." },
  idxLimit: { he: "אפשר לפנות לעד שלושה עורכי דין במקביל · לכל אחד 48 שעות להשיב", en: "You can approach up to three lawyers at a time · each has 48 hours to respond" },
  idxLimitHit: { he: "הגעת לשלוש פניות פעילות. המתן לתשובה או בטל אחת.", en: "You have three active requests. Wait for a reply or withdraw one." },
  idxAlready: { he: "כבר פנית אליו על התיק הזה", en: "Already sent for this case" },
  /* דף הבית — שורת "מה חדש" חיה על כרטיס התיק (21/8/2026) */
  homeNewOffer: { he: "התקבלה הצעת שכר טרחה — היכנסו להשוות ולבחור", en: "A fee proposal arrived — compare and choose" },
  homeNewCleared: { he: "עורך הדין זמין — אשרו את שיתוף הסיכום", en: "The lawyer is available — approve sharing the summary" },
  homeNewShared: { he: "עורך הדין קורא את הסיכום — תקבלו הצעה או עדכון", en: "The lawyer is reading the summary — you'll get a proposal or an update" },
  homeNewSent: { he: "הפנייה נשלחה — עורך הדין בודק ניגוד עניינים", en: "Request sent — the lawyer is checking for conflicts" },
  homeNewUnavailable: { he: "עורך הדין אינו זמין — בחרו עורך דין אחר מהאינדקס", en: "The lawyer isn't available — pick another from the index" },
  homeNewConnected: { he: "נוצר חיבור — פרטי הקשר זמינים בתיק", en: "Connected — contact details are in the case" },
  /* שורת הסבר מתחת ל"מה חדש" — מה עושים בשלב הזה */
  homeNewOfferSub: { he: "השוו את ההצעות בתיק ובחרו — רק אז נחשפים פרטי הקשר.", en: "Compare the proposals in the case and choose — only then are contact details revealed." },
  homeNewClearedSub: { he: "הסיכום יישלח רק אחרי האישור שלכם. זה בתיק.", en: "The summary is sent only after your approval. It's in the case." },
  homeNewSharedSub: { he: "אין מה לעשות כרגע — נעדכן ברגע שיש חדש.", en: "Nothing to do right now — we'll update you the moment there's news." },
  homeNewSentSub: { he: "עורך הדין רואה רק שמות. יש לו 48 שעות להשיב.", en: "The lawyer sees names only. They have 48 hours to respond." },
  homeNewUnavailableSub: { he: "זה לא אומר דבר על המקרה. האינדקס פתוח לבחירה נוספת.", en: "This says nothing about your case. The index is open for another choice." },
  homeNewConnectedSub: { he: "מכאן ההסכם נכרת ישירות ביניכם.", en: "From here the agreement is made directly between you." },
  /* שיתוף אוטומטי — הסכמה מראש בשליחת הפנייה */
  idxAutoShare: { he: "אם עורך הדין יאשר זמינות — שתפו את הסיכום אוטומטית", en: "If the lawyer confirms availability — share the summary automatically" },
  idxAutoShareSub: { he: "חוסך המתנה. אפשר לכבות ולאשר כל שיתוף ידנית.", en: "Saves a round-trip. Turn off to approve each share manually." },
  idxEmpty: { he: "עדיין אין עורכי דין מאומתים בתחום הזה. אפשר לבחור תחום אחר — או לנסות שוב בקרוב, האינדקס מתעדכן.", en: "No verified lawyers in this field yet. You can pick another field — or check back soon, the index keeps growing." },
  idxEmptyCity: { he: "אין עורכי דין בתחום בעיר שסיננתם — נקו את הסינון כדי לראות את כל הרשימה.", en: "No lawyers in this field match the city filter — clear it to see the full list." },
  idxChangeField: { he: "בחרו תחום אחר", en: "Pick another field" },
  idxFilterCity: { he: "סינון לפי עיר", en: "Filter by city" },
  idxErr: { he: "הפנייה לא נשלחה. נסו שוב.", en: "The request wasn't sent. Try again." },
  sumTitle: { he: "הסיכום שלך", en: "Your summary" },
  sumSub: { he: "עברו עליו, תקנו מה שצריך, ואשרו", en: "Read it, fix anything that's off, and approve" },
  sumIntro: { he: "זה מה שנרשם ממה שסיפרתם. שום דבר לא נשלח לאיש עד שתאשרו.", en: "This is what was recorded from what you told us. Nothing is sent to anyone until you approve." },
  sumEdit: { he: "אפשר לערוך", en: "You can edit this" },
  sumBring: { he: "מה כדאי להביא לפגישה", en: "What to bring to the meeting" },
  sumPickField: { he: "באיזה תחום לחפש עורך דין?", en: "In which field should we look for a lawyer?" },
  sumPickHint: { he: "הבחירה שלכם, ואפשר לשנות אותה בכל שלב", en: "Your choice, and you can change it at any point" },
  sumSuggestedHint: { he: "סימנּו הצעה לפי הסיכום — הבחירה עדיין שלכם, ואפשר לשנות.", en: "We marked a suggestion based on the summary — the choice is still yours to change." },
  sumApprove: { he: "מאשר וממשיך", en: "Approve and continue" },
  sumNeedField: { he: "בחרו תחום כדי להמשיך", en: "Choose a field to continue" },
  sumSaving: { he: "שומר…", en: "Saving…" },
  sumErr: { he: "השמירה לא הושלמה. בדקו את החיבור ונסו שוב.", en: "Saving didn't complete. Check your connection and try again." },
  errBoundaryTitle: { he: "הדף הזה לא נטען", en: "This page didn't load" },
  errBoundaryBody: { he: "משהו השתבש אצלנו. אפשר לנסות שוב או לחזור למסך הבית.", en: "Something went wrong on our end. You can try again or head back home." },
  errTryAgain: { he: "לנסות שוב", en: "Try again" },
  errGoHome: { he: "למסך הבית", en: "Go home" },
  notFoundTitle: { he: "הדף לא נמצא", en: "Page not found" },
  notFoundBody: { he: "הדף הזה לא קיים או שהוא עבר. בוא נחזיר אותך למסלול.", en: "This page doesn't exist or has moved. Let's get you back on track." },
  adminMaintTitle: { he: "תחזוקה — מחיקת תיק", en: "Maintenance — delete a case" },
  adminMaintSub: { he: "מוחק תיק לצמיתות — כולל ההפניות שלו, אבני דרך, חשיפות קשר והתראות. לתיקי דמו ובדיקה בלבד.", en: "Permanently deletes a case — its referrals, milestones, contact reveals and notifications. Demo and test cases only." },
  adminMaintPh: { he: "מזהה התיק (מכתובת מסך התיק)", en: "Case ID (from the case screen URL)" },
  adminMaintBtn: { he: "מחיקה", en: "Delete" },
  adminMaintConfirm: { he: "בטוח? מחיקה סופית", en: "Sure? This is final" },
  adminMaintDone: { he: "נמחק — {n} רשומות", en: "Deleted — {n} records" },
  adminMaintMissing: { he: "תיק לא נמצא", en: "Case not found" },
  adminMaintErr: { he: "המחיקה נכשלה", en: "Deletion failed" },
  stepDone: { he: "הושלם", en: "Completed" },
  stepCurrent: { he: "עכשיו", en: "In progress" },
  stepPending: { he: "ממתין", en: "Pending" },
  composerAria: { he: "תיבת ההודעה", en: "Message box" },
  rateNoteAria: { he: "הערה לדירוג (רשות)", en: "Rating note (optional)" },
  deleteReasonAria: { he: "סיבת מחיקת החשבון (רשות)", en: "Reason for deleting your account (optional)" },
  helpMessageAria: { he: "ההודעה שלך לתמיכה", en: "Your message to support" },
  msNoteAria: { he: "הערה לעדכון ההתקדמות", en: "Progress update note" },
  appealReasonAria: { he: "נימוק הערעור", en: "Appeal reason" },
  expensesEstimateAria: { he: "אומדן ההוצאות", en: "Estimated expenses" },
  bioAria: { he: "תיאור קצר עליך", en: "A short description of you" },
  a11yTitle: { he: "הצהרת נגישות", en: "Accessibility statement" },
  a11ySub: { he: "מחויבות לשירות נגיש לכולם", en: "Committed to an accessible service for everyone" },
  a11ySection1Title: { he: "המחויבות שלנו", en: "Our commitment" },
  a11ySection1Body: { he: "JustAsk פועלת להנגשת השירות לאנשים עם מוגבלות, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות) ולתקן הישראלי ת\"י 5568 ברמה AA. אנחנו רואים בנגישות חלק מהשירות עצמו — לא תוספת.", en: "JustAsk works to make its service accessible to people with disabilities, in line with Israeli accessibility regulations and Israeli Standard 5568 at level AA. We treat accessibility as part of the service itself." },
  a11ySection2Title: { he: "מה הונגש באפליקציה", en: "What is accessible" },
  a11ySection2Body: { he: "האפליקציה נבנתה עם מבנה סמנטי תקין וציון דרך ראשי בכל מסך, קישור \"דלג לתוכן\" לניווט מקלדת, ניגודיות צבעים העומדת בדרישות, תוויות לקוראי מסך על כל רכיב אינטראקטיבי, טקסט המתאים להגדלה, כיבוד בקשת המערכת להפחתת תנועה, ותמיכה במצב כהה ובהיר. הממשק זמין בשש שפות: עברית, אנגלית, ערבית, רוסית, ספרדית וצרפתית.", en: "The app is built with correct semantic structure and a main landmark on every screen, a \"skip to content\" link for keyboard navigation, colour contrast that meets the requirements, screen-reader labels on every interactive control, text that scales, respect for the system request to reduce motion, and light and dark modes. The interface is available in six languages: Hebrew, English, Arabic, Russian, Spanish and French." },
  a11ySection3Title: { he: "מגבלות ידועות", en: "Known limitations" },
  a11ySection3Body: { he: "טרם נערכה בדיקה על ידי מורשה נגישות מוסמך, וטרם נבדקנו מול קוראי מסך בבדיקה מלאה — שני אלה בתכנון. לא ניתן לנו פטור כלשהו. תוכן שנכתב על ידי משתמשים, כמו תיאורי מקרה והודעות, אינו נבדק מראש. אנחנו ממשיכים לשפר באופן שוטף, וכל פנייה בנושא מטופלת ברצינות ובמהירות. ברכת הפתיחה במסך הבית מוצגת בזהב מתחלף במצב הבהיר, ובשיא המעבר הניגודיות שלה יורדת מתחת לנדרש; במצב הכהה היא עומדת בדרישות. מי שמעדיף קריאות מלאה יכול לעבור למצב כהה בפרופיל.", en: "We have not yet been audited by a certified accessibility auditor, and have not yet completed a full screen-reader pass — both are planned. No exemption has been granted to us. Content written by users, such as case descriptions and messages, is not reviewed in advance. We keep improving, and every report is taken seriously and handled quickly. The home-screen greeting is shown in a shifting gold in light mode, and at the peak of the transition its contrast falls below the requirement; in dark mode it meets it. Anyone who prefers full legibility can switch to dark mode from the profile." },
  a11ySection4Title: { he: "נתקלת בבעיה? דברו איתנו", en: "Found an issue? Contact us" },
  a11ySection4Body: { he: "אם נתקלת בקושי נגישות באפליקציה, נשמח לדעת ולתקן: justask.adv@gmail.com. אנא ציינו את הדף, הפעולה והקושי — נחזור אליכם בהקדם.", en: "If you hit an accessibility issue, email justask.adv@gmail.com with the page, the action and the difficulty — we will get back to you promptly." },
  a11ySection5Title: { he: "רכז הנגישות ודפדפנים שנבדקו", en: "Accessibility coordinator and browsers tested" },
  a11ySection5Body: { he: "רכז הנגישות: דביר, מפעיל השירות — justask.adv@gmail.com. אפשר לפנות בכל שאלה, בקשה או תלונה בנושא נגישות, ונחזור אליכם. האפליקציה נבדקה בדפדפני Chrome ו-Safari בגרסאותיהם העדכניות, במחשב ובמכשיר נייד.", en: "Accessibility coordinator: Dvir, the service operator — justask.adv@gmail.com. You are welcome to raise any accessibility question, request or complaint, and we will get back to you. The app was tested on current versions of Chrome and Safari, on desktop and on mobile." },
  a11yLastUpdated: { he: "עודכן לאחרונה: 17 באוגוסט 2026", en: "Last updated: 17 August 2026" },

  // צירוף תמונות + צנזור אוטומטי
  imageCensoring: { he: "מסתיר פרטים מזהים…", en: "Hiding identifying details…" },
  imageAttachedOne: { he: "התמונה צורפה. פרטים מזהים יוסתרו מעורכי הדין עד יצירת חיבור.", en: "Image attached. Identifying details are hidden from lawyers until you connect." },
  imageReadyToSend: { he: "מוכנה לשליחה — לחצו על החץ", en: "Ready to send — tap the arrow" },
  imageRegionsHidden: { he: "אזורים הוסתרו", en: "areas hidden" },
  imageNoRegions: { he: "לא נמצאו פרטים מזהים", en: "no identifying details found" },
  removeImageAria: { he: "הסרת תמונה", en: "Remove image" },
  caseImagesHeader: { he: "התמונות שצירפת", en: "Your attached images" },
  caseImagesSub: { he: "עורכי הדין רואים גרסה עם פרטים מוסתרים; המקור נחשף רק לעו״ד שתבחרו.", en: "Lawyers see a redacted version; the original is revealed only to the lawyer you choose." },
  resumeValidation: { he: "המשך בהכנת הסיכום", en: "Continue preparing the summary" },
  deleteAccountBtn: { he: "מחיקת החשבון והנתונים", en: "Delete my account and data" },
  deleteConfirmTitle: { he: "למחוק את החשבון?", en: "Delete your account?" },
  deleteConfirmBody: { he: "הפניות הפתוחות שלך ייסגרו מיד ולא יוצגו לעורכי דין. מחיקת החשבון והנתונים תושלם בתוך 14 יום, כנדרש בדין. תיקים שכבר חוברו לעורך דין עשויים להישמר אצלו בהתאם לחובות שמירת מסמכים החלות עליו.", en: "Your open requests close immediately and will no longer be shown to lawyers. Account and data deletion completes within 14 days, as required by law. Cases already connected to a lawyer may be retained by them under their own record-keeping duties." },
  deleteReasonPh: { he: "רוצה לספר לנו למה? (רשות)", en: "Want to tell us why? (optional)" },
  deleteConfirmBtn: { he: "כן, למחוק", en: "Yes, delete" },
  deleteRequestSent: { he: "בקשת המחיקה התקבלה. נשלים אותה תוך 14 יום.", en: "Deletion request received. We'll complete it within 14 days." },
  adminDeletionsHeader: { he: "בקשות מחיקת חשבון", en: "Account deletion requests" },
  deletionsEmpty: { he: "אין בקשות מחיקה.", en: "No deletion requests." },
  deletionMarkDone: { he: "סימון כבוצע", en: "Mark done" },
  deletionDone: { he: "בוצע", en: "Done" },

  navLawyerLeads: { he: "פניות", en: "Requests" },
  navLawyerActive: { he: "התיקים שלי", en: "My cases" },
  lawyerActiveTitle: { he: "התיקים שלי", en: "My cases" },
  lawyerActiveSub: { he: "לקוחות שבחרו בך. כאן מסמנים התקדמות ומגיעים לפרטי הקשר.", en: "Clients who chose you. Mark progress and reach contact details here." },
  lawyerActiveBadge: { he: "פעיל", en: "Active" },
  lawyerActiveClient: { he: "הלקוח", en: "Client" },
  lawyerActiveEmpty: { he: "עוד אין לך תיקים פעילים", en: "No active cases yet" },
  lawyerActiveEmptySub: { he: "תיק יופיע כאן ברגע שלקוח יבחר בך מבין ההצעות שקיבל.", en: "A case appears here the moment a client picks you from the proposals they received." },
  lawyerActiveToFeed: { he: "למסך הפניות", en: "To your requests" },
  expertiseNone: { he: "טרם נבחרו תחומי התמחות", en: "No practice areas selected yet" },
  intakeFunnelHeader: { he: "לפני שנוצר תיק", en: "Before a case exists" },
  intakeFunnelSub: { he: "משתמשים ייחודיים. מי שפתח את השיחה ונטש לא הופיע בשום מקום עד עכשיו — כאן רואים איפה בדיוק עוזבים.", en: "Unique users. Anyone who opened the chat and left was invisible until now — this shows exactly where they drop." },
  intakeFunnelOpened: { he: "פתחו את השיחה", en: "Opened the chat" },
  intakeFunnelEngaged: { he: "כתבו הודעה", en: "Sent a message" },
  intakeFunnelDecided: { he: "הגיעו להכרעה", en: "Reached a decision" },
  intakeFunnelSubmitted: { he: "שלחו לבדיקה", en: "Submitted for review" },
  intakeFunnelNotSuitable: { he: "קיבלו תשובה כנה שאין להם תיק — זה מוצר, לא כישלון", en: "were honestly told they have no case — that's the product, not a failure" },
  deletionPreview: { he: "בדיקה יבשה", en: "Dry run" },
  deletionPreviewTitle: { he: "מה יימחק — בלי למחוק", en: "What would be deleted — nothing is" },
  deletionPreviewSub: { he: "זו הרצה יבשה בלבד. שום דבר לא נמחק. עברו על הרשימה, ורק אז סמנו כבוצע.", en: "This is a dry run only. Nothing was deleted. Review the list, then mark as done." },
  deletionPreviewItems: { he: "פריטים", en: "items" },
  roleSaveFailed: { he: "לא הצלחנו לשמור את הבחירה. בדקו את החיבור ונסו שוב.", en: "We couldn't save your choice. Check your connection and try again." },
  /* עריכת תחומי עיסוק — מסך נפרד שאינו נוגע באימות */
  saveAction: { he: "שמירת התחומים", en: "Save practice areas" },
  savedToast: { he: "התחומים עודכנו — האינדקסים שבהם אתה מופיע השתנו בהתאם", en: "Fields updated — the indexes you appear in changed accordingly" },
  docCheckTitle: { he: "בדיקת המסמכים", en: "Document check" },
  docCheckRun: { he: "הרצה", en: "Run" },
  docCheckRunning: { he: "קורא את המסמכים…", en: "Reading the documents…" },
  docCheckNoFiles: { he: "לא הועלו מסמכים לבדיקה.", en: "No documents were uploaded." },
  docCheckOnDoc: { he: "במסמך:", en: "on document:" },
  docCheckRegistry: { he: "פנקס הלשכה ↗", en: "Bar registry ↗" },
  docCheckDisclaimer: { he: "הבדיקה קוראת את המסמכים ומצליבה מול מה שהוקלד. היא אינה מאמתת מול לשכת עורכי הדין — לשם כך יש את הקישור לפנקס.", en: "This reads the documents and cross-checks the typed details. It does not verify against the Bar Association — use the registry link for that." },
  suspendLawyer: { he: "השעיית עורך הדין", en: "Suspend lawyer" },
  suspendLawyerHint: { he: "חוסם הבעת עניין בתיקים חדשים. תיקים פעילים ממשיכים — ניתוק לקוח באמצע תיק פוגע בו, לא מגן עליו.", en: "Blocks interest in new cases. Active cases continue — cutting a client mid-case harms them, not protects them." },
  reinstateLawyer: { he: "החזרת גישה", en: "Reinstate access" },
  confirmSuspendTitle: { he: "להשעות את עורך הדין?", en: "Suspend this lawyer?" },
  confirmSuspendBody: { he: "מרגע ההשעיה הוא יוסר מהאינדקס ולא יקבל פניות חדשות. תיקים פעילים ממשיכים.", en: "Once suspended they're removed from the index and receive no new requests. Active cases continue." },
  confirmApproveTitle: { he: "לאשר את עורך הדין הזה?", en: "Approve this lawyer?" },
  confirmApproveBody: { he: "מרגע האישור הוא רואה תיקים של לקוחות בתחומים שבחר, ומקבל הודעה שאושר. ודאו שהמסמכים נבדקו.", en: "Once approved they see client cases in their fields and get a notification. Make sure the documents were checked." },
  confirmRejectTitle: { he: "לדחות את הבקשה?", en: "Reject this application?" },
  confirmRejectBody: { he: "עורך הדין יקבל הודעה שהאימות לא אושר, ויוכל להגיש שוב עם מסמכים מעודכנים.", en: "The lawyer will be told the verification wasn't approved and can resubmit with updated documents." },

  /*
   * מתחת לפיד. כל מספר כאן נמדד באמת: visible הוא מה שמוצג לו בפועל,
   * total הוא ספירת התיקים הפתוחים ב-30 הימים האחרונים, ו-untouched
   * נספר מהפיד עצמו. אין כאן אף הבטחה שאי אפשר להצביע על מקורה.
   */
  /*
   * מסך הבית של הלקוח. השלבים מתארים בדיוק את מה שהמערכת עושה, כולל
   * העובדה שפרטי הקשר נחשפים רק אחרי הבחירה — זו ההבטחה המרכזית ללקוח,
   * ולכן היא נאמרת במקום שבו הוא מחכה, ולא רק בתקנון.
   */
  /*
   * שער הבדיקה מול הפנקס. הנוסח מדויק בכוונה: המסמכים הם מה שעורך הדין
   * מסר על עצמו, והפנקס הוא המקור. אין דרך אוטומטית לבדוק אותו — המאגר
   * הפתוח מכיל שמות וכתובות בלבד, בלי מספרי רישיון ובלי סטטוס.
   */
  /*
   * גילוי העיבוד ב-AI. עד עכשיו מסך הפרטיות דיבר על הצפנה ובידוד בלבד,
   * ולא אמר שהתיאור והתמונות נשלחים למנוע של גוגל לניתוח. הנוסח מפורש
   * במכוון — כולל מה נשלח, לשם מה, ואיפה. עדיף לומר יותר.
   */
  /* ארכיון התיקים שהסתיימו — מדף שנפתח כשצריך, לא מסך נפרד */
  /*
   * תרגום ההצעות לכסף. אחוז מפיצוי אינו מספר שלקוח יכול להעריך, ובוודאי
   * אינו בר-השוואה לתעריף שעתי או לסכום קבוע. הנוסח נזהר לא להבטיח דבר:
   * זו אריתמטיקה על סכום שהלקוח בחר, ולא הערכה של שווי התיק.
   */
  /* ---------- הדף הציבורי לעורכי דין ---------- */
  /*
   * כל טענה כאן ניתנת להצבעה על מקורה באפליקציה. במיוחד:
   * "עברו בדיקה ראשונית" ולא "לקוחות מאומתים" (איננו מאמתים לקוחות)
   * ולא "יש להם עילה" (התקנון אומר שהבדיקה אינה ייעוץ משפטי).
   */
  lpMetaTitle: { he: "JustAsk לעורכי דין — פניות ממי שבחר בך", en: "JustAsk for lawyers — requests from clients who chose you" },
  lpMetaDesc: { he: "פנייה מגיעה אליך רק ממי שבחר בך, עם סיכום עובדתי מסודר שהפונה אישר. ההערכה המקצועית — שלך.", en: "A referral reaches you only from someone who chose you, with an approved factual summary. The professional assessment is yours." },
  lpNavCta: { he: "כניסה", en: "Sign in" },
  lpBadge: { he: "חצי שנה ראשונה — ללא תשלום", en: "First six months — free" },
  lpH1a: { he: "לא ליד.", en: "Not a lead." },
  lpH1b: { he: "תיק שכבר נבדק.", en: "A matter already checked." },
  lpSub: { he: "הפונה מספר מה קרה, מאשר סיכום עובדתי, ובוחר אותך מהאינדקס. אתה בודק ניגוד עניינים, רואה את הסיכום — ומחליט.", en: "The applicant tells what happened, approves a factual summary, and chooses you from the index. You check conflicts, see the summary — and decide." },
  lpHeroCta: { he: "הצטרפות כעורך דין", en: "Join as a lawyer" },
  lpHeroNote: { he: "אימות רישיון נדרש · ללא התחייבות", en: "Licence verification required · no commitment" },
  lpArtifactLabel: { he: "כך זה נוחת אצלך", en: "This is what lands with you" },
  lpArtifactAria: { he: "דוגמה לפנייה כפי שהיא מגיעה לעורך דין", en: "Example of a matter as it reaches a lawyer" },

  lpCardCat: { he: "נזיקין ותאונות", en: "Injury & accidents" },
  lpCardUrgent: { he: "48 שעות למענה", en: "48h to respond" },
  lpCardMatch: { he: "בתחום שלך", en: "In your field" },
  lpCardTitle: { he: "מעידה בחדר מדרגות רטוב בבניין מגורים", en: "Fall in a wet residential stairwell" },
  lpCardCity: { he: "חיפה", en: "Haifa" },
  lpMemoLabel: { he: "הסיכום העובדתי", en: "The factual summary" },
  lpMemoBody: { he: "ביום 3.8 מעד הפונה בחדר מדרגות רטוב בבניין מגורים בחיפה ואובחן שבר בקרסול. קיימים: מסמכי שחרור, תמונות מהמקום, פרטי עד.", en: "On 3.8 the applicant slipped in a wet stairwell of a Haifa residential building; an ankle fracture was diagnosed. Available: discharge papers, photos, a witness." },

  lpStat1: { he: "מהפניות — מלקוחות שבחרו בך", en: "of requests come from clients who chose you" },
  lpStat2: {
    he: "תחומי משפט — מקבלים רק את שלך",
    en: "practice areas — you get only yours",
  },
  lpStat3: {
    he: "חודשים ללא תשלום",
    en: "months free",
  },

  lpHowTitle: {
    he: "שלושה שלבים",
    en: "Three steps",
  },
  lpStep1: {
    he: "אדם מספר מה קרה. המערכת בודקת אם יש עניין משפטי — ודוחה מה שאין.",
    en: "A person describes what happened. The system checks for a legal matter — and rejects what has none.",
  },
  lpStep2: {
    he: "הפנייה נפתחת בפניך, בלי שם ובלי פרטי קשר. אתה מביע עניין ומצרף הצעה.",
    en: "The matter opens to you, without a name or contact details. You respond and attach a proposal.",
  },
  lpStep3: {
    he: "הפונה בוחר. רק אז נחשפים פרטיו, וההסכם נכרת ישירות ביניכם.",
    en: "The person chooses. Only then are their details revealed, and the agreement is made directly between you.",
  },
  lpDisclaimer: { he: "JustAsk מארגנת עובדות ומסייעת לאתר ולבחור עורך דין — אינה נותנת ייעוץ משפטי ואינה מעריכה סיכויים. ההכרעה המקצועית כולה של עורך הדין.", en: "JustAsk organises facts and helps find and choose a lawyer — it gives no legal advice and assesses no prospects. The professional judgment is entirely the lawyer's." },

  lpIncTitle: {
    he: "מה כלול",
    en: "What's included",
  },
  lpInc1: {
    he: "כל הפניות בתחומים שסימנת",
    en: "Every matter in the areas you selected",
  },
  lpInc2: { he: "סיכום עובדתי מאושר", en: "An approved factual summary" },
  lpInc3: {
    he: "התראה על כל פנייה חדשה",
    en: "An alert on every new matter",
  },
  lpInc4: {
    he: "הצעת שכר טרחה לפני שהפונה בוחר",
    en: "A fee proposal before the person chooses",
  },

  lpNotTitle: {
    he: "מה שלא תמצא כאן",
    en: "What you won't find",
  },
  lpNot1: {
    he: "אחוז מהתיק",
    en: "A cut of your fee",
  },
  lpNot2: {
    he: "מקום בתור תמורת תשלום",
    en: "A paid place in line",
  },
  lpNot3: {
    he: "בלעדיות, או נפח בלי רלוונטיות",
    en: "Exclusivity, or volume without relevance",
  },
  lpNot4: {
    he: "אחוזי הצלחה שאי אפשר לאמת",
    en: "Success rates that cannot be verified",
  },

  lpFinalTitle: {
    he: "אימות רישיון, ואתה בפנים",
    en: "Verify your licence, and you're in",
  },
  lpFinalSub: {
    he: "רישיון, תעודת בוגר, ובדיקה מול פנקס הלשכה. חצי שנה ללא תשלום.",
    en: "Licence, degree, and a check against the Bar registry. Six months free.",
  },
  lpFinalNote: { he: "מספר עורכי הדין בכל תחום מוגבל בשלב זה", en: "The number of lawyers per field is limited at this stage" },
  lpFooter: { he: "JustAsk — מחברים בין אנשים שנפגעו לעורכי הדין שיכולים לעזור להם", en: "JustAsk — connecting injured people with the lawyers who can help" },
  lpFooterRights: { he: "כל הזכויות שמורות", en: "All rights reserved" },
  lpSpinAria: { he: "סיפור הכניסה לעורכי דין", en: "The lawyer entry story" },
  lpSpinHint: { he: "גללו", en: "Scroll" },
  lpSpin1Title: { he: "לא ליד. תיק שנבדק.", en: "Not a lead. A checked matter." },
  lpSpin1Body: { he: "הפונה מספר מה קרה, המערכת בודקת אם יש עניין משפטי — ואתה מקבל את שניהם.", en: "The person describes what happened, the system checks for a legal matter — and you get both." },
  lpSpin2Title: { he: "סיכום עובדתי מאושר", en: "An approved factual summary" },
  lpSpin2Body: { he: "עילות, מועדים וטענות נגד — לפני שאתה מקדיש דקה אחת לתיק.", en: "Grounds, deadlines and counterarguments — before you spend a single minute." },
  lpSpin3Title: { he: "ההצעה שלך, לפני הבחירה", en: "Your proposal, before the choice" },
  lpSpin3Body: { he: "אתה מביע עניין ומצרף הצעת שכר טרחה. הפונה בוחר — ורק אז נחשפים פרטיו.", en: "You respond and attach a fee proposal. The person chooses — and only then are their details revealed." },
  lpSpin4Title: { he: "אימות רישיון, ואתה בפנים", en: "Verify your licence, and you're in" },
  lpSpin4Body: { he: "רישיון, תעודת בוגר, ובדיקה מול פנקס הלשכה. חצי שנה ראשונה ללא תשלום.", en: "Licence, degree, and a check against the Bar registry. The first six months are free." },

  meansTitle: { he: "מה זה אומר בכסף", en: "What this means in money" },
  meansSub: {
    he: "בחרו סכום להמחשה, וראו מה כל הצעה אומרת בפועל.",
    en: "Pick an example amount and see what each offer actually means.",
  },
  meansFee: { he: "שכר טרחה:", en: "Fee:" },
  meansLeft: { he: "נשאר לכם:", en: "You keep:" },
  meansExpAdv: { he: "+ הוצאות\nיופחתו מהפיצוי", en: "+ expenses\ndeducted from award" },
  meansExpClient: { he: "+ הוצאות\nעליכם בנפרד", en: "+ expenses\npaid by you" },
  meansHourly: {
    he: "הצעה לפי שעה אינה ניתנת לתרגום כאן — הסכום הסופי תלוי בהיקף העבודה. שאלו את עורך הדין להערכת שעות.",
    en: "An hourly offer can't be translated here — the total depends on the work involved. Ask the lawyer for an hours estimate.",
  },
  meansDisclaimer: {
    he: "הסכום שבחרתם הוא דוגמה בלבד ואינו הערכה של שווי התיק. הסכום בפועל ייקבע בהליך, והמחייב הוא הסכם שכר טרחה חתום.",
    en: "The amount you picked is an example only, not an estimate of your case's value. The actual amount is determined in the proceeding; the signed fee agreement governs.",
  },

  /*
   * מסך ההסבר שלפני בקשת ההרשאה של המערכת. מדבר בהפסד קונקרטי ולא
   * בתועלת מופשטת — זה מה שבאמת עומד על הפרק בשני הצדדים.
   */
  primerLawyerTitle: { he: "פנייה אליך מחכה למענה", en: "A request to you awaits a response" },
  primerLawyerBody: {
    he: "כשלקוח בוחר בך מהאינדקס, יש לך 48 שעות להשיב על בדיקת ניגוד העניינים. בלי התראה תגלה את הפנייה רק בכניסה הבאה — והחלון ימשיך לרוץ.",
    en: "When a client picks you from the index, you have 48 hours to answer the conflict check. Without alerts you'll see the request only next time you open the app — while the window keeps running.",
  },
  primerClientTitle: { he: "שנעדכן אותך כשמשהו קורה?", en: "Want updates as things happen?" },
  primerClientBody: { he: "נודיע לך כשהסיכום מוכן, כשעורך דין משיב לפנייתך וכשמתקבלת הצעה. בלי זה תצטרך לבדוק בעצמך.", en: "We'll notify you when the summary is ready, a lawyer replies, or an offer arrives. Without this you'd have to keep checking." },
  primerAllow: { he: "הפעלת התראות", en: "Turn on notifications" },
  primerLater: { he: "לא עכשיו", en: "Not now" },
  primerNote: {
    he: "בשלב הבא הטלפון ישאל אותך — צריך לאשר גם שם.",
    en: "Your phone will ask next — you'll need to approve there too.",
  },

  archiveTitle: { he: "ארכיון", en: "Archive" },
  archiveBadge: { he: "הסתיים", en: "Closed" },

  privacyAi: { he: "ניתוח ע״י בינה מלאכותית", en: "Analysis by AI" },
  privacyAiSub: { he: "ארגון הסיכום נעשה ע״י מנוע Gemini של גוגל. לפני השליחה מוסרים אוטומטית מזהים ישירים — ת.ז., טלפון ודוא״ל.", en: "The summary is organised by Google's Gemini. Direct identifiers — ID, phone, email — are stripped automatically before sending." },

  registryGateTitle: {
    he: "לפני האישור — בדיקה מול פנקס הלשכה",
    en: "Before approving — check the Bar registry",
  },
  registryGateOpen: {
    he: "פתיחת פנקס עורכי הדין ←",
    en: "Open the Bar registry ←",
  },
  registryGateConfirm: {
    he: "בדקתי בפנקס הלשכה ששמו ומספר הרישיון תואמים, ושהרישיון בתוקף.",
    en: "I checked the Bar registry: the name and licence number match, and the licence is valid.",
  },
  registryCheckedOn: { he: "אומת מול הפנקס ב־", en: "Registry-checked on" },

  journeyTitleActive: { he: "איפה הפנייה שלך עומדת", en: "Where your matter stands" },
  journeyTitleEmpty: { he: "מה יקרה אחרי שתשתפו", en: "What happens after you share" },
  journeyStep1: { he: "מספרים מה קרה בשיחה, ומאשרים סיכום עובדתי מסודר — אתם עורכים כל מילה.", en: "Tell what happened in a conversation, and approve a clear factual summary — you edit every word." },
  journeyStep2: { he: "בוחרים עורכי דין מהאינדקס — לפי תחום, עיר ושפה — ושולחים פנייה. עד שלושה במקביל.", en: "Pick lawyers from the index — by field, city and language — and send your request. Up to three at a time." },
  journeyStep3: { he: "עורך הדין מקבל שמות בלבד ובודק ניגוד עניינים. יש לו 48 שעות להשיב.", en: "The lawyer receives names only and checks for conflicts. They have 48 hours to respond." },
  journeyStep4: { he: "מי שאישר קורא את הסיכום ומגיש הצעת שכר טרחה מפורטת — ואתם משווים.", en: "Whoever confirms reads the summary and submits a detailed fee proposal — and you compare." },
  journeyStep5: { he: "בוחרים אחד. רק אז נחשפים פרטי הקשר, וההסכם נכרת ישירות ביניכם.", en: "Choose one. Only then are contact details revealed, and the agreement is made directly between you." },
  journeyNoteSent: { he: "פניות נשלחו", en: "requests sent" },
  journeyNoteOffers: { he: "הצעות התקבלו", en: "proposals received" },

  pulseEyebrow: { he: "בזמן אמת", en: "LIVE" },
  pulseTitle: { he: "מה פתוח עכשיו", en: "Open right now" },
  pulseOutOf: { he: "מתוך", en: "of" },
  pulseOpenNow: { he: "פניות פתוחות כרגע", en: "open matters right now" },
  pulseElsewhere: {
    he: "פניות נוספות פתוחות בתחומים שלא סימנת",
    en: "more open matters are in areas you didn't select",
  },
  pulseMine: { he: "שלך", en: "Yours" },
  pulseUntouched: {
    he: "מהפניות שלך עדיין בלי אף תגובה — אתה הראשון שרואה אותן",
    en: "of your matters have no response yet — you're first to see them",
  },
  pulseEditSpecs: { he: "עדכון התחומים שלי", en: "Update my practice areas" },

  howTitle: { he: "כך עובדת פנייה", en: "How a referral works" },
  howStep1: { he: "פנייה מגיעה אליך רק ממי שבחר בך מהאינדקס. תחילה שמות הצדדים בלבד — לבדיקת ניגוד עניינים. יש 48 שעות להשיב.", en: "A referral reaches you only from someone who chose you from the index. Party names come first — for a conflict-of-interest check. You have 48 hours to respond." },
  howStep2: {
    he: "אישרת זמינות? הסיכום העובדתי נחשף, ותוכל להגיש הצעת שכר טרחה. הפונה רואה את כל ההצעות — איננו מדרגים לפי תשלום.",
    en: "Confirmed availability? The factual summary opens and you can submit a fee proposal. The client sees every proposal — we never rank by payment.",
  },
  howStep3: {
    he: "הפונה בוחר. רק אז נחשפים פרטי הקשר שלו, והתיק עובר ל„התיקים שלי”. ההסכם נכרת ישירות ביניכם.",
    en: "The client chooses. Only then are their contact details revealed and the matter moves to My cases. The agreement is made directly between you.",
  },
  verStatusErrorTitle: { he: "לא הצלחנו לבדוק את סטטוס האימות שלך", en: "Couldn't check your verification status" },
  verStatusErrorSub: { he: "זו תקלת תקשורת ולא שינוי בסטטוס. רעננו את הדף — אם זה חוזר, פנו אלינו דרך העזרה.", en: "This is a connection issue, not a status change. Refresh — if it persists, contact us via Help." },
  casesErrorSub: { he: "התיקים שלך לא נעלמו — רק לא הצלחנו לטעון אותם כרגע. רעננו את הדף.", en: "Your cases haven't gone anywhere — we just couldn't load them. Refresh the page." },
  loadFailedTitle: { he: "הרשימה לא נטענה", en: "This list didn't load" },
  loadFailedSub: { he: "זו תקלה ולא רשימה ריקה. רעננו את הדף.", en: "This is a failure, not an empty list. Refresh the page." },
  /* מדויק ולא מרשים: תג שהציבור מסתמך עליו חייב לומר בדיוק מה נבדק.
     "זהות ורישיון אומתו" נשמע כמו אימות מתמשך; בפועל זו בדיקה ידנית
     מול פנקס הלשכה במועד האישור. ‎`verifiedOnDate` נושא את התאריך. */
  verifiedLawyerChip: { he: "תעודה ומספר רישיון נבדקו מול פנקס הלשכה", en: "Certificate and licence number checked against the Bar register" },
  verifiedOnDate: { he: "נבדק ב-{d}", en: "Checked on {d}" },
  /* גרסה קצרה לשורת מטא צרה — מדויקת באותה מידה, בלי לשבור פריסה. */
  verifiedLawyerChipShort: { he: "רישיון נבדק", en: "Licence checked" },
  verifiedWhatItMeans: { he: "הבדיקה נעשית ידנית מול פנקס הלשכה במועד האישור. היא אינה מהווה המלצה, אינה חוות דעת על טיב הייצוג, ואינה מתעדכנת אוטומטית לאחר מכן.", en: "The check is performed manually against the Bar register at approval. It is not a recommendation, not an opinion on the quality of representation, and is not updated automatically afterwards." },

  /* ---------- מנוי עורכי דין ---------- */
  proHeroTitle: { he: "מה פתוח לך", en: "What's open to you" },
  proNowHeader: { he: "כלול עכשיו — בלי תשלום", en: "Included now — at no cost" },
  proNow1: { he: "פניות ממי שבחר בך מהאינדקס, ברגע שהפונה משתף", en: "Referrals from people who chose you, the moment they share" },
  proNow2: { he: "סיכום עובדתי מאושר — מה קרה, מתי, ואיזה תיעוד קיים", en: "An approved factual summary — what happened, when, and what documentation exists" },
  proNow3: { he: "התראה בזמן אמת על כל פנייה שנשלחת אליך", en: "A real-time alert for every request sent to you" },
  proNow4: { he: "צירוף הצעת שכר טרחה לפני שהלקוח בוחר", en: "Attach a fee proposal before the client chooses" },
  proNow5: { he: "מדד זמן תגובה — שקיפות שהלקוח רואה, זהה לכל עורכי הדין", en: "A response-time metric — transparency the client sees, identical for all lawyers" },
  proLaterHeader: { he: "ומה יקרה בסוף תקופת ההשקה", en: "And what happens when the launch period ends" },
  proLaterSub: { he: "מנוי חודשי קבוע — אותו מחיר בין אם קיבלתם לקוח אחד או עשרה. אין עמלה על לקוח ואין חלק בשכר הטרחה. אין כרגע כרטיס אשראי במערכת, ומועד תחילת החיוב יוצג מראש.", en: "A flat monthly membership — the same price whether you get one client or ten. No per-client fee and no share of your fee. No card on file today; we'll announce the start date in advance." },

  /* ---------- כיסוי תחומים: מה אנחנו באמת מסווגים ---------- */
  specCoverageNote: { he: "אלה התחומים שקיימים כרגע באינדקס. תחום שאינו ברשימה עדיין אינו פתוח לפניות — נעדכן אתכם כשנרחיב.", en: "These are the fields currently in the index. A field not listed isn't open to requests yet — we'll update you as we expand." },

  /* ---------- כשאין עדיין עורך דין בתחום ---------- */

  /* ---------- השוואת הצעות ---------- */
  compareHeader: { he: "השוואת ההצעות", en: "Compare the offers" },
  compareSub: { he: "כל מה שקיבלתם, זה לצד זה. הזול ביותר אינו בהכרח הנכון ביותר — שקלו גם ניסיון, מהירות תגובה ומה כלול.", en: "Everything you received, side by side. Cheapest isn't always right — weigh experience, response time and what's included." },
  compareRange: { he: "טווח ההצעות", en: "Offer range" },
  compareNoOffers: { he: "עורכי דין שקוראים את הסיכום וטרם הגישו הצעה", en: "lawyers reading the summary who haven't submitted a proposal yet" },
  compareOnlyOne: { he: "התקבלה הצעה אחת. אפשר להמתין לעוד או להתקדם איתה.", en: "One offer so far. You can wait for more or move ahead with it." },

  /* ---------- דירוג אחרי סיום התיק ---------- */
  rateTitle: { he: "איך היה עם עורך הדין?", en: "How was it with your lawyer?" },
  rateSub: { he: "הדירוג שלכם הוא מה שעוזר ללקוח הבא לבחור נכון. נשמר בעילום שם.", en: "Your rating is what helps the next client choose well. Saved anonymously." },
  ratePlaceholder: { he: "משהו שכדאי שהלקוח הבא ידע? (רשות)", en: "Anything the next client should know? (optional)" },
  rateSubmit: { he: "שליחת הדירוג", en: "Submit rating" },
  rateThanks: { he: "תודה — הדירוג נשמר", en: "Thanks — your rating was saved" },
  rateLater: { he: "לא עכשיו", en: "Not now" },
  rateDone: { he: "דירגתם את התיק הזה", en: "You rated this case" },
  ratingCount: { he: "דירוגים", en: "ratings" },
  ratingNone: { he: "עוד אין דירוגים", en: "No ratings yet" },

  /* ---------- גיל האירוע: עובדה שכבר חושבה ולא הוצגה ---------- */
  // התראות הפעמון — מפתח+פרמטרים נכתבים על המסמך ומתורגמים בזמן קריאה
  validatingCardHint: { he: "הסיכום נכתב עכשיו — בדרך כלל פחות מדקה, ונעדכן בפעמון", en: "Your summary is being written — usually under a minute; the bell will update" },
  notifRevertedTitle: { he: "הפנייה שלך חזרה לבדיקה", en: "Your case went back for review" },
  notifRevertedBody: { he: "לאחר בדיקה נוספת נדרשים פרטים משלימים. אפשר לפתוח פנייה חדשה עם מידע נוסף — אנחנו כאן.", en: "A further review found details missing. You can open a new case with more information — we're here." },
  notifAppealAcceptedTitle: { he: "הערעור שלך התקבל", en: "Your appeal was accepted" },
  notifAppealAcceptedBody: { he: "צדקת — הפנייה \"{title}\" הוסרה. תודה ששמרת על איכות המערכת.", en: "You were right — \"{title}\" was removed. Thank you for keeping the platform honest." },
  notifAppealDismissedTitle: { he: "הערעור נבדק", en: "Your appeal was reviewed" },
  notifAppealDismissedBody: { he: "בדקנו את \"{title}\" — הבדיקה נשארת בתוקף. תודה על הערנות.", en: "We reviewed \"{title}\" — the assessment stands. Thanks for flagging." },
  /* פעמון — זרימת ההפניות של מודל הבחירה (20/8/2026) */
  notifRefNewTitle: { he: "פנייה חדשה ממתינה לבדיקתך", en: "A new request awaits your review" },
  notifRefNewBody: { he: "מישהו בחר בך מהאינדקס. בדוק ניגוד עניינים והשב בתוך 48 שעות.", en: "Someone chose you from the index. Check for conflicts and respond within 48 hours." },
  notifRefClearedTitle: { he: "אין ניגוד עניינים — עכשיו תורך", en: "No conflict of interest — your turn" },
  notifRefClearedBody: { he: "עורך הדין בדק את שמות הצדדים ואישר שאין ניגוד. אשרו את שיתוף הסיכום כדי שיוכל לקרוא ולהציע.", en: "The lawyer checked the party names and confirmed no conflict. Approve sharing the summary so they can read and propose." },
  notifRefDeclinedTitle: { he: "עורך הדין אינו זמין לפנייה זו", en: "The lawyer is not available for this request" },
  notifRefDeclinedBody: { he: "אפשר לחזור לאינדקס ולבחור עורך דין אחר.", en: "You can return to the index and choose another lawyer." },
  notifRefSharedTitle: { he: "הפונה שיתף את סיכום המקרה", en: "The client shared the case summary" },
  notifRefSharedBody: { he: "הסיכום המלא זמין לעיונך. אפשר להגיש הצעת שכר טרחה.", en: "The full summary is ready for you. You can submit a fee proposal." },
  notifRefOfferTitle: { he: "התקבלה הצעת שכר טרחה", en: "A fee proposal arrived" },
  notifRefOfferBody: { he: "עורך הדין הגיש הצעה לפנייתך. היכנסו להשוות ולבחור.", en: "The lawyer submitted a proposal for your request. Compare and choose." },
  notifRefAutoTitle: { he: "עורך הדין קורא את הסיכום", en: "The lawyer is reading your summary" },
  notifRefAutoBody: { he: "הוא אישר שאין ניגוד עניינים, והסיכום שותף לפי אישורך. תקבלו הצעת שכר טרחה — או עדכון אם יחליט שלא להגיש.", en: "They confirmed no conflict, and the summary was shared per your approval. You'll get a fee proposal — or an update if they decide not to submit one." },
  notifRefNoOfferTitle: { he: "לא התקבלה הצעה בתוך 48 שעות", en: "No proposal within 48 hours" },
  notifRefNoOfferBody: { he: "עורך הדין קרא את הסיכום ולא הגיש הצעה. אפשר לבחור עורך דין אחר מהאינדקס.", en: "The lawyer read the summary and did not submit a proposal. You can choose another lawyer from the index." },
  notifRefClosedTitle: { he: "הפנייה נסגרה", en: "The request was closed" },
  notifRefClosedBody: { he: "הפונה התקדם עם עורך דין אחר. זה לא אומר דבר על המענה שלך.", en: "The client moved ahead with another lawyer. This says nothing about your response." },
  notifRefWithdrawnBody: { he: "הפנייה כבר אינה פתוחה. תודה על הזמן שהשקעת.", en: "The request is no longer open. Thank you for your time." },
  notifChosenTitle: { he: "לקוח בחר בך!", en: "A client chose you!" },
  notifChosenBody: { he: "נבחרת לטפל בפנייה \"{title}\" — פרטי הקשר זמינים בתיק", en: "You were chosen for \"{title}\" — contact details are in the case" },
  /* ההודעה הקשה — ולכן היא עובדתית, קצרה, ובלי עידוד מזויף */
  notifMsTitle_met: { he: "נפגשתם עם עורך הדין", en: "You met your lawyer" },
  notifMsBody_met: { he: "עורך הדין סימן שהפגישה התקיימה.", en: "Your lawyer marked the meeting as held." },
  notifMsTitle_demandSent: { he: "נשלח מכתב דרישה", en: "Demand letter sent" },
  notifMsBody_demandSent: { he: "מכתב הדרישה נשלח לצד שכנגד.", en: "The demand letter went out to the other side." },
  notifMsTitle_filed: { he: "הוגשה תביעה", en: "Suit filed" },
  notifMsBody_filed: { he: "התביעה הוגשה לבית המשפט.", en: "The suit was filed in court." },
  notifMsTitle_closed: { he: "התיק הסתיים", en: "Case closed" },
  notifMsBody_closed: { he: "עורך הדין סימן שהטיפול בתיק הושלם.", en: "Your lawyer marked the case as complete." },
  notifValidatedTitle: { he: "הסיכום שלך מוכן ✓", en: "Your summary is ready ✓" },
  notifValidatedBody: { he: "\"{title}\" אושר — פתחו את התיק לפרטים ולמצב החיפוש", en: "\"{title}\" was approved — open the case for details and search status" },
  notifCaseRejectedTitle: { he: "עדכון על הפנייה שלך", en: "An update on your request" },
  notifVerApprovedTitle: { he: "האימות שלך אושר! 🎉", en: "You're verified! 🎉" },
  notifVerApprovedBody: { he: "הפרופיל שלך אומת — מעכשיו אתה מופיע באינדקס בתחומים שסימנת, ופניות יגיעו ממי שיבחר בך.", en: "Your profile is verified — you now appear in the index in your fields, and requests will come from clients who choose you." },
  notifVerRejectedTitle: { he: "האימות לא אושר", en: "Verification not approved" },
  notifVerRejectedBody: { he: "חלק מהפרטים לא עברו בדיקה. אפשר להגיש שוב עם מסמכים מעודכנים.", en: "Some details didn't pass review. You can resubmit with updated documents." },
  // מודל הניסיון — הקיר עולה לפני לקיחת לקוח, לא אחרי
  trialOverTitle: { he: "{n} לקוחות הגיעו אליך דרך JustAsk", en: "{n} clients reached you through JustAsk" },
  trialOverBody: { he: "התיקים שכבר בטיפולך ממשיכים כרגיל, תמיד. להמשך קבלת פניות חדשות — הצטרפות למנוי.", en: "The cases you already have carry on as normal, always. To keep receiving new enquiries — join the membership." },
  trialOverCta: { he: "לפרטי המנוי", en: "See membership" },
  trialLeftChip: { he: "נותרו {n} חיבורים בניסיון", en: "{n} trial connections left" },
  /* החיבור האחרון — הרגע היחיד שבו המונה מגיע ל-1, ובו כל שש השפות שברו דקדוק */
  trialLeftChipOne: { he: "נותר חיבור אחד בניסיון", en: "1 trial connection left" },
  deleteCancelled: { he: "המחיקה בוטלה — החשבון שלכם פעיל", en: "Deletion cancelled — your account is active" },
  deleteScheduledTitle: { he: "המחיקה נקבעה", en: "Deletion scheduled" },
  deleteScheduledBody: { he: "החשבון וכל התוכן יימחקו אוטומטית בעוד {n} ימים. אם תתחברו שוב לפני כן — המחיקה תבוטל.", en: "Your account and all its content will be deleted automatically in {n} days. Sign in again before then and the deletion is cancelled." },
  noDocsTitle: { he: "רגע לפני ששולחים — באמת אין אצלכם שום תיעוד?", en: "One moment — is there really no documentation?" },
  noDocsBody: { he: "עורך הדין רואה מה קיים אצלכם: מסמכים רפואיים, תמונות מהמקום, התכתבויות, קבלות, עדים או מסמך רשמי. אתם לא מעלים כלום לכאן — רק אומרים מה יש, ותביאו אותו לפגישה. אפשר גם לשלוח בלי, וזה בסדר גמור.", en: "The lawyer sees what you have: medical records, photos of the scene, correspondence, receipts, witnesses or an official document. You upload nothing here — you just say what exists, and bring it to the meeting. Sending without is perfectly fine too." },
  noDocsSendAnyway: { he: "שליחה בכל זאת ←", en: "Send anyway →" },
  greetMorning: { he: "בוקר טוב", en: "Good morning" },
  greetAfternoon: { he: "צהריים טובים", en: "Good afternoon" },
  greetEvening: { he: "ערב טוב", en: "Good evening" },
  greetNight: { he: "לילה טוב", en: "Good night" },
  homeChipOpen: { he: "{n} מתוך {m} פניות פתוחות", en: "{n} of {m} open cases" },
  homeChipOneCase: { he: "פנייה אחת פעילה", en: "One active case" },
  homeChipCases: { he: "פניות פעילות", en: "active cases" },
  homeChipFree: { he: "חינם, תמיד", en: "Free, always" },
  journeyEyebrow: { he: "המסלול שלך", en: "Your path" },
  withdrawCta: { he: "משיכת הפנייה", en: "Withdraw this case" },
  withdrawConfirmTitle: { he: "למשוך את הפנייה?", en: "Withdraw this case?" },
  withdrawConfirmBody: { he: "הפנייה תרד מרשימת עורכי הדין ולא תקבלו עליה עוד הצעות. היא תישאר אצלכם ברשימת התיקים.", en: "The case leaves the lawyers' list and you'll get no further offers. It stays in your own case list." },
  withdrawConfirmBtn: { he: "כן, למשוך", en: "Yes, withdraw" },
  notifWithdrawnTitle: { he: "הפונה משך את הפנייה", en: "The client withdrew their case" },
  notifWithdrawnBody: { he: "\"{title}\" כבר אינו פתוח. תודה על הזמן שהשקעת.", en: "\"{title}\" is no longer open. Thank you for the time you put in." },
  staleCheckTitle: { he: "הכנת הסיכום לא הסתיימה", en: "Summary preparation didn't finish" },
  staleCheckBody: { he: "הכנת הסיכום אמורה לקחת פחות מדקה, וכאן היא נתקעה. אף אחד לא ראה את הפנייה שלך; אפשר לנסות שוב בבטחה.", en: "Preparing the summary should take under a minute, and it stalled. No one saw your request; retrying is safe." },
  staleCheckRetry: { he: "לנסות להכין שוב", en: "Try preparing again" },
  staleCheckRemove: { he: "הסרת הפנייה", en: "Remove this case" },
  tooManyOpenTitle: { he: "יש לכם כבר {n} פניות פתוחות", en: "You already have {n} open cases" },
  tooManyOpenBody: { he: "כדי שכל פנייה תקבל תשומת לב אמיתית מעורכי הדין, אפשר להחזיק עד {n} פניות פתוחות בו-זמנית. ברגע שאחת מהן נסגרת או מתחברת לעורך דין — אפשר לפתוח חדשה.", en: "So every case gets real attention from lawyers, you can hold up to {n} open cases at a time. As soon as one closes or connects with a lawyer, you can open another." },
  matchLabel: { he: "התאמה", en: "Match" },
  reasonSpecPrimary: { he: "התחום המרכזי שלך", en: "Your primary field" },
  reasonSpecSecondary: { he: "תחום משיק לשלך", en: "Adjacent to your fields" },
  reasonLangMatch: { he: "דוברים את שפת הלקוח", en: "You speak the client's language" },
  reasonLangGap: { he: "שפת הלקוח לא ברשימתכם", en: "Client's language not in your list" },
  reasonCityMatch: { he: "באותה עיר", en: "Same city" },
  /* עובדות התאמה שהלקוח רואה על עורך דין — בלי ציון */
  fitField: { he: "עוסק בתחום שלך", en: "Works in your field" },
  fitLanguage: { he: "מדבר את שפתך", en: "Speaks your language" },
  stepLangTitle: { he: "שפות שירות", en: "Languages you work in" },
  stepLangDesc: { he: "שפות השירות שלכם מוצגות ללקוח באינדקס — כך מי שצריך אתכם בשפתו ימצא אתכם.", en: "Your service languages are shown to clients in the index — so someone who needs you in their language finds you." },
  issueLanguages: { he: "בחרו לפחות שפה אחת שבה אתם נותנים שירות", en: "Choose at least one language you can work in" },
  feedLangMismatchNote: { he: "הלקוח ניהל את הפנייה בשפה שלא סימנתם כשפת שירות. שקלו זאת לפני שליחת הצעה — אפשר לעדכן שפות בפרופיל.", en: "This client used a language you didn't list as a service language. Consider that before making an offer — you can update your languages in your profile." },
  feedLangLabel: { he: "שפת הלקוח", en: "Client's language" },
  feedLangMismatch: { he: "לא בשפות שסימנתם", en: "Not in your languages" },
  loadFailedBody: { he: "התיק לא נטען — זו תקלת תקשורת, לא מחיקה. נסו שוב.", en: "The case didn't load — a connection issue, not a deletion. Try again." },
  retryBtn: { he: "לנסות שוב", en: "Try again" },
  uploadTooLarge: { he: "הקובץ גדול מדי — עד 10MB. נסו לצלם מחדש או לדחוס.", en: "That file is too large — 10MB max. Try re-shooting or compressing it." },
  uploadFailed: { he: "לא הצלחנו לקרוא את הקובץ. נסו לבחור אותו שוב, או לשמור אותו למכשיר קודם.", en: "We couldn't read that file. Pick it again, or save it to the device first." },
  cancel: { he: "ביטול", en: "Cancel" },
  msCloseConfirm: { he: "כן, לסגור", en: "Yes, close it" },
  msCloseWarning: { he: "סגירת התיק סופית — אי אפשר לפתוח אותו מחדש. התיק יורד מהתיקים הפעילים שלך, והלקוח יקבל הודעה שהטיפול הסתיים.", en: "Closing is final — the case cannot be reopened. It leaves your active cases and the client is told the work is done." },
  interestLockedUnknown: { he: "לא הצלחנו לבדוק את סטטוס האימות שלך כרגע. רעננו את הדף — זו כנראה תקלת רשת ולא בעיה בחשבון.", en: "We couldn't check your verification status right now. Refresh the page — this is likely a network hiccup, not an account problem." },
  offerStagedIncomplete: { he: "השלימו את שתי המדרגות — אחרת האחוז שהוקלד יוצג ללקוח כאחוז אחיד לכל אורך ההליך.", en: "Fill in both tiers — otherwise the rate you entered is shown to the client as a single flat rate for the whole case." },
  offerImpossiblePercent: { he: "אחוז מהפיצוי אינו יכול לעלות על 100% — בדקו את המספר שהוקלד.", en: "A share of the award cannot exceed 100% — check the number you entered." },
  helpNeedsSignIn: { he: "צריך להתחבר כדי לשלוח פנייה — כך נדע למי לחזור.", en: "Sign in to send a message — that's how we know who to reply to." },

  /*
   * חלון ההתיישנות בשורת הזמן של הפיד.
   *
   * היו כאן שלושה מפתחות שהורכבו לכדי "נותרו להתיישנות 8 חודשים" —
   * חמש מילים על שבב, שנשברו לשלוש שורות ופוצצו את הכרטיס מול כל
   * השאר בפיד. תבנית אחת קצרה, לצד אייקון שעון-חול שמבדיל אותה
   * משעון "לפני יומיים" שלידה.
   *
   * מוצג רק לעורכי דין, ורק בטווח 1–18 חודשים. אפס אינו מוצג: הוא
   * פירושו שהמועד חלף לפי החישוב, ו"נותרו 0 חודשים" הוא משפט חסר
   * מובן שגם נראה כתקלה.
   */
  limitationLeft: { he: "נותרו {n} חודשים", en: "{n} months left" },
} satisfies Dict;

export type StringKey = keyof typeof strings;

/*
 * ארבע השפות הנוספות חיות בקבצים משלהן — קובץ לשפה — ולא בתוך הטבלה
 * הזו: העברית והאנגלית הן מקור האמת שנערך ביד (וגם מה ש-Lovable נוגע
 * בו), והתרגומים מיוצרים ומתוחזקים ככבודה נפרדת. חסר → נופלים לאנגלית,
 * כדי שמפתח חדש שנוסף בעברית לא ישאיר חור ברוסית.
 */
import { ru } from "./i18n.ru";
import { ar } from "./i18n.ar";
import { es } from "./i18n.es";
import { fr } from "./i18n.fr";

const EXTRA: Record<Exclude<Lang, "he" | "en">, Partial<Record<StringKey, string>>> = {
  ru,
  ar,
  es,
  fr,
};

export function translate(key: StringKey, lang: Lang) {
  if (lang === "he" || lang === "en") return strings[key][lang];
  return EXTRA[lang][key] ?? strings[key].en;
}

/**
 * תרגום התראה בזמן קריאה: המסמך נושא מפתח + פרמטרים, והטקסט נבנה
 * בשפת הקורא. מפתח לא מוכר (התראה מגרסה עתידית?) נופל לנוסח העברי
 * שכתוב על המסמך — לעולם לא מסך ריק.
 */
export function translateNotification(
  n: { title: string; body: string; titleKey?: string; bodyKey?: string; params?: Record<string, string> },
  lang: Lang,
): { title: string; body: string } {
  const fill = (tpl: string) =>
    tpl.replace(/\{(\w+)\}/g, (m, k) => n.params?.[k] ?? m);
  const has = (k?: string): k is StringKey => !!k && k in strings;
  return {
    title: has(n.titleKey) ? fill(translate(n.titleKey, lang)) : n.title,
    body: has(n.bodyKey) ? fill(translate(n.bodyKey, lang)) : n.body,
  };
}


export function useT() {
  const { lang } = useSettings();
  return useCallback((key: StringKey) => translate(key, lang), [lang]);
}
