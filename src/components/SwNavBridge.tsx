import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

/*
 * גשר ניווט מה-service worker (21/8/2026).
 *
 * לחיצה על התראת פוש מגיעה ל-SW, והוא מבקש מהחלון הפתוח לנווט למסך
 * הנכון — במקום client.navigate(), שנכשל על חלון שה-SW אינו שולט בו
 * (באייפון: ההתראה נסגרה ולא קרה כלום). כאן הניווט נעשה בתוך הראוטר,
 * בלי טעינה מחדש, ולכן גם המצב של האפליקציה נשמר.
 */
export function SwNavBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; link?: string } | null;
      if (!d || d.type !== "justask:open" || !d.link) return;
      const link = d.link.startsWith("/") ? d.link : "/";
      void navigate({ to: link as never });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);
  return null;
}
