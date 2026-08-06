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
