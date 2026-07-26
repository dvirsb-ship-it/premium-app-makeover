import { motion, AnimatePresence } from "motion/react";
import { Handshake } from "lucide-react";

/**
 * Full-screen cinematic reveal used at the moment a client and lawyer connect
 * (validating success) and as the final beat of the welcome flow. Deliberately
 * video-free — a soft gold pulse over deep black keeps the transition smooth
 * and avoids repeating the ambient handshake clip.
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
    <AnimatePresence onExitComplete={onDone}>
      {open && (
        <motion.div
          key="handshake"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] grid place-items-center bg-[#04060b]"
          aria-live="polite"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(212,175,55,0.18),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_55%,transparent_0%,rgba(0,0,0,0.7)_100%)]" />
          <motion.div
            aria-hidden
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.4, 1.05], opacity: [0, 0.7, 0.25] }}
            transition={{ duration: 1.8, times: [0, 0.55, 1], ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/40 blur-3xl"
          />
          <motion.div
            aria-hidden
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative size-24 rounded-[28px] liquid-glass ring-1 ring-gold/40"
          />
          {label && (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
