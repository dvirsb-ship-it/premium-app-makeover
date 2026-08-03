import { useEffect, useRef } from "react";

/**
 * פרץ קונפטי זהב-לבן — לרגע שבו לקוח בוחר עורך דין.
 *
 * זה הרגע היחיד במוצר שבו שני צדדים באמת נפגשים, והוא עבר עד היום
 * בשקט מוחלט. הצבעים מרוסנים בכוונה: מי שבוחר עורך דין אחרי פציעה
 * מרגיש הקלה, לא שמחה — קונפטי צבעוני היה נקרא כחגיגה על התיק עצמו.
 * זהב ולבן קוראים כ"נסגר".
 *
 * קנבס ולא DOM: כמאה חלקיקים ב-DOM היו מאה layout nodes; כאן זו
 * לולאת ציור אחת שנעלמת אחרי שתי שניות. prefers-reduced-motion מכובד —
 * לא מציירים כלום.
 */
export function GoldBurst({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current?.();
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const COLORS = ["#F1E4C3", "#D4AF37", "#B8912B", "#FFFFFF", "#FDF6E3"];
    const parts = Array.from({ length: 110 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 7 + Math.random() * 9;
      return {
        x: W / 2 + (Math.random() - 0.5) * 60,
        y: H * 0.62,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 4 + Math.random() * 5,
        h: 7 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const start = performance.now();
    const DURATION = 2000;
    let raf = 0;

    function tick(now: number) {
      const t = now - start;
      ctx!.clearRect(0, 0, W, H);
      if (t >= DURATION) {
        doneRef.current?.();
        return;
      }
      const fade = t > DURATION - 500 ? (DURATION - t) / 500 : 1;
      for (const p of parts) {
        p.vy += 0.32; // כבידה
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx!.save();
        ctx!.globalAlpha = fade;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
