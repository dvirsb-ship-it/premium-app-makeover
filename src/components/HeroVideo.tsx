import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import handshake from "../../public/videos/handshake.mp4.asset.json";
import courtroom from "../../public/videos/courtroom.mp4.asset.json";
import desk from "../../public/videos/desk.mp4.asset.json";

const clips = [
  { src: courtroom.url },
  { src: desk.url },
  { src: handshake.url },
];

/**
 * Cinematic courtroom backdrop: three signature clips slowly cross-fade
 * behind the hero. Order is randomized per session to reduce déjà-vu.
 */
export function HeroVideo({ className = "" }: { className?: string }) {
  const [order] = useState(() => {
    const start = Math.floor(Math.random() * clips.length);
    return clips.map((_, k) => (start + k) % clips.length);
  });
  const [step, setStep] = useState(0);
  const active = order[step % order.length];

  useEffect(() => {
    const id = window.setInterval(
      () => setStep((s) => s + 1),
      11000,
    );
    return () => window.clearInterval(id);
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
          loop
          muted
          playsInline
          preload="auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
      </AnimatePresence>
      {/* Subtle dark vignette to keep the edges cinematic without hiding the video */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,transparent_45%,rgba(2,4,8,0.55)_100%)]" />
    </motion.div>
  );
}
