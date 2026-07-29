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

/*
 * ספארי באייפון אינה תומכת ב-Vibration API כלל, ולכן כל הרטטים באפליקציה
 * לא פעלו שם. הדרך היחידה שנתמכת היא רכיב <input type="checkbox" switch>
 * (iOS 17.4+) — החלפת מצב שלו מפיקה רטט מערכתי אמיתי. מחזיקים אחד מוסתר
 * ומחליפים אותו. אם הרכיב אינו נתמך, הכול מתנהג כמו קודם ולא קורה כלום.
 */
let iosSwitch: HTMLInputElement | null | undefined;

function switchEl(): HTMLInputElement | null {
  if (iosSwitch !== undefined) return iosSwitch;
  if (typeof document === "undefined") {
    iosSwitch = null;
    return null;
  }
  const el = document.createElement("input");
  el.type = "checkbox";
  if (!("switch" in el)) {
    iosSwitch = null;
    return null;
  }
  el.setAttribute("switch", "");
  el.setAttribute("aria-hidden", "true");
  el.tabIndex = -1;
  el.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;opacity:0;pointer-events:none";
  document.body.appendChild(el);
  iosSwitch = el;
  return el;
}

function pulse(times: number) {
  const el = switchEl();
  if (!el) return;
  for (let i = 0; i < times; i++) {
    // הפרש קטן בין הפעימות — רצף מיידי מתמזג לרטט אחד
    window.setTimeout(() => {
      try {
        el.checked = !el.checked;
        el.dispatchEvent(new Event("change", { bubbles: false }));
      } catch {
        /* ignore */
      }
    }, i * 70);
  }
}

const IOS_PULSES: Record<HapticIntensity, number> = {
  light: 1,
  medium: 1,
  heavy: 2,
  selection: 1,
  success: 2,
  warning: 2,
  error: 3,
};

export function haptic(intensity: HapticIntensity = "light") {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === "function") {
    try {
      nav.vibrate(PATTERNS[intensity]);
      return;
    } catch {
      /* ממשיכים למסלול של אייפון */
    }
  }
  pulse(IOS_PULSES[intensity]);
}
