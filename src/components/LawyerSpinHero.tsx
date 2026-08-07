import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ChevronUp } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useT } from "../lib/i18n";
import type { StringKey } from "../lib/i18n";
import screenFeed from "../assets/lawyers/screen-feed.png";
import screenMemo from "../assets/lawyers/screen-memo.png";
import screenOffer from "../assets/lawyers/screen-offer.png";
import screenVerify from "../assets/lawyers/screen-verify.png";

/**
 * ה-hero הקולנועי של דף הנחיתה לעורכי דין.
 *
 * ההחלטה: הגלילה היא המצלמה. הטלפון מסתובב 720° סביב ציר Y — הסבב הראשון
 * ב-40% הראשונים של הגלילה, השני נמתח על 60% הנותרים. אותו מספר מעלות
 * על מרחק גלילה גדול יותר הוא בדיוק מה שהעין קוראת כ"סלואו מושן",
 * בלי להאט את הגלילה עצמה ובלי להילחם במכשיר.
 *
 * המסך מתחלף כשהפנים כמעט מקבילות לצופה (0°/360°/720° וסביבתן), כדי
 * שהחלפת התמונה תיפול מתחת לרדאר ולא תיראה כמו קפיצה.
 */

const SHOTS = [screenFeed, screenMemo, screenOffer, screenVerify];

const BLOCKS: { title: StringKey; body: StringKey }[] = [
  { title: "lpSpin1Title", body: "lpSpin1Body" },
  { title: "lpSpin2Title", body: "lpSpin2Body" },
  { title: "lpSpin3Title", body: "lpSpin3Body" },
  { title: "lpSpin4Title", body: "lpSpin4Body" },
];

export function LawyerSpinHero({ onCta }: { onCta: () => void }) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const [shot, setShot] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* ריכוך קטן — מונע קיטוע במסכי טראקפד/מובייל בלי להוסיף השתהות מורגשת */
  const p = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.35,
  });

  const rotateY = useTransform(p, [0, 0.4, 1], [0, 360, 720]);
  const scale = useTransform(p, [0, 0.5, 1], [0.88, 1, 1.04]);
  const glow = useTransform(p, [0, 0.4, 1], [0.35, 0.7, 1]);
  const hintOpacity = useTransform(p, [0, 0.06], [1, 0]);

  useMotionValueEvent(rotateY, "change", (deg) => {
    const next = deg >= 540 ? 3 : deg >= 360 ? 2 : deg >= 180 ? 1 : 0;
    setShot((prev) => (prev === next ? prev : next));
  });

  return (
    <section
      ref={ref}
      aria-label={t("lpSpinAria")}
      className="relative h-[500vh]"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* תאורת סטודיו */}
        <motion.div
          aria-hidden
          style={{ opacity: glow }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_45%,rgba(212,175,55,0.22),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_60%_at_50%_115%,rgba(56,89,168,0.16),transparent_60%)]"
        />

        {/* הטלפון */}
        <div
          className="relative z-0"
          style={{ perspective: "2000px" }}
          aria-hidden
        >
          <motion.div
            style={{ rotateY, scale, transformStyle: "preserve-3d" }}
            className="relative h-[560px] w-[268px] will-change-transform sm:h-[620px] sm:w-[296px]"
          >
            {/* צד הפנים — המסך */}
            <div
              className="absolute inset-0 rounded-[3.2rem] bg-gradient-to-br from-[#3a3d44] via-[#15171b] to-[#2b2e34] p-[3px] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9)]"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="pointer-events-none absolute inset-0 rounded-[3.2rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.6)_0%,transparent_16%,transparent_84%,rgba(255,255,255,0.4)_100%)]" />
              <div className="relative h-full w-full overflow-hidden rounded-[3rem] bg-black p-[3px]">
                <div className="relative h-full w-full overflow-hidden rounded-[2.85rem] bg-[#05070d]">
                  <div className="absolute left-1/2 top-2.5 z-20 h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-black" />
                  <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,transparent_30%,transparent_100%)]" />
                  {SHOTS.map((src, i) => (
                    <motion.img
                      key={src}
                      src={src}
                      alt=""
                      width={560}
                      height={1200}
                      loading={i === 0 ? "eager" : "lazy"}
                      animate={{ opacity: shot === i ? 1 : 0 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* הגב — טיטניום, כי סיבוב מלא חושף אותו */}
            <div
              className="absolute inset-0 rounded-[3.2rem] bg-gradient-to-br from-[#2a2d33] via-[#0d0f13] to-[#22252b] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9)]"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="pointer-events-none absolute inset-0 rounded-[3.2rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.45)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.28)_100%)]" />
              {/* מודול מצלמות */}
              <div className="absolute start-5 top-5 grid size-[86px] grid-cols-2 gap-1.5 rounded-3xl bg-white/[0.06] p-2 ring-1 ring-white/10">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[radial-gradient(circle_at_35%_30%,#4b5057,#0a0b0e_70%)] ring-1 ring-white/15"
                  />
                ))}
              </div>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                <BrandMark size={54} glow={false} className="mx-auto opacity-70" />
              </div>
            </div>
          </motion.div>

          {/* צל מגע ברצפה */}
          <div
            aria-hidden
            className="absolute -bottom-10 left-1/2 h-12 w-[78%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-3xl"
          />
        </div>

        {/* בלוקי התוכן — נחים על צד ההתחלה, מתחת לטלפון במובייל */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center px-6 pb-16 md:items-center md:justify-start md:px-[8%] md:pb-0">
          <div className="relative w-full max-w-md text-center md:text-start">
            {BLOCKS.map((b, i) => {
              const zs = i * 0.25;
              const ze = zs + 0.25;
              const opacity = useTransform(
                p,
                [zs, zs + 0.05, ze - 0.06, ze],
                [0, 1, 1, 0],
              );
              const y = useTransform(
                p,
                [zs, zs + 0.05, ze - 0.06, ze],
                [44, 0, 0, -44],
              );
              return (
                <motion.article
                  key={b.title}
                  style={{ opacity, y }}
                  className={i === 0 ? "relative" : "absolute inset-x-0 top-0"}
                >
                  <h2 className="text-[2rem] font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)] md:text-[3.2rem]">
                    {t(b.title)}
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-white/70 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] md:mx-0 md:text-[17px]">
                    {t(b.body)}
                  </p>
                  {i === BLOCKS.length - 1 && (
                    <motion.button
                      type="button"
                      onClick={onCta}
                      whileTap={{ scale: 0.97 }}
                      className="btn-gold pointer-events-auto mt-7 min-h-12 rounded-2xl px-8 py-3.5 text-[15px] font-bold"
                    >
                      {t("lpHeroCta")}
                    </motion.button>
                  )}
                </motion.article>
              );
            })}
          </div>
        </div>

        {/* חיווי גלילה */}
        <motion.div
          aria-hidden
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute bottom-7 left-1/2 z-20 -translate-x-1/2 text-center"
        >
          <p className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-gold/80">
            {t("lpSpinHint")}
          </p>
          <div className="mt-1.5 flex flex-col items-center">
            {[1, 0.5, 0.33].map((o, i) => (
              <motion.span
                key={i}
                animate={{ opacity: [o, o * 0.25, o] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
                className="-mt-3 first:mt-0"
              >
                <ChevronUp className="size-7 text-gold" strokeWidth={2.4} />
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
