import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import handshake from "../../public/videos/handshake.mp4.asset.json";
import deal from "../../public/videos/deal.mp4.asset.json";
import phoneValidation from "../../public/videos/phone-validation.mp4.asset.json";

const clips = [
  { src: deal.url },
  { src: phoneValidation.url },
  { src: handshake.url },
];

/**
 * Cinematic hero backdrop: three signature clips play once each and cross-fade
 * into the next when each one ends. Order is randomized per session to reduce
 * déjà-vu. No looping — each clip is a one-shot cinematic beat.
 */
export function HeroVideo({ className = "" }: { className?: string }) {
  const [order] = useState(() => {
    const start = Math.floor(Math.random() * clips.length);
    return clips.map((_, k) => (start + k) % clips.length);
  });
  const [step, setStep] = useState(0);
  const active = order[step % order.length];

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
          playsInline
          preload="auto"
          onEnded={() => setStep((s) => s + 1)}
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
