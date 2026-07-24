/**
 * Analytics façade — a thin, provider-agnostic wrapper.
 *
 * This is intentionally a stub. Wire a real provider later
 * (PostHog / Plausible / Segment / Amplitude) by replacing the
 * `sink` function; every call site stays the same.
 *
 * Usage:
 *   track("case_submitted", { category: "labor" });
 *   identify(userId, { role: "client" });
 *   pageview("/cases");
 */

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

type Sink = (event: string, props?: AnalyticsProperties) => void;

// Default sink: dev-only console log. Replace on init() with a real provider.
let sink: Sink = (event, props) => {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props ?? {});
  }
};

let currentUserId: string | null = null;
let superProps: AnalyticsProperties = {};

export function initAnalytics(next: Sink) {
  sink = next;
}

export function identify(userId: string, traits?: AnalyticsProperties) {
  currentUserId = userId;
  sink("$identify", { userId, ...traits });
}

export function reset() {
  currentUserId = null;
  superProps = {};
  sink("$reset");
}

export function setSuperProperties(props: AnalyticsProperties) {
  superProps = { ...superProps, ...props };
}

export function track(event: string, props?: AnalyticsProperties) {
  sink(event, { ...superProps, userId: currentUserId, ...props });
}

export function pageview(path: string) {
  track("$pageview", { path });
}
