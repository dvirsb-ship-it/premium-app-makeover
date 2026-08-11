import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppStoreProvider } from "../lib/store";
import { SettingsProvider } from "../lib/settings";
import { Toaster } from "../components/ui/sonner";
import { Splash } from "../components/Splash";
import { BottomNav } from "../components/BottomNav";
import { GlobalHaptics } from "../components/GlobalHaptics";
import handshakeAsset from "../../public/videos/handshake.mp4.asset.json";
import dealAsset from "../../public/videos/deal.mp4.asset.json";
import lawAmbientAsset from "../../public/videos/law-ambient.mp4.asset.json";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04060b] px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_35%,rgba(212,175,55,0.20),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_60%,transparent_30%,rgba(2,4,8,0.9)_100%)]" />
      <div className="liquid-glass relative z-10 mx-auto w-full max-w-sm rounded-3xl px-6 py-10 text-center ring-1 ring-white/10">
        <div className="mx-auto mb-4 text-[80px] font-black leading-none tracking-tight text-transparent" style={{ backgroundImage: "linear-gradient(180deg,#F1E4C3, #B8912B)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>404</div>
        <h2 className="text-xl font-bold text-white">Page not found</h2>
        <p className="mt-2 text-sm text-white/60">
          This page doesn't exist or has moved. Let's get you back on track.
        </p>
        <div className="mt-7">
          <Link
            to="/"
            className="btn-gold inline-flex min-h-11 w-full items-center justify-center rounded-2xl py-3 text-sm font-bold"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "JustAsk — מספרים מה קרה, ומגיעים לעורך דין" },
      {
        name: "description",
        content:
          "ספרו מה קרה בשיחה קצרה. נסדר את הפרטים ונזהה לאיזה תחום הפנייה שייכת, ואז נציג אותה לעורכי דין מאומתים באותו תחום — ואתם בוחרים. חינם לחלוטין.",
      },
      { name: "author", content: "JustAsk" },
      { name: "theme-color", content: "#0F172A" },
      { property: "og:title", content: "JustAsk — מספרים מה קרה, ומגיעים לעורך דין" },
      {
        property: "og:description",
        content:
          "ספרו מה קרה — ונציג את הפנייה לעורכי דין מאומתים בתחום. אתם בוחרים במי לפנות, והשירות חינם.",
      },
      { property: "og:type", content: "website" },
      /*
       * og:image — מה שקופץ כשמישהו שולח את הקישור בוואטסאפ.
       *
       * בלעדיו וואטסאפ נופל על apple-touch-icon, ולכן הוא הציג את
       * אייקון האפליקציה הישן גם אחרי שהוחלף בכל שאר המקומות. כתובת
       * מוחלטת בכוונה: קישור יחסי לא נפתר אצל מי שמושך את התצוגה
       * המקדימה, כי הוא לא גולש באתר.
       */
      { property: "og:image", content: "https://app.justask.co.il/app-icon.png" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:alt", content: "JustAsk" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://app.justask.co.il/app-icon.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      /*
       * Heebo לעברית ולטינית; Noto Sans לקירילית (רוסית) ו-Noto Sans
       * Arabic לערבית. הדפדפן נופל לפונט הבא רק עבור גליפים ש-Heebo לא
       * מכיל, ולכן שפה אחת לא משנה את מראה האחרות.
       */
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Noto+Sans:wght@400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Noto+Sans:wght@400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap",
      },
      /*
       * favicon.ico קיים כקובץ אמיתי ב-public בנוסף להצהרה כאן: סורקים,
       * לקוחות מייל ודפדפנים ותיקים מבקשים /favicon.ico בלי לקרוא את
       * ה-HTML בכלל. בלעדיו כל בקשה כזו קיבלה את עמוד ה-404 המלא —
       * 245 פעמים בשבוע האחרון בלוגים.
       */
      { rel: "icon", type: "image/png", href: "/app-icon.png" },
      { rel: "apple-touch-icon", href: "/app-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AppStoreProvider>
          <Splash
            videoUrls={[handshakeAsset.url, dealAsset.url, lawAmbientAsset.url]}
          >
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            {/*
              תפריט הניווט מרונדר כאן פעם אחת, ולא בכל מסך בנפרד.
              כשכל מסך רינדר אותו בעצמו הוא נשכח — במסך הבית של הלקוח
              ובמסכי פרטי התיק — והתוצאה הייתה חוויה שונה בין הצדדים.
            */}
            <BottomNav />
          </Splash>
          <GlobalHaptics />
          <Toaster />
        </AppStoreProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}
