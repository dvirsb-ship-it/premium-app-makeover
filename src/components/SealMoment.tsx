import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import handshake from "../../public/videos/handshake.mp4.asset.json";
import { useT } from "../lib/i18n";

/**
 * לחיצת היד — רגע הסגירה של ההרשמה.
 *
 * גרה כאן ולא במסך הפתיחה, כי המיקום שלה זז: קודם היא ניגנה מיד אחרי
 * בחירת התפקיד — לפני שהמשתמש התחבר ולפני שאישר את התנאים — כלומר
 * חגגה הסכם שטרם נכרת. עכשיו היא מנגנת בסוף אישור התקנון, הרגע שבו
 * ההסכמה באמת קרתה. (הרגע השני שבו שני צדדים לוחצים יד — לקוח שבוחר
 * עורך דין — מסומן בקונפטי, לא בסרטון; ראו GoldBurst.)
 *
 * רשת ביטחון כפולה: גם אם הסרטון לעולם לא יורה ended — נתקע ברשת,
 * נחסם על ידי הדפדפן — המשתמש ממשיך אחרי 9 שניות. סרטון הוא קישוט,
 * לא שער.
 */
export function SealMoment({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [fadingOut, setFadingOut] = useState(false);

  function leave() {
    if (fadingOut) return;
    setFadingOut(true);
    window.setTimeout(onDone, 700);
  }

  useEffect(() => {
    const id = window.setTimeout(leave, 9000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          onEnded={leave}
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
