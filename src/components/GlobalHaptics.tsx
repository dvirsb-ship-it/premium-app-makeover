import { useEffect } from "react";
import { haptic } from "../lib/haptics";

/**
 * Attaches a delegated click/change listener to fire subtle haptic
 * feedback on any interactive element (buttons, links, inputs).
 * Silently no-ops on devices without the Vibration API.
 */
export function GlobalHaptics() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isInteractive = (el: EventTarget | null): HTMLElement | null => {
      if (!(el instanceof HTMLElement)) return null;
      return el.closest<HTMLElement>(
        'button, a[href], [role="button"], [role="tab"], [role="switch"], summary, label[for], input[type="checkbox"], input[type="radio"]',
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = isInteractive(e.target);
      if (!target) return;
      if (target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") return;
      const strong = target.dataset.haptic === "strong" || target.classList.contains("btn-gold");
      haptic(strong ? "medium" : "selection");
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return null;
}
