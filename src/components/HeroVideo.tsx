import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import phoneSuccess from "../../public/videos/phone-success.mp4.asset.json";
import courtroom from "../../public/videos/courtroom2.mp4.asset.json";
import sealWax from "../../public/videos/seal-wax.mp4.asset.json";

const clips = [
  { src: phoneSuccess.url },
  { src: courtroom.url },
  { src: sealWax.url },
];

/** Each cinematic clip is shown for this fixed duration (ms). */
const CLIP_HOLD_MS = 9_000;

/**
 * Cinematic hero backdrop: three signature legal-themed clips rotate on a
 * fixed timer. This avoids relying on the browser's `ended` event, which can
 * silently fail to fire and cause the backdrop to freeze.
 */
export function HeroVideo({ className = "" }: { className?: string }) {
  const [order] = useState(() => {
    const start = Math.floor(Math.random() * clips.length);
    return clips.map((_, k) => (start + k) % clips.length);
  });
  const [step, setStep] = useState(0);
  const active = order[step % order.length];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => s + 1);
    }, CLIP_HOLD_MS);
    return () => clearInterval(timer);
  }, []);

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
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 scale-105 object-cover"
          src={clips[active].src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
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
