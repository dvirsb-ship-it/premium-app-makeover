import { motion } from "motion/react";
import studioVideo from "../assets/hero/studio-phone.mp4.asset.json";
import studioPoster from "../assets/hero/studio-phone-poster.jpg.asset.json";

/**
 * Cinematic studio product clip used as the hero backdrop:
 * a 3D iPhone slowly floating and rotating in a dark, softbox-lit studio.
 */
export function HeroVideo({ className = "" }: { className?: string }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <video
        className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 object-cover"
        src={studioVideo.url}
        poster={studioPoster.url}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      {/* Studio corner falloff — vignette to seat the phone in the dark set */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,transparent_40%,rgba(2,4,8,0.7)_100%)]" />
      {/* Light-mode wash so the dark clip reads against a bright UI */}
      <div className="absolute inset-0 bg-background/55 dark:bg-transparent" />
    </motion.div>
  );
}
