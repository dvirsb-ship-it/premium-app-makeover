# הערות ל-App Review

הטקסט שנכנס לשדה **"Notes for Review"** ב-App Store Connect. באנגלית, כי
זו השפה שהבודק קורא.

> **הכלל שהנחה את הכתיבה:** כל טענה כאן חייבת להיות בדיקה שהבודק יכול
> לבצע בעצמו תוך דקה. הערות שמסבירות במקום להראות הן מה שגורם לסבב
> דחייה שני.

---

## 1. הטקסט להדבקה

```
JustAsk connects people who were injured with verified Israeli lawyers.

WHAT THE APP DOES
A person describes what happened in a guided conversation. The system
checks the account against Israeli law, writes a legal memo, and opens
the case only to verified lawyers practising in that field. Lawyers
attach a structured fee proposal; the client compares them and chooses.
Contact details are revealed only after that choice.

The initial review is explicitly not legal advice, and the app says so
on the case screen, in the terms, and in the App Store description. We
do not practise law and take no share of any fee.

NATIVE CAPABILITIES (re: guideline 4.2)
The app is not a wrapper around a web page. It uses:
• Push notifications through APNs. A case is checked asynchronously and
  a lawyer may respond hours later; the notification is how the user
  learns. This is not available to the website.
• Camera and photo library, to document an injury, a medical record or
  a receipt as evidence attached to the case.
• Haptic feedback at decision points (submitting a case, choosing a
  lawyer, marking a milestone).
To see push in action: sign in, submit a case, then background the app.
The legal check finishes server-side and the notification arrives.

USER-GENERATED CONTENT AND MODERATION
Case descriptions and photos are written by users. Three controls:
1. Every case passes an automated legal review before any lawyer sees
   it. Cases without legal grounds are rejected and never published.
2. Photos are scanned server-side and identifying regions are masked
   before lawyers see them. The unmasked original is released only to
   the lawyer the client chose.
3. Lawyers can report a case as wrongly validated; an administrator
   reviews it and can remove it from the feed.
Every lawyer passes identity and licence verification, reviewed by a
human, before seeing any case.

ACCOUNT DELETION (re: guideline 5.1.1(v))
Profile → Privacy & security → Delete account. Deletion is scheduled
immediately and executes automatically after seven days; signing in
again within that window cancels it. All cases, photos, notifications
and ratings are erased.

PRIVACY
Case text and attached photos are sent to Google's Gemini for the legal
review. Google acts as our processor. This is described in the privacy
policy at https://justask.co.il/privacy — publicly accessible, no login.

LANGUAGES
Hebrew, English, Russian, Arabic, Spanish and French. Hebrew and Arabic
are right-to-left. The language selector is on the first screen, top
left, before sign-in.

CONTACT
justask.adv@gmail.com
```

---

## 2. חשבונות הבדיקה — חובה

אפל דוחה אוטומטית כשהיא לא יכולה להיכנס. צריך **שני** חשבונות:

| תפקיד | מה חייב להיות מוכן |
|---|---|
| לקוח | לפחות תיק אחד בסטטוס "יש התעניינות", עם הצעה אמיתית להשוואה |
| עורך דין | **מאומת**, עם תחומים מסומנים, כך שהפיד לא ריק |

**בעיה שצריך לפתור לפני ההגשה:** האפליקציה מתחברת רק דרך Google, והבודק
של אפל לא בהכרח יוכל. שתי אפשרויות:
- לפתוח חשבון Google ייעודי לבדיקה ולתת שם וסיסמה בשדה Demo Account
- או להפעיל התחברות אימייל (הקוד קיים מאחורי `GOOGLE_ONLY`)

---

## 3. מה שחוסם הגשה — לא ניתן לעקוף

**Sign in with Apple חובה.** כלל 4.8: אפליקציה שמציעה התחברות של צד
שלישי (אצלנו Google) **חייבת** להציע גם את של אפל. זו דחייה ודאית
בלעדיה, לא סיכון.

הקוד מוכן ויושב מאחורי הדגל `GOOGLE_ONLY` ב-`src/routes/auth.tsx`. מה
שנדרש כדי להדליק:
1. Service ID ב-Apple Developer
2. מפתח Sign in with Apple (.p8)
3. להגדיר את הספק ב-Firebase Authentication
4. `GOOGLE_ONLY = false`

**וגם:** מפתח APNs (.p8) ל-Firebase — בלעדיו ההתראות שאנחנו מתארים
כאן פשוט לא יגיעו, והבודק יבדוק בדיוק את מה שכתבנו.

---

## 4. סיכונים שנשארים, ומה התשובה

| סיכון | התשובה |
|---|---|
| **4.2 — פונקציונליות מינימלית** | שלוש יכולות מקוריות בשימוש אמיתי, וכולן ניתנות לבדיקה בדקה |
| **1.2 — תוכן שנוצר ע"י משתמשים** | סינון אוטומטי, מיסוך תמונות, דיווח, ואימות אנושי של כל עורך דין |
| **5.1.2 — שיתוף עם צד שלישי** | Gemini מתואר במפורש כמעבד, במדיניות הציבורית |
| **שירות משפטי** | נאמר בשלושה מקומות שזה אינו ייעוץ משפטי, ושאיננו צד להסכם |

---

## 5. תיאור לגוגל פליי

Play אינה שואלת "למה זו לא אתר", אבל כן דורשת הצהרת Data Safety
(מוכנה ב-`STORE-LISTING.md`) ו**מדיניות פרטיות ציבורית** — קיימת.

מה שכן שווה לציין שם: האפליקציה מבקשת **הרשאה אחת בלבד** —
`POST_NOTIFICATIONS`. אין מיקום, אין אנשי קשר, אין מזהי פרסום.
