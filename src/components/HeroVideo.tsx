import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import phoneSuccess from "../../public/videos/phone-success.mp4.asset.json";
import courtroom from "../../public/videos/courtroom2.mp4.asset.json";
import sealWax from "../../public/videos/seal-wax.mp4.asset.json";

const clips = [
  { src: phoneSuccess.url },
  { src: courtroom.url },
  { src: sealWax.url },
];

/** Fallback hold if metadata never arrives. */
const FALLBACK_HOLD_MS = 9_000;
/** Small trim so we advance just before the clip would visibly restart. */
const TRIM_MS = 250;

/**
 * Cinematic hero backdrop: three signature legal-themed clips play once each
 * for their natural duration, then we cross-fade to the next clip. No `loop`,
 * so no visible repetition, and a metadata-driven timer so nothing stalls.
 */
export function HeroVideo({ className = "" }: { className?: string }) {
  const [order] = useState(() => {
    const start = Math.floor(Math.random() * clips.length);
    return clips.map((_, k) => (start + k) % clips.length);
  });
  const [step, setStep] = useState(0);
  const active = order[step % order.length];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const advance = () => setStep((s) => s + 1);

  const scheduleAdvance = (ms: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(advance, ms);
  };

  useEffect(() => {
    // Safety fallback in case metadata never loads on some browsers.
    scheduleAdvance(FALLBACK_HOLD_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [step]);

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <AnimatePresence mode="sync">
        <motion.video
          key={step}
          ref={videoRef}
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 scale-105 object-cover"
          src={clips[active].src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (isFinite(d) && d > 0) {
              scheduleAdvance(Math.max(1500, d * 1000 - TRIM_MS));
            }
          }}
          onEnded={advance}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      </AnimatePresence>
      {/* Subtle dark vignette to keep the edges cinematic without hiding the video */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,transparent_45%,rgba(2,4,8,0.55)_100%)]" />
    </motion.div>
  );
}
