import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, useMotionValue, animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Scale } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { TopBar } from "../components/TopBar";
import { useSettings } from "../lib/settings";
import injuryImg from "../assets/categories/personal-injury.jpg";
import employmentImg from "../assets/categories/employment.jpg";
import realEstateImg from "../assets/categories/real-estate.jpg";
import civilImg from "../assets/categories/civil.jpg";

export const Route = createFileRoute("/lawyer-onboarding")({
  head: () => ({
    meta: [
      { title: "JustAsk — הרשמת עורך דין" },
      {
        name: "description",
        content: "בחרו את תחומי ההתמחות שלכם כדי לקבל פניות רלוונטיות ב-JustAsk.",
      },
      { property: "og:title", content: "JustAsk — הרשמת עורך דין" },
      {
        property: "og:description",
        content: "בחירת תחומי התמחות להצטרפות לנבחרת עורכי הדין של JustAsk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LawyerOnboarding,
});

type Spec = { id: string; label: string; image: string };

const SPECIALTIES: Spec[] = [
  { id: "injury", label: "נזיקין ותאונות", image: injuryImg },
  { id: "employment", label: "דיני עבודה", image: employmentImg },
  { id: "estate", label: "מקרקעין", image: realEstateImg },
  { id: "civil", label: "אזרחי כללי", image: civilImg },
  { id: "family", label: "דיני משפחה", image: civilImg },
  { id: "criminal", label: "פלילי", image: employmentImg },
  { id: "commercial", label: "מסחרי וחוזים", image: realEstateImg },
  { id: "tax", label: "מיסים", image: injuryImg },
];

function LawyerOnboarding() {
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
        "justask-lawyer-specialties",
        JSON.stringify([...selected]),
      );
    } catch {
      /* ignore */
    }
    navigate({ to: "/lawyer" });
  }

  return (
    <AppShell>
      <TopBar
        title="הרשמת עורך דין"
        subtitle="בחרו את תחומי ההתמחות שלכם"
        onBack={() => navigate({ to: "/" })}
      />

      {/* Intro */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5"
      >
        <span className="liquid-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium text-foreground">
          <Scale className="size-3 text-gold" strokeWidth={2} />
          JustAsk · הצטרפות לנבחרת
        </span>
        <h1 className="mt-4 text-[26px] font-bold leading-[1.15] tracking-tight text-foreground">
          באילו תחומים
          <br />
          אתם מתמחים?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          תקבלו רק פניות שמתאימות להתמחויות שבחרתם. ניתן לבחור יותר מתחום אחד.
        </p>
      </motion.div>

      {/* Selection grid */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {SPECIALTIES.map((c, i) => {
          const isSel = selected.has(c.id);
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.2 + i * 0.06,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex h-[120px] flex-col justify-between overflow-hidden rounded-[24px] p-4 text-start transition ${
                isSel ? "liquid-glass-selected" : "liquid-glass"
              }`}
            >
              <img
                src={c.image}
                alt=""
                loading="lazy"
                width={512}
                height={512}
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition ${
                  isSel ? "opacity-45" : "opacity-20"
                }`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-black/70" />
              <span className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="relative text-[16px] font-semibold leading-tight text-white drop-shadow-lg">
                {c.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Slide to confirm */}
      <div className="mt-6 pb-6">
        <SlideToConfirm
          onConfirm={confirm}
          flip={flip}
          disabled={selected.size === 0}
        />
      </div>
    </AppShell>
  );
}

function SlideToConfirm({
  onConfirm,
  flip,
  disabled,
}: {
  onConfirm: () => void;
  flip: string;
  disabled?: boolean;
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
      transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`liquid-glass relative h-14 w-full overflow-hidden rounded-full ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] font-medium text-muted-foreground">
        גררו להצטרפות
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
            style={{ color: `rgba(212,175,55,${op})` }}
          />
        ))}
      </div>

      <motion.button
        type="button"
        drag={disabled ? false : "x"}
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
        className={`btn-gold absolute inset-y-1.5 z-10 grid size-11 place-items-center rounded-full ${
          disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
        } ${rtl ? "end-1.5" : "start-1.5"}`}
        aria-label="גררו להצטרפות"
      >
        <ChevronLeft className={`size-5 ${flip}`} strokeWidth={2.4} />
      </motion.button>
    </motion.div>
  );
}
