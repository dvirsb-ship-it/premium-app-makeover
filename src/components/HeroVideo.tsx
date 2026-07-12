import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import studioVideo from "../assets/hero/studio-phone.mp4.asset.json";
import studioPoster from "../assets/hero/studio-phone-poster.jpg.asset.json";
import studioVideo2 from "../assets/hero/studio-phone-2.mp4.asset.json";
import studioPoster2 from "../assets/hero/studio-phone-2-poster.jpg.asset.json";

const clips = [
  { src: studioVideo.url, poster: studioPoster.url },
  { src: studioVideo2.url, poster: studioPoster2.url },
];

/**
 * Cinematic studio backdrop: two softbox-lit product clips slowly cross-fade,
 * blurred and darkened so they read as the studio *set* — the sharp CSS phone
 * (HeroPhone) is the star in front of it.
 */
export function HeroVideo({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % clips.length),
      6500,
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
          key={active}
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 scale-110 object-cover blur-[3px]"
          src={clips[active].src}
          poster={clips[active].poster}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      </AnimatePresence>
      {/* Studio corner falloff — vignette to seat the phone in the dark set */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,transparent_35%,rgba(2,4,8,0.82)_100%)]" />
      {/* Light-mode wash so the dark clip reads against a bright UI */}
      <div className="absolute inset-0 bg-background/65 dark:bg-background/25" />
    </motion.div>
  );
}
