import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";

/**
 * First-load splash: shows the JustAsk mark with a 0→100% progress bar while
 * pre-warming heavy welcome/hero assets so the first navigation is smooth on
 * every phone. Runs once per browser tab (sessionStorage).
 */

const SESSION_KEY = "justask-preloaded";

// Assets to warm up before revealing the app. Keep this list tight — only
// the media that appears in the very first screens the user sees.
const IMAGE_URLS = [
  "/src/assets/welcome/slide-justice.jpg",
  "/src/assets/welcome/slide-handshake.jpg",
  "/src/assets/welcome/slide-secure.jpg",
];

async function loadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

async function loadVideo(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.src = url;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      v.oncanplaythrough = finish;
      v.onloadeddata = finish;
      v.onerror = finish;
      // Safety timeout: don't block the app if a video is slow.
      window.setTimeout(finish, 4000);
      v.load();
    } catch {
      resolve();
    }
  });
}

export function Splash({
  videoUrls,
  imageUrls,
  children,
}: {
  videoUrls: string[];
  imageUrls?: string[];
  children: React.ReactNode;
}) {
  const [done, setDone] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (done) return;
    let cancelled = false;
    const targets = [...(imageUrls ?? IMAGE_URLS), ...videoUrls];
    const total = Math.max(targets.length, 1);
    let loaded = 0;

    const tick = () => {
      loaded += 1;
      if (!cancelled) {
        setProgress(Math.round((loaded / total) * 100));
      }
    };

    const tasks = targets.map((url) => {
      const isVideo = /\.mp4|\.webm|\.mov/i.test(url) || url.includes("videos/");
      return (isVideo ? loadVideo(url) : loadImage(url)).then(tick);
    });

    // Also make the bar move visually even if network is instant.
    const minDelay = new Promise<void>((r) => window.setTimeout(r, 1200));

    Promise.all([...tasks, minDelay]).then(() => {
      if (cancelled) return;
      setProgress(100);
      window.setTimeout(() => {
        if (cancelled) return;
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
        setDone(true);
      }, 1100);
    });

    return () => {
      cancelled = true;
    };
  }, [done, imageUrls, videoUrls]);

  return (
    <>
      {children}
      <AnimatePresence>
        {!done && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] grid place-items-center bg-[#04060b]"
            aria-hidden
          >
            {/* Ambient gold radial */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(212,175,55,0.18),transparent_65%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_60%,transparent_30%,rgba(2,4,8,0.9)_100%)]" />

            <div className="relative z-10 flex flex-col items-center">
              <BrandMark size={92} />
              <div className="mt-6 text-2xl font-black tracking-tight text-white">
                JustAsk
              </div>

              {/* Progress bar */}
              <div className="mt-8 h-[3px] w-56 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#F1E4C3] via-gold to-[#B8912B]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
              <div className="mt-3 h-[16px] overflow-hidden">
                <AnimatePresence mode="wait">
                  {progress < 100 ? (
                    <motion.div
                      key="pct"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50 tabular-nums"
                    >
                      {progress}%
                    </motion.div>
                  ) : (
                    <motion.div
                      key="welcome"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold"
                    >
                      Welcome to JustAsk.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
