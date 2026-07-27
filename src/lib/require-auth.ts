import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppStore } from "./store";

/**
 * שער התחברות: מפנה ל-/auth רק אחרי שסטטוס ההתחברות ידוע (authReady) —
 * כך רענון או קישור עמוק לא מעיפים משתמש מחובר.
 * מחזיר true כשמותר להציג את התוכן.
 */
export function useRequireAuth(): boolean {
  const { user, authReady } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (authReady && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [authReady, user, navigate]);

  return authReady && !!user;
}
