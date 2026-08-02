import { useEffect, useRef, useState } from "react";

/**
 * מספר שרץ מאפס כשמגיעים אליו בגלילה.
 *
 * ה-easing הוא easeOutQuart במכוון: הוא זורק את רוב הדרך מהר ואז נבלם
 * ארוכות לקראת הסוף. זה מה שיוצר את תחושת ה"סלואו מושן" — מספר שרץ
 * ליניארית פשוט נראה כמו טיימר.
 *
 * מכבד prefers-reduced-motion: מי שביקש פחות תנועה מקבל את הערך הסופי
 * מיד, בלי ריצה.
 */
export function CountUp({
  to,
  duration = 2000,
  suffix = "",
  prefix = "",
  className,
}: {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(to);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();

        /*
         * השעון מתחיל בפריים הראשון, לא ברגע שהמשקיף ירה.
         *
         * requestAnimationFrame מושהה בלשונית מוסתרת, אבל IntersectionObserver
         * כן יורה. אילו היינו מתחילים למדוד כאן, מי שפתח את הדף בלשונית רקע
         * וחזר אליה אחרי חצי דקה היה מקבל p>1 בפריים הראשון — כלומר המספר
         * הסופי בלי שום ריצה. הוא היה מפספס בדיוק את מה שבנינו.
         */
        let start = 0;
        const tick = (now: number) => {
          if (!start) start = now;
          const p = Math.min(1, (now - start) / duration);
          // easeOutQuart — מהיר בהתחלה, נבלם ארוכות בסוף
          const eased = 1 - Math.pow(1 - p, 4);
          setValue(to * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      /* 40% מהאלמנט בתוך המסך — מתחיל כשהוא באמת נקרא, לא כשהוא מציץ */
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} dir="ltr" className={className}>
      {prefix}
      {Math.round(value)}
      {suffix}
    </span>
  );
}
