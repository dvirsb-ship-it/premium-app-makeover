import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAppStore } from "./store";

/*
 * מסכים שמותר להיות בהם בלי התחברות. בלי הרשימה הזו, ניתוק שמנווט
 * למסך הפתיחה היה נתפס ע"י שער ההתחברות של המסך שממנו יצאנו ומופנה
 * ל-/auth — כלומר מסך הפתיחה נדלג.
 */
const PUBLIC_PATHS = ["/welcome", "/auth"];

/**
 * שער התחברות: מפנה ל-/auth רק אחרי שסטטוס ההתחברות ידוע (authReady) —
 * כך רענון או קישור עמוק לא מעיפים משתמש מחובר.
 * מחזיר true כשמותר להציג את התוכן.
 */
export function useRequireAuth(): boolean {
  const { user, authReady } = useAppStore();
  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    if (!authReady || user) return;
    if (PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))) return;
    navigate({ to: "/auth", replace: true });
  }, [authReady, user, navigate, location.pathname]);

  return authReady && !!user;
}
