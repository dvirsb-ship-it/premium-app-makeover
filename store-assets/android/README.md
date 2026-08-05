# חבילת אנדרואיד — מוכנה להעלאה

נבנתה 5/8/2026 מ-app.justask.co.il כ-TWA (Trusted Web Activity).

| קובץ | לאן |
|---|---|
| `JustAsk-1.0.0.aab` | **זה מה שמעלים ל-Google Play** |
| `JustAsk-1.0.0.apk` | להתקנה ידנית על מכשיר, לבדיקה לפני העלאה |

## פרטים

- חבילה: `il.co.justask.app`
- גרסה: 1.0.0 (versionCode 1)
- מינימום: Android 5.0 (API 21) · יעד: API 36
- הרשאה: התראות בלבד (POST_NOTIFICATIONS)
- חתום במפתח: `android/android.keystore`, alias `justask`

## החתימה אומתה

טביעת האצבע של ה-APK **זהה** לזו שמוצהרת ב-
`https://app.justask.co.il/.well-known/assetlinks.json`:

```
3F:F5:95:52:D5:6E:9D:54:D2:33:55:B1:A0:A5:F9:0A:E5:9B:67:CD:F7:B0:70:EF:49:3A:D2:D5:BC:53:3B:AC
```

זו ההתאמה שקובעת אם האפליקציה נפתחת נקייה או עם שורת כתובת מעליה.

## לבדיקה על מכשיר לפני העלאה

חבר טלפון אנדרואיד ב-USB והרץ:

```
~/Library/Android/sdk/platform-tools/adb install store-assets/android/JustAsk-1.0.0.apk
```

אם נפתח **בלי שורת כתובת** — הכל תקין.

## לגרסה הבאה

להעלות `appVersionCode` ב-`android/twa-manifest.json` (Play דוחה אותו
מספר פעמיים), ואז לבנות מחדש עם אותה פקודה.
