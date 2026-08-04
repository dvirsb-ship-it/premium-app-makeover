/**
 * מייצר את דפי הפרטיות והתנאים הציבוריים של אתר הנחיתה.
 *
 * שתי החנויות דורשות כתובת ציבורית למדיניות פרטיות — כזו שנפתחת בלי
 * התחברות. הגרסה שבאפליקציה חיה מאחורי שער האימות, ולכן היא לא עונה
 * על הדרישה.
 *
 * הטקסט נשלף מ-src/lib/i18n.ts, כלומר מאותו מקור שהאפליקציה מציגה.
 * זו הנקודה: העתקה ידנית הייתה מתיישנת ברגע שמישהו יערוך את התנאים,
 * ואז היו לנו שתי גרסאות סותרות של מסמך משפטי — אחת באפליקציה ואחת
 * באוויר. כאן אי אפשר שזה יקרה.
 *
 *   node scripts/build-legal-pages.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("src/lib/i18n.ts", "utf8");
const table = src
  .split("export const strings = {")[1]
  .split("} satisfies Dict;")[0]
  .replace(/\/\*[\s\S]*?\*\//g, ""); // הערות בלוק מבלבלות את החילוץ

function he(key) {
  const re = new RegExp(`\\n  ${key}:\\s*\\{([\\s\\S]*?)\\n?  \\},`);
  const m = table.match(re);
  if (!m) throw new Error(`מפתח חסר ב-i18n: ${key}`);
  const hm = m[1].match(/he:\s*"((?:[^"\\]|\\.)*)"/s);
  if (!hm) throw new Error(`אין ערך עברי ל-${key}`);
  return hm[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** פסקאות מופרדות בשורה ריקה, כמו שהאפליקציה מציגה אותן. */
const paras = (s) =>
  esc(s)
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("\n      ");

const shell = (title, desc, inner) => `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} — JustAsk</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:title" content="${esc(title)} — JustAsk" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="he_IL" />
<link rel="icon" href="/logo-gold.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;900&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink: #16223c; --body: #33405a; --muted: #6b7488;
    --line: rgba(22,34,60,.11); --gold: #d4af37; --gold-text: #8f6f10;
    --bg: #fffdf8; --card: #fff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--body);
    font-family: "Heebo", ui-sans-serif, system-ui, sans-serif;
    line-height: 1.75; font-size: 16px; -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 28px 22px 72px; }
  header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 22px; border-bottom: 1px solid var(--line);
  }
  .brand { display: flex; align-items: center; gap: 9px; font-weight: 900; font-size: 18px; color: var(--ink); text-decoration: none; }
  .brand img { width: 32px; height: 32px; display: block; }
  .brand .wordmark { unicode-bidi: isolate; direction: ltr; }
  .brand b { background: linear-gradient(115deg,#b8912b,#d4af37 45%,#f0d375 70%,#b8912b);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .back { font-size: 13.5px; font-weight: 700; color: var(--gold-text); text-decoration: none; }
  .back:hover { text-decoration: underline; }
  h1 { margin-top: 34px; font-size: clamp(1.8rem,5.5vw,2.4rem); font-weight: 900; color: var(--ink); letter-spacing: -.02em; }
  .sub { margin-top: 8px; color: var(--muted); font-size: 16px; }
  .intro { margin-top: 20px; font-size: 16px; }
  h2 { margin-top: 34px; font-size: 1.1rem; font-weight: 900; color: var(--ink); }
  section p { margin-top: 9px; font-size: 15.5px; }
  .updated { margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted); }
  footer { margin-top: 14px; font-size: 13px; color: var(--muted); }
  footer a { color: var(--gold-text); }
  @media (prefers-color-scheme: dark) {
    :root { --ink:#f6f2e8; --body:#cdd4e0; --muted:#8d97a9; --line:rgba(255,255,255,.1);
      --gold-text:#f0d375; --bg:#0c1320; --card:#141d2d; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/"><img src="/logo-gold.svg" alt="" width="32" height="32" /><span class="wordmark">Just<b>Ask</b></span></a>
    <a class="back" href="/">חזרה לאתר</a>
  </header>
  ${inner}
  <footer>
    שאלות? <a href="mailto:justask.adv@gmail.com">justask.adv@gmail.com</a> · © 2026 JustAsk
  </footer>
</div>
</body>
</html>
`;

/* ---------- פרטיות ---------- */
const privacyBlocks = [
  ["privacyEnc", "privacyEncSub"],
  ["privacyAi", "privacyAiSub"],
  ["privacyControl", "privacyControlSub"],
  ["privacyRls", "privacyRlsSub"],
  ["privacyDelete", "privacyDeleteSub"],
];

const privacyInner = `
  <h1>${esc(he("privacyTitle"))}</h1>
  <p class="sub">${esc(he("privacySub"))}</p>
  <div class="intro">${paras(he("privacyIntro"))}</div>
  ${privacyBlocks
    .map(
      ([t, b]) => `<section>
    <h2>${esc(he(t))}</h2>
    ${paras(he(b))}
  </section>`,
    )
    .join("\n  ")}
  <p class="updated">${esc(he("privacyContact"))}</p>
`;

/* ---------- תנאים ---------- */
const termsInner = `
  <h1>${esc(he("termsTitle"))}</h1>
  <p class="sub">${esc(he("termsSub"))}</p>
  ${[1, 2, 3, 4, 5, 6]
    .map(
      (i) => `<section>
    <h2>${esc(he(`termsSection${i}Title`))}</h2>
    ${paras(he(`termsSection${i}Body`))}
  </section>`,
    )
    .join("\n  ")}
  <p class="updated">${esc(he("termsLastUpdated"))}</p>
`;

mkdirSync("landing/privacy", { recursive: true });
mkdirSync("landing/terms", { recursive: true });
writeFileSync(
  "landing/privacy/index.html",
  shell("מדיניות פרטיות", "איך JustAsk אוספת, שומרת ומגנה על המידע שלכם.", privacyInner),
);
writeFileSync(
  "landing/terms/index.html",
  shell("תנאי שימוש", "התנאים שחלים על השימוש בשירות JustAsk.", termsInner),
);
console.log("נכתבו: landing/privacy/index.html, landing/terms/index.html");
