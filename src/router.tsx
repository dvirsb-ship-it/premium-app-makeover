import * as Sentry from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (!router.isServer) {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (dsn) {
      Sentry.init({
        dsn,
        environment:
          import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || "development",
        release: import.meta.env.VITE_SENTRY_RELEASE,
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
        integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
      });
    }
  }

  return router;
};
