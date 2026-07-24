import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppStore } from "./store";

/**
 * Client-side guard for in-app screens. If no role is stored (i.e. the
 * simulated auth session was never established), bounce the user back to
 * /auth. This is a lightweight guard until Cloud auth is wired up.
 */
export function useRequireAuth() {
  const { role } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === null) {
      navigate({ to: "/auth", replace: true });
    }
  }, [role, navigate]);

  return role !== null;
}
