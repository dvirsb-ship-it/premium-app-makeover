import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

/*
 * חותם הבנייה — /__build מחזיר אותו.
 *
 * נולד מתקלה אמיתית: הייצור החזיר 500, ושלוש פריסות רצופות שתיקנו
 * את התלויות לא שינו דבר. שעה שלמה לא היה אפשר לענות על השאלה
 * הבסיסית — האם הענן בכלל בונה מחדש, או מגיש קוד ישן? קונסולת
 * הפריסות אמרה "Current" בעוד היומן הראה את אותו באנדל.
 *
 * שורה אחת ב-curl עונה על זה עכשיו, בלי לנחש.
 */
const BUILD_STAMP = "2026-08-04T18:40Z";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const originalError = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(originalError);
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/*
 * ---------- Proxy למנגנון ההתחברות של Firebase ----------
 *
 * הבעיה: signInWithPopup נשבר בנייד. ב-PWA שמותקנת למסך הבית iOS אינו
 * יכול לפתוח חלון בתוך האפליקציה, ולכן הוא פותח את גוגל בספארי —
 * והאפליקציה נשארת מאחור. מהמשתמש זה נראה כאילו היא נעלמה.
 *
 * הפתרון הוא signInWithRedirect, אבל לו יש מלכודת משלו: מאז SDK 9.15
 * הוא נשען על אחסון בדומיין של authDomain, וכשזה דומיין אחר
 * (justask-6bfb9.firebaseapp.com) ספארי חוסם אותו כצד-שלישי —
 * וההתחברות פשוט לא חוזרת, בלי שגיאה.
 *
 * לכן אנחנו מגישים את ה-auth handler מהדומיין של האפליקציה עצמה.
 * ברגע שהוא same-origin, אין אחסון צד-שלישי ואין מה לחסום.
 */
const AUTH_UPSTREAM = "https://justask-6bfb9.firebaseapp.com";

/** כותרות שאסור להעביר הלאה — הן שייכות לחיבור עצמו ולא לתוכן. */
const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "content-encoding",
]);

function copyHeaders(source: Headers): Headers {
  const out = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.append(key, value);
  });
  return out;
}

async function proxyFirebaseAuth(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/__/auth/") && !url.pathname.startsWith("/__/firebase/")) {
    return null;
  }
  const target = `${AUTH_UPSTREAM}${url.pathname}${url.search}`;
  const upstream = await fetch(target, {
    method: request.method,
    headers: copyHeaders(request.headers),
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    // @ts-expect-error — נדרש ב-undici כששולחים גוף כזרם
    duplex: "half",
  });
  const headers = copyHeaders(upstream.headers);
  /*
   * ה-SDK טוען את /__/auth/iframe בתוך iframe. כותרת המסגור של המקור
   * מתייחסת לדומיין שלו ותחסום אותנו — היא נשלפת, וההגנה האמיתית היא
   * רשימת הדומיינים המורשים ב-Firebase Auth.
   */
  headers.delete("x-frame-options");
  headers.delete("content-security-policy");
  return new Response(upstream.body, { status: upstream.status, headers });
}

/*
 * ---------- קליטת לידים של עורכי דין מדף הנחיתה ----------
 *
 * דף הנחיתה סטטי (Firebase Hosting) והטופס שולח לכאן — דומיין אחר,
 * ולכן CORS מפורש. הרשימה סגורה: רק הדומיינים שלנו, לא כוכבית.
 */
const LEAD_ORIGINS = new Set([
  "https://justask.co.il",
  "https://www.justask.co.il",
  "https://justask-6bfb9.web.app",
  "https://app.justask.co.il",
]);

function leadCors(origin: string | null): Record<string, string> {
  return origin && LEAD_ORIGINS.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    : {};
}

async function handleLawyerLead(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/lawyer-lead") return null;
  const cors = leadCors(request.headers.get("origin"));

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: cors });

  const { lawyerLeadProblem, normalizeLead } = await import("./lib/lawyer-lead");
  const { adminCreate, sendMailTo, logServerError } = await import("./lib/ai/server-admin");

  try {
    // טופס אנושי שוקל מאות בייטים; מגה-בייט הוא תוקף
    const raw = await request.text();
    if (raw.length > 10_000) return new Response(null, { status: 413, headers: cors });
    const data = JSON.parse(raw) as Record<string, unknown>;

    const problem = lawyerLeadProblem(data);
    if (problem === "bot") {
      // לבוט עונים "הצלחה" — שלא ילמד מה נתפס
      return Response.json({ ok: true }, { headers: cors });
    }
    if (problem) return Response.json({ ok: false, problem }, { status: 400, headers: cors });

    const lead = normalizeLead(data);
    await adminCreate("lawyerLeads", { ...lead, at: Date.now(), source: "landing" });

    /*
     * ליד הוא אירוע שדורש פעולה אנושית מהירה — עורך דין שמילא טופס
     * ולא שמע כלום יומיים כבר התקרר. המייל אל תיבת העסק; כשל בו
     * לא מפיל את הליד, שכבר נשמר.
     */
    await sendMailTo("contact@justask.co.il", {
      title: "ליד חדש: עורך דין נרשם מדף הנחיתה",
      body: `${lead.fullName} · ${lead.specialty} · רישיון ${lead.barNumber} · ${lead.phone} · ${lead.email}`,
      link: "/admin/verifications",
      cta: "לפאנל הניהול",
    });

    return Response.json({ ok: true }, { headers: cors });
  } catch (err) {
    await logServerError("lawyerLead", err).catch(() => undefined);
    return Response.json({ ok: false }, { status: 400, headers: cors });
  }
}

const appHandler: ServerEntry = {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // חותם הבנייה — לפני כל דבר אחר, כדי שיענה גם כשה-SSR נשבר
      if (new URL(request.url).pathname === "/__build") {
        return new Response(BUILD_STAMP, {
          headers: { "content-type": "text/plain", "cache-control": "no-store" },
        });
      }
      const proxied = await proxyFirebaseAuth(request);
      if (proxied) return proxied;
      const lead = await handleLawyerLead(request);
      if (lead) return lead;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

// Sentry הוסר: @sentry/cloudflare מיועד ל-Cloudflare Workers ושבר את חבילת השרת
// על Node (App Hosting) — TypeError: __commonJSMin is not a function ב-opentelemetry.
export default appHandler;
