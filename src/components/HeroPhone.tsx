import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import screenHome from "../assets/hero/screens/screen-home.png.asset.json";
import screenHelp from "../assets/hero/screens/screen-help.png.asset.json";
import screenChat from "../assets/hero/screens/screen-chat.png.asset.json";
import screenChecking from "../assets/hero/screens/screen-checking.png.asset.json";
import screenSuccess from "../assets/hero/screens/screen-success.png.asset.json";

/**
 * A photorealistic 3D iPhone, lit like a studio product shot, slowly floating
 * and rotating while cycling through real screens of the JustAsk app.
 */
const shots = [
  screenHome.url,
  screenHelp.url,
  screenChat.url,
  screenChecking.url,
  screenSuccess.url,
];

export function HeroPhone({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % shots.length),
      3000,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={className} style={{ perspective: "1500px" }} aria-hidden>
      <motion.div
        initial={{ opacity: 0, y: 44, rotateY: -22 }}
        animate={{
          opacity: 1,
          y: [0, -14, 0],
          rotateY: [-15, -8, -15],
          rotateX: [6, 3, 6],
          rotateZ: [-1.5, 0.6, -1.5],
        }}
        transition={{
          opacity: { duration: 1.1 },
          y: { duration: 9, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 15, repeat: Infinity, ease: "easeInOut" },
          rotateX: { duration: 15, repeat: Infinity, ease: "easeInOut" },
          rotateZ: { duration: 15, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative mx-auto"
      >
        {/* floor contact shadow */}
        <div
          aria-hidden
          className="absolute -bottom-8 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-2xl"
        />

        {/* Titanium phone body */}
        <div className="relative h-[452px] w-[220px] rounded-[3rem] bg-gradient-to-br from-[#3a3d44] via-[#17191d] to-[#2c2f35] p-[3px] shadow-[0_44px_90px_-24px_rgba(0,0,0,0.75)]">
          {/* rim light highlights */}
          <div className="pointer-events-none absolute inset-0 rounded-[3rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.6)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.4)_100%)]" />
          <div className="pointer-events-none absolute inset-y-8 -left-[1px] w-[3px] rounded-full bg-white/45 blur-[1px]" />
          <div className="pointer-events-none absolute inset-y-8 -right-[1px] w-[3px] rounded-full bg-white/25 blur-[1px]" />

          {/* inner bezel */}
          <div className="relative h-full w-full overflow-hidden rounded-[2.7rem] bg-black p-[3px]">
            <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-[#f4f6fa]">
              {/* dynamic island */}
              <div className="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-black" />

              {/* screen glare */}
              <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(115deg,rgba(255,255,255,0.32)_0%,transparent_28%,transparent_100%)]" />

              <AnimatePresence mode="wait">
                <motion.img
                  key={index}
                  src={shots[index]}
                  alt=""
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
