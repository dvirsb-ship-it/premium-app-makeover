import * as Sentry from "@sentry/tanstackstart-react";

type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const scopeContext = {
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
  };

  // Also report to Sentry when the SDK has been initialized.
  try {
    Sentry.captureException(error, { extra: scopeContext });
  } catch {
    // Sentry may not be initialized yet; fall back to the Lovable bridge below.
  }

  window.__lovableEvents?.captureException?.(
    error,
    scopeContext,
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
