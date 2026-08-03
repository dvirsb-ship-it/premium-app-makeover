import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Scale, UserRound } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import handshake from "../../public/videos/handshake.mp4.asset.json";
import courtroom from "../assets/welcome/courtroom-deep.jpg";
import doorLeft from "../assets/welcome/door-left.jpg";
import doorRight from "../assets/welcome/door-right.jpg";
import portalFrame from "../assets/welcome/portal-frame.png";
import { useT } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { useAppStore } from "../lib/store";
import type { Role } from "../lib/types";
import type { StringKey } from "../lib/i18n";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to JustAsk" },
      { name: "description", content: "A quick tour of how JustAsk checks your case." },
      { property: "og:title", content: "Welcome to JustAsk" },
      { property: "og:description", content: "A quick tour of how JustAsk checks your case." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Welcome,
});

const WELCOMED_KEY = "justask-welcomed";

/**
 * שלושת הטקסטים של ה-welcome הישן נשמרו במלואם — מה שהתחלף הוא רק
 * המנגנון: במקום שלוש שקופיות עם כפתור "הבא", המשתמש גולל, ובאותה
 * גלילה נפתחות דלתות בית המשפט אל האולם שבפנים. זה אותו תהליך שהלקוח
 * עובר בפועל, ולכן הגלילה היא הסיפור ולא קישוט מעליו.
 */
const beats: { title: StringKey; body: StringKey; range: [number, number, number, number] }[] = [
  { title: "welcomeSlide1Title", body: "welcomeSlide1Body", range: [0.02, 0.1, 0.2, 0.28] },
  { title: "welcomeSlide2Title", body: "welcomeSlide2Body", range: [0.3, 0.38, 0.48, 0.56] },
  { title: "welcomeSlide3Title", body: "welcomeSlide3Body", range: [0.58, 0.66, 0.74, 0.8] },
];

function Welcome() {
  const navigate = useNavigate();
  const t = useT();
  const { setRole } = useAppStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [sealing, setSealing] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [ctaLive, setCtaLive] = useState(false);

  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end end"] });
  /*
   * ההחלקה היא מה שהופך גלילה במובייל מ"קפיצות" לתנועת מצלמה. spring על
   * ה-progress ולא על כל שכבה בנפרד — כך כל השכבות נשארות מסונכרנות.
   */
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.35 });

  // Doors swing outward in real 3D; the frame pushes past the camera.
  const leftRotate = useTransform(p, [0.1, 0.86], [0, -84]);
  const rightRotate = useTransform(p, [0.1, 0.86], [0, 84]);
  const doorShift = useTransform(p, [0.1, 0.86], [0, -14]);
  const doorShiftR = useTransform(p, [0.1, 0.86], [0, 14]);
  const doorFade = useTransform(p, [0.8, 0.94], [1, 0]);

  const roomScale = useTransform(p, [0, 1], [1.04, 1.42]);
  const roomOpacity = useTransform(p, [0, 0.35, 0.7], [0.35, 0.75, 1]);

  const frameScale = useTransform(p, [0, 1], [1, 1.85]);
  const frameFade = useTransform(p, [0.72, 0.95], [1, 0]);

  const vignette = useTransform(p, [0, 0.75], [0.82, 0.42]);
  const hintFade = useTransform(p, [0, 0.05], [1, 0]);

  const ctaOpacity = useTransform(p, [0.86, 0.98], [0, 1]);
  const ctaY = useTransform(p, [0.86, 0.98], [40, 0]);
  useMotionValueEvent(p, "change", (v) => setCtaLive(v > 0.9));

  function finish() {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      /* ignore */
    }
    navigate({ to: "/auth" });
  }

  function choose(role: Role) {
    haptic("success");
    setRole(role);
    setSealing(true);
  }

  // Safety net: leave even if the handshake clip never fires `ended`.
  useEffect(() => {
    if (!sealing) return;
    const id = window.setTimeout(() => {
      setFadingOut(true);
      window.setTimeout(finish, 700);
    }, 9000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealing]);

  if (sealing) return <SealMoment fadingOut={fadingOut} onDone={() => {
    setFadingOut(true);
    window.setTimeout(finish, 700);
  }} />;

  return (
    <div ref={scrollRef} className="relative w-full bg-[#04060b]" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden" style={{ perspective: "1100px" }}>
        {/* The room behind the doors */}
        <motion.img
          src={courtroom}
          alt=""
          aria-hidden
          style={{ scale: roomScale, opacity: roomOpacity }}
          className="absolute inset-0 z-0 h-full w-full object-cover will-change-transform"
        />
        <motion.div
          aria-hidden
          style={{ opacity: vignette }}
          className="absolute inset-0 z-[1] bg-[radial-gradient(115%_95%_at_50%_45%,transparent_25%,rgba(2,4,8,0.95)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(212,175,55,0.2),transparent_60%)]"
        />

        {/* Stone portal frame pushing toward the viewer */}
        <motion.img
          src={portalFrame}
          alt=""
          aria-hidden
          style={{ scale: frameScale, opacity: frameFade }}
          className="absolute left-1/2 top-1/2 z-[3] h-[112%] w-auto min-w-full -translate-x-1/2 -translate-y-1/2 object-cover will-change-transform"
        />

        {/* The two door leaves, hinged at the outer edges */}
        <motion.div
          aria-hidden
          style={{ opacity: doorFade }}
          className="absolute inset-0 z-[4] will-change-[opacity]"
        >
          <motion.img
            src={doorLeft}
            alt=""
            style={{ rotateY: leftRotate, x: doorShift, transformOrigin: "left center" }}
            className="absolute bottom-0 left-0 top-0 h-full w-1/2 object-cover object-right will-change-transform"
          />
          <motion.img
            src={doorRight}
            alt=""
            style={{ rotateY: rightRotate, x: doorShiftR, transformOrigin: "right center" }}
            className="absolute bottom-0 right-0 top-0 h-full w-1/2 object-cover object-left will-change-transform"
          />
          {/* warm light spilling through the widening seam */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(240,214,146,0.22),transparent)] blur-xl" />
        </motion.div>

        {/*
         * הקופי חייב להישאר קריא גם כשהוא יושב על עץ בהיר וגם כשהוא יושב על
         * קרן אור באולם. במקום להצמיד צל לכל שורה, יש כאן שכבת החשכה אחת
         * מתחת לטקסט — היא נראית כמו עומק בסצנה, לא כמו רקע לכיתוב.
         */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[8] bg-[radial-gradient(85%_42%_at_50%_47%,rgba(2,4,8,0.78),transparent_72%)]"
        />
        <motion.div
          aria-hidden
          style={{ opacity: ctaOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[9] h-[46%] bg-gradient-to-t from-[#04060b] via-[#04060b]/55 to-transparent"
        />

        {/* Chrome + copy */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col px-6 pb-10 pt-10">

          <div className="pointer-events-auto flex items-center justify-between">
            <BrandMark size={44} />
            <button
              type="button"
              onClick={finish}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
            >
              {t("welcomeSkip")}
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            {beats.map((b) => (
              <Beat key={b.title} p={p} beat={b} />
            ))}
          </div>

          <motion.div
            style={{ opacity: hintFade }}
            className="flex flex-col items-center gap-1.5 text-white/60"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em]">
              {t("welcomeScrollHint")}
            </span>
            <motion.span
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="size-5" />
            </motion.span>
          </motion.div>
        </div>

        {/* Role choice — the destination of the whole walk */}
        <motion.div
          style={{ opacity: ctaOpacity, y: ctaY }}
          className={`absolute inset-x-0 bottom-0 z-20 px-6 pb-10 ${ctaLive ? "" : "pointer-events-none"}`}
        >
          <div className="mx-auto w-full max-w-sm space-y-3">
            <p className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-gold/80">
              {t("welcomeEnterTitle")}
            </p>
            <button
              type="button"
              onClick={() => choose("client")}
              className="liquid-glass glass-hero block w-full rounded-[22px] p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            >
              <div className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-foreground/5 text-foreground">
                  <UserRound className="size-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-tight text-foreground">
                    {t("clientCTA")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("clientCTASub")}</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => choose("lawyer")}
              className="liquid-glass-selected glass-hero block w-full rounded-[22px] p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            >
              <div className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#F1E4C3] via-gold to-[#B8912B] text-[#0F172A] shadow-lg shadow-gold/25">
                  <Scale className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-tight text-foreground">
                    {t("lawyerCTA")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("lawyerCTASub")}</p>
                </div>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** One scroll-driven copy beat: fades in, holds, fades out with a slight rise. */
function Beat({
  p,
  beat,
}: {
  p: MotionValue<number>;
  beat: { title: StringKey; body: StringKey; range: [number, number, number, number] };
}) {
  const t = useT();
  const [a, b, c, d] = beat.range;
  const opacity = useTransform(p, [a, b, c, d], [0, 1, 1, 0]);
  /*
   * הטקסט זז רק בכניסה וביציאה — בין b ל-c הוא נעול על 0, כך שכל שלושת
   * הביטים עוצרים בדיוק באותה נקודה במסך ואין נדידה איטית בזמן ההחזקה.
   */
  const y = useTransform(p, [a, b, c, d], [30, 0, 0, -30]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-x-0 top-[30%] mx-auto flex max-w-xs flex-col items-center text-center will-change-transform"
    >
      <h1 className="text-2xl font-black leading-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
        {t(beat.title)}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-white/85 drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)]">
        {t(beat.body)}
      </p>
    </motion.div>
  );
}

/** The handshake clip, kept exactly where it was: after the choice, before auth. */
function SealMoment({ fadingOut, onDone }: { fadingOut: boolean; onDone: () => void }) {
  const t = useT();
  return (
    <AnimatePresence>
      <motion.div
        key="seal"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadingOut ? 0 : 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 grid place-items-center bg-[#04060b]"
      >
        <video
          src={handshake.url}
          autoPlay
          muted
          playsInline
          onEnded={onDone}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(212,175,55,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_55%,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 whitespace-nowrap text-sm font-bold uppercase tracking-[0.32em] text-gold drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]"
        >
          {t("handshakeWelcome")}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
