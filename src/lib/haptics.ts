/**
 * Haptic feedback — safe wrapper around navigator.vibrate.
 *
 * Only fires on devices that support the Vibration API (most Android
 * phones, some iOS PWAs). No-ops silently everywhere else, so callers
 * can pepper it throughout event handlers without worrying.
 */

type HapticIntensity = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const PATTERNS: Record<HapticIntensity, number | number[]> = {
  light: 8,
  medium: 15,
  heavy: 25,
  selection: 5,
  success: [10, 40, 20],
  warning: [20, 60, 20],
  error: [30, 40, 30, 40, 30],
};

export function haptic(intensity: HapticIntensity = "light") {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(PATTERNS[intensity]);
  } catch {
    /* ignore */
  }
}
