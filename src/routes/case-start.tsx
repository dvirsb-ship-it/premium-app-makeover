import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, useMotionValue, animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, Timer } from "lucide-react";
import { useSettings } from "../lib/settings";
import injuryImg from "../assets/categories/personal-injury.jpg";
import employmentImg from "../assets/categories/employment.jpg";
import realEstateImg from "../assets/categories/real-estate.jpg";
import civilImg from "../assets/categories/civil.jpg";

export const Route = createFileRoute("/case-start")({
  head: () => ({
    meta: [
      { title: "JustAsk — פתיחת פנייה" },
      {
        name: "description",
        content: "בחרו את תחום ההתאמה המשפטית להתחלת הפנייה שלכם ב-JustAsk.",
      },
      { property: "og:title", content: "JustAsk — פתיחת פנייה" },
      {
        property: "og:description",
        content: "פנייה משפטית חדשה — בחירת תחום, שיתוף סיפור והתאמה מקצועית.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseStart,
});

type Cat = { id: string; label: string; image: string };

const CATEGORIES: Cat[] = [
  { id: "injury", label: "נזיקין ותאונות", image: injuryImg },
  { id: "employment", label: "דיני עבודה", image: employmentImg },
  { id: "estate", label: "מקרקעין", image: realEstateImg },
  { id: "civil", label: "אזרחי כללי", image: civilImg },
];

function CaseStart() {
  const navigate = useNavigate();
  const { dir } = useSettings();
  const [selected, setSelected] = useState<Set<string>>(new Set(["injury"]));
  const flip = dir === "rtl" ? "" : "rotate-180";

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    try {
      sessionStorage.setItem(
        "justask-categories",
        JSON.stringify([...selected]),
      );
    } catch {
      /* ignore */
    }
    navigate({ to: "/intake" });
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0b0e15] text-white">
      {/* Cinematic backdrop */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-40 -top-20 h-[520px] w-[520px] rounded-full bg-[#d4af37]/18 blur-[160px]" />
        <div className="absolute -right-32 top-1/3 h-[440px] w-[440px] rounded-full bg-[#4a6ba8]/22 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(10,15,30,0.9),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-6 pt-12">
        {/* Header pill */}
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/onboarding" })}
            className="grid size-9 place-items-center rounded-full bg-white/8 backdrop-blur-xl transition hover:bg-white/12"
            aria-label="חזרה"
          >
            <ArrowLeft className={`size-4 text-white ${flip}`} />
          </button>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="liquid-glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-medium text-white/90"
          >
            <Timer className="size-3 text-white/80" strokeWidth={2} />
            JustAsk · פנייה יומית
          </motion.span>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <p className="text-[14px] text-white/60">ניתן לבחור יותר מאפשרות אחת</p>
          <h1 className="mt-2 text-[28px] font-normal leading-[1.1] tracking-tight text-white">
            באילו תחומים משפטיים
            <br />
            תרצו סיוע?
          </h1>
        </motion.div>

        {/* Selection grid */}
        <div className="grid flex-1 grid-cols-2 gap-3">
          {CATEGORIES.map((c, i) => {
            const isSel = selected.has(c.id);
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.4 + i * 0.08,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex h-[112px] flex-col justify-between overflow-hidden rounded-[28px] p-4 text-start transition ${
                  isSel
                    ? "liquid-glass-selected ring-1 ring-white/25"
                    : "liquid-glass"
                }`}
              >
                {/* Image */}
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition ${
                    isSel ? "opacity-55" : "opacity-25"
                  }`}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/70" />

                <span className="relative text-[11px] font-medium text-white/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative text-[16px] font-medium leading-tight text-white">
                  {c.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Voice button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="my-6 flex flex-col items-center"
        >
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 -m-6"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(220,200,80,0.5) 0%, rgba(180,160,40,0.2) 40%, transparent 70%)",
              }}
            />
            <button
              type="button"
              className="liquid-glass relative grid size-16 place-items-center rounded-full text-white"
              aria-label="הקלטה קולית"
            >
              <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                {[3, 8, 5, 10, 4].map((h, i) => (
                  <line
                    key={i}
                    x1={4 + i * 4.5}
                    x2={4 + i * 4.5}
                    y1={10 - h}
                    y2={10 + h}
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            </button>
          </div>
          <span className="mt-2 text-[12px] text-white/70">קול</span>
        </motion.div>

        {/* Slide to confirm */}
        <SlideToConfirm onConfirm={confirm} flip={flip} />
      </div>
    </div>
  );
}

function SlideToConfirm({
  onConfirm,
  flip,
}: {
  onConfirm: () => void;
  flip: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [max, setMax] = useState(0);
  const { dir } = useSettings();
  const rtl = dir === "rtl";

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setMax(el.clientWidth - 52);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // In RTL, thumb starts on the right and drags leftward (negative x).
  // In LTR, thumb starts on the left and drags rightward (positive x).
  const constraints = rtl
    ? { left: -max, right: 0 }
    : { left: 0, right: max };
  const threshold = rtl ? -max * 0.85 : max * 0.85;
  const endTarget = rtl ? -max : max;

  return (
    <motion.div
      ref={trackRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="liquid-glass relative h-14 w-full overflow-hidden rounded-full"
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] font-medium text-white/60">
        גררו לאישור
      </span>

      <div
        className={`pointer-events-none absolute inset-y-0 flex items-center gap-1 ${
          rtl ? "start-4" : "end-4"
        }`}
      >
        {[0.4, 0.55, 0.7].map((op, i) => (
          <ChevronLeft
            key={i}
            className={`size-3.5 ${flip}`}
            style={{ color: `rgba(255,255,255,${op})` }}
          />
        ))}
      </div>

      <motion.button
        type="button"
        drag="x"
        dragConstraints={constraints}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          const current = x.get();
          const past = rtl ? current < threshold : current > threshold;
          if (past) {
            animate(x, endTarget, {
              type: "spring",
              stiffness: 260,
              damping: 26,
            });
            setTimeout(onConfirm, 220);
          } else {
            animate(x, 0, { type: "spring", stiffness: 260, damping: 26 });
          }
        }}
        className={`absolute inset-y-1.5 z-10 grid size-11 cursor-grab place-items-center rounded-full bg-white text-gray-800 shadow-lg active:cursor-grabbing ${
          rtl ? "end-1.5" : "start-1.5"
        }`}
        aria-label="גררו לאישור"
      >
        <ChevronLeft className={`size-5 ${flip}`} strokeWidth={2.4} />
      </motion.button>
    </motion.div>
  );
}

