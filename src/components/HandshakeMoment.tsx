import { motion, AnimatePresence } from "motion/react";
import handshake from "../../public/videos/handshake.mp4.asset.json";

/**
 * Full-screen cinematic handshake reveal. Plays for ~1.6s then calls onDone.
 * Used at the moment client + lawyer connect (validating success) and as the
 * final beat of the welcome flow.
 */
export function HandshakeMoment({
  open,
  onDone,
  label,
}: {
  open: boolean;
  onDone?: () => void;
  label?: string;
}) {
  return (
    <AnimatePresence
      onExitComplete={onDone}
    >
      {open && (
        <motion.div
          key="handshake"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] grid place-items-center bg-black"
          aria-live="polite"
        >
          <motion.video
            src={handshake.url}
            autoPlay
            muted
            playsInline
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* cinematic vignette + gold pulse at the meeting point */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_55%,transparent_0%,rgba(0,0,0,0.65)_100%)]" />
          <motion.div
            aria-hidden
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.4, 1], opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.6, times: [0, 0.55, 1], ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/40 blur-3xl"
          />
          {label && (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-bold uppercase tracking-[0.32em] text-gold drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]"
            >
              {label}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
