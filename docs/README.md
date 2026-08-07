# docs

`legal-brief.html` הוא המקור; `legal-brief.pdf` נוצר ממנו.

לייצור מחדש אחרי עריכה:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --virtual-time-budget=8000 \
  --no-pdf-header-footer \
  --print-to-pdf="docs/legal-brief.pdf" \
  "file://$PWD/docs/legal-brief.html"
```

**אל תערוך את ה-PDF ישירות** — הוא ייכתב מחדש בהרצה הבאה.

הטקסט נשען על `LEGAL-REVIEW-BRIEF.md`. כששניהם משתנים, ה-Markdown הוא
מקור האמת לתוכן וה-HTML לצורה.

## המצגת

`investor-deck.html` → `investor-deck.pdf`, אותה פקודה עם שם קובץ אחר.
16:9 (338×190mm), כהה, 11 שקופיות.

**אין בה שקופית "בקשה"** — היא מציגה ובונה אמינות, ואינה מגייסת. אם
תתווסף בקשה, מקומה אחרי "לאן זה הולך".

**שני דברים שנתפסו רק בקריאת ה-PDF שנוצר, לא בדפדפן:**
- `background-clip: text` על גרדיאנט נכשל ברינדור ההדפסה והמספרים
  יצאו כמלבנים מלאים. צבע אחיד במקום.
- בלי `margin-top: auto` הכותרת התחתונה מטפסת לאמצע השקופית.

**תמיד לקרוא את ה-PDF אחרי הייצור.**

## תוכנית השיווק

`marketing-plan.html` → `marketing-plan.pdf`, אותה פקודה. A4, מסמך עבודה
ולא מצגת — נפתח שוב ושוב ומסמנים בו.

עמוד השדרה הוא **היצע לפני ביקוש**. אם משנים משהו בתוכנית, זו הטענה
שצריך לבדוק מולה: פרסום ללקוחות לפני שיש כיסוי תחומים שורף אנשים
אמיתיים, והם לא חוזרים.
