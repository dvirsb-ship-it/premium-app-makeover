import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AnimatePresence,
  cubicBezier,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Scale, UserRound } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import courtroom from "../assets/welcome/courtroom-deep.webp";
import doorRight from "../assets/welcome/door-modern.jpg";
import portalFrame from "../assets/welcome/portal-frame.webp";
import { useT } from "../lib/i18n";
import { LANGS, LANG_CODES, LANG_NAMES, useSettings } from "../lib/settings";
import { haptic } from "../lib/haptics";
import { useAppStore } from "../lib/store";
import type { Role } from "../lib/types";
import type { StringKey } from "../lib/i18n";

/**
 * רמז המחווה — אצבע שקופה שמחליקה למעלה.
 *
 * הטקסט "גללו להיכנס" והקו לבדם לא הספיקו: מבקר אמיתי, עורך דין, נתקע
 * במסך הפתיחה ולא הצליח להיכנס. במסך שכולו תמונה מלאה בלי ממשק מוכר,
 * "לגלול" אינו מובן מאליו — צריך להראות את התנועה, לא לתאר אותה.
 *
 * האצבע נעה למעלה, באותו כיוון שבו המשתמש צריך להחליק, ובאותו כיוון
 * שבו הקו נוסע. שלושת הרמזים מצביעים לאותו מקום.
 *
 * מכבדת prefers-reduced-motion: שם היא נשארת דוממת ורק החץ הקטן מסמן
 * את הכיוון — רמז ולא אנימציה.
 */
function ScrollGestureHint() {
  const still = useReducedMotion();
  /*
   * המרחק חשוב יותר מהגודל.
   *
   * בגרסה הראשונה האצבע נעה 20px, וזה נקרא כריחוף — לא כהחלקה. מה
   * שמלמד את התנועה הוא הנסיעה: 46px מלמטה למעלה, מהירה בעלייה
   * ואיטית בחזרה, כמו יד אמיתית שמחליקה ומתארגנת מחדש.
   *
   * השובל מתחת ליד מופיע רק בזמן העלייה ונמוג בחזרה, ולכן הוא קורא
   * ככיוון ולא כקישוט.
   */
  const rise = { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <div aria-hidden className="relative grid place-items-center">
      {/* שובל — הדרך שהיד עברה */}
      {!still && (
        <motion.span
          className="absolute bottom-0 h-14 w-px bg-gradient-to-t from-transparent via-white/45 to-transparent"
          animate={{ opacity: [0, 0.9, 0], scaleY: [0.3, 1, 0.3] }}
          style={{ originY: 1 }}
          transition={rise}
        />
      )}
      <motion.div
        animate={still ? undefined : { y: [16, -30, 16], opacity: [0.5, 1, 0.5] }}
        transition={rise}
        className="text-white [filter:drop-shadow(0_3px_12px_rgba(0,0,0,0.75))]"
      >
        <svg width="46" height="60" viewBox="0 0 30 40" fill="none">
          {/* חץ מעל האצבע — מוסר את הדו-משמעות של הכיוון */}
          <path
            d="M15 9V1M15 1L10.5 5.5M15 1l4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* כף יד עם אצבע מורה — צללית פשוטה שנקראת בכל גודל */}
          <path
            d="M12.5 24.5V15a2 2 0 1 1 4 0v6.5m0 0v-1.2a1.8 1.8 0 0 1 3.6 0v1.9m0-1a1.8 1.8 0 0 1 3.6 0v2.4m0-1.4a1.7 1.7 0 0 1 3.4 0v6.1c0 4.6-3.2 7.7-7.6 7.7h-2.1c-3 0-4.7-1.3-6.2-3.6l-3.2-5a1.9 1.9 0 0 1 3-2.3l1.5 1.7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(255,255,255,0.14)"
          />
        </svg>
      </motion.div>
    </div>
  );
}

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


/**
 * שלושת הטקסטים של ה-welcome הישן נשמרו במלואם — מה שהתחלף הוא רק
 * המנגנון: במקום שלוש שקופיות עם כפתור "הבא", המשתמש גולל, ובאותה
 * גלילה נפתחות דלתות בית המשפט אל האולם שבפנים. זה אותו תהליך שהלקוח
 * עובר בפועל, ולכן הגלילה היא הסיפור ולא קישוט מעליו.
 */
/*
 * הטווחים מכוונים לתחנות ה-snap: הגלילה עוצרת ב-p = 0.25 / 0.5 / 0.75 / 1,
 * וכל ביט מגיע לשיא בדיוק בתחנה שלו. הכניסה של הבא חופפת ליציאה של
 * הקודם (0.35–0.40 וכו') — אחד יורד בזמן שהשני עולה, בתוך אותה תנועה.
 */
const beats: { title: StringKey; body: StringKey; range: [number, number, number, number] }[] = [
  { title: "welcomeSlide1Title", body: "welcomeSlide1Body", range: [0.1, 0.21, 0.29, 0.4] },
  { title: "welcomeSlide2Title", body: "welcomeSlide2Body", range: [0.35, 0.46, 0.54, 0.65] },
  { title: "welcomeSlide3Title", body: "welcomeSlide3Body", range: [0.6, 0.71, 0.79, 0.87] },
];

/* תחנות העצירה — כפולות של 75vh על מסלול גלילה של 300vh */
/*
 * תחנה כל 100vh — הוארך מ-75vh אחרי שהמסלול הרגיש קצר מדי בטלפון:
 * מרחק גדול יותר לכל תנועה = מעבר איטי ונינוח יותר בין משפטים,
 * בלי לגעת בשום טווח (התחנות נשארות ברבעים של ה-progress).
 */
const SNAP_STOPS = [0, 100, 200, 300, 400];

function Welcome() {
  const navigate = useNavigate();
  const t = useT();
  const { lang, setLang } = useSettings();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  /*
   * תפריט שנפתח חייב להיסגר גם בלי לבחור: לחיצה בחוץ ו-Escape. בלי זה
   * הוא נשאר פתוח מעל הדלתות והגלילה ממשיכה מתחתיו.
   */
  useEffect(() => {
    if (!langOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [langOpen]);
  const { setRole } = useAppStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [ctaLive, setCtaLive] = useState(false);

  /*
   * snap חי רק כשהמסך הזה על המסך — הוא יושב על <html> כי זה הגולל
   * האמיתי, וחייב לרדת ביציאה כדי לא להדביק את שאר האפליקציה לתחנות.
   */
  useEffect(() => {
    document.documentElement.classList.add("welcome-snap");
    return () => document.documentElement.classList.remove("welcome-snap");
  }, []);

  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end end"] });
  /*
   * ההחלקה היא מה שהופך גלילה במובייל מ"קפיצות" לתנועת מצלמה. spring על
   * ה-progress ולא על כל שכבה בנפרד — כך כל השכבות נשארות מסונכרנות.
   */
  /*
   * רך יותר משהיה (90/22): עם עצירות ה-snap, הקשיחות הישנה סיימה את
   * המעבר מהר מדי והשאירה תחושת קפיצה. 58/21 מותח כל מעבר-תחנה לנשימה
   * אחת מלאה.
   */
  const p = useSpring(scrollYProgress, { stiffness: 58, damping: 21, mass: 0.4 });

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

  /*
   * ease-out על כל תנועות הכניסה: המיפוי הליניארי נחתך בחדות כשהגלילה
   * נעצרת בתחנה האחרונה — זו הייתה ה"תקיעה". עם ההאטה פנימה, הכרטיסים
   * מגיעים למנוחה לפני שהגלילה נגמרת.
   */
  const settle = cubicBezier(0.22, 1, 0.36, 1);
  const ctaOpacity = useTransform(p, [0.84, 0.97], [0, 1], { ease: settle });
  // שניהם יוצאים מקו האמצע ונפרדים אליו כלפי מעלה ומטה.
  const ctaUp = useTransform(p, [0.84, 1], [0, -168], { ease: settle });
  const ctaDown = useTransform(p, [0.84, 1], [0, 58], { ease: settle });
  const ctaLine = useTransform(p, [0.87, 1], [0, 1], { ease: settle });
  useMotionValueEvent(p, "change", (v) => setCtaLive(v > 0.9));

  /*
   * הבחירה לא חותמת "סיימתי" — רק מנווטת. הדגל נכתב כשההתחברות באמת
   * מצליחה (store), כי מי שבחר תפקיד ונטש במסך של גוגל לא באמת עבר
   * את הפתיחה: בביקור הבא מגיע לו לראות את הדלתות שוב, לא להישלח
   * ישר לגוגל בלי הקשר. זה בדיוק מה שקרה לדביר בבדיקה.
   */
  function finish() {
    /*
     * סימון session (לא localStorage): "עברתי את הפתיחה הרגע, בטאב הזה".
     * שער ה-/auth בודק אותו — בלעדיו נוצרה לולאה: הדגל הקבוע נחתם רק
     * בהתחברות מוצלחת, אז משתמש טרי שבחר תפקיד הגיע ל-auth בלי דגל
     * והוחזר לדלתות. session נעלם בסגירת הדפדפן, ולכן מבקר ישיר טרי
     * ב-/auth עדיין מקבל את הפתיחה.
     */
    try {
      sessionStorage.setItem("justask-welcome-passed", "1");
    } catch {
      /* ignore */
    }
    navigate({ to: "/auth" });
  }

  /*
   * הבחירה ממשיכה ישר להתחברות — בלי סרטון באמצע. לחיצת היד זזה לסוף
   * אישור התקנון (onboarding), הרגע שבו ההסכמה באמת נכרתה; כאן היא
   * חגגה הסכם שעוד לא קרה. נשארת רק דהיית מעבר קצרה — נימוס, לא טקס.
   */
  function choose(role: Role) {
    haptic("success");
    setRole(role);
    setLeaving(true);
    window.setTimeout(finish, 450);
  }

  /*
   * "דלג" מדלג אל הבחירה — לא מעבר לה.
   *
   * קודם הוא ניווט ישר ל-/auth, ומי שהתחבר בלי לבחור תפקיד קיבל
   * "לקוח" בשקט (role ?? "client" במסך ההתחברות). עורך דין שדילג היה
   * מוצא את עצמו בצ׳אט תיאור מקרה. אי אפשר לדלג על השאלה "מי אתם" —
   * אפשר רק לדלג על הדרך אליה: קפיצת גלילה לסוף, וה-spring שכבר מחליק
   * את ה-progress הופך אותה לפתיחת דלתות מהירה במקום חיתוך.
   */
  function skipToChoice() {
    const el = scrollRef.current;
    if (!el) return;
    /*
     * ה-snap חייב לרדת לרגע הקפיצה: mandatory תופס גלילה תוכניתית
     * ומחזיר אותה לתחנה הקרובה — כלומר חזרה ל-0, והכפתור נראה מת.
     * זה בדיוק מה שקרה בטלפון. היעד הוא תחנה בעצמו, אז כשהמחלקה
     * חוזרת אין תיקון-מיקום.
     */
    const html = document.documentElement;
    html.classList.remove("welcome-snap");
    window.scrollTo({ top: el.offsetTop + el.scrollHeight - window.innerHeight, behavior: "smooth" });
    window.setTimeout(() => html.classList.add("welcome-snap"), 1100);
  }

  return (
    <div
      ref={scrollRef}
      className="welcome-scroller relative w-full bg-[#04060b] transition-opacity duration-500"
      style={{ height: "500vh", opacity: leaving ? 0 : 1 }}
    >
      {/*
       * עוגני העצירה. scroll-snap-stop: always הוא הלב: גם הטלה חזקה
       * נעצרת בתחנה הבאה — משפט אחד לכל תנועת גלילה, והמשתמש קורא
       * במקום לכוון. ה-spring שכבר מחליק את ה-progress הופך כל עצירה
       * לאנימציה באורך קבוע.
       */}
      {SNAP_STOPS.map((vh) => (
        <div
          key={vh}
          aria-hidden
          className="welcome-anchor pointer-events-none absolute inset-x-0 [scroll-snap-align:start] [scroll-snap-stop:always]"
          style={{ top: `${vh}vh` }}
        />
      ))}
      <div className="welcome-stage sticky top-0 w-full overflow-hidden" style={{ perspective: "1100px" }}>
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

        {/*
         * שתי הכנפיים הן אותה כנף בדיוק, אחת מהן משוקפת — כך הידיות נפגשות
         * בקו האמצע והדלת נראית סימטרית. התמונה נמתחת למחצית המלאה
         * (object-fill) ולא נחתכת, כדי שלא יופיעו חצאי ידיות וכיתוב קטוע.
         */}
        <motion.div
          aria-hidden
          style={{ opacity: doorFade }}
          className="absolute inset-0 z-[4] will-change-[opacity]"
        >
          <motion.div
            style={{ rotateY: leftRotate, x: doorShift, transformOrigin: "left center" }}
            className="absolute bottom-0 left-0 top-0 w-1/2 overflow-hidden will-change-transform [backface-visibility:hidden]"
          >
            <img
              src={doorRight}
              alt=""
              className="h-full w-full scale-x-[-1] object-fill"
            />
            {/* צל אצל הציר ואור עדין בקצה הפנימי — נותן לכנף עובי */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55),transparent_45%,rgba(240,214,146,0.10))]" />
          </motion.div>

          <motion.div
            style={{ rotateY: rightRotate, x: doorShiftR, transformOrigin: "right center" }}
            className="absolute bottom-0 right-0 top-0 w-1/2 overflow-hidden will-change-transform [backface-visibility:hidden]"
          >
            <img src={doorRight} alt="" className="h-full w-full object-fill" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(270deg,rgba(0,0,0,0.55),transparent_45%,rgba(240,214,146,0.10))]" />
          </motion.div>


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
          className="pointer-events-none absolute inset-0 z-[9] bg-[radial-gradient(95%_60%_at_50%_50%,rgba(2,4,8,0.72),rgba(2,4,8,0.35))]"
        />

        {/* Chrome + copy */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col px-6 pb-10 pt-10">

          {/*
           * שתי הקוביות ממוקמות פיזית — לוגו מימין, שפה משמאל — ולא לפי
           * כיוון הכתיבה. עם justify-between הן היו מתחלפות בצדדים ברגע
           * שבוחרים אנגלית או רוסית, כלומר הקובייה "קופצת" בדיוק בלחיצה
           * שאמורה רק להחליף שפה. כאן היא לא זזה באף שפה.
           */}
          <div className="pointer-events-auto relative h-11">
            {/* זכוכית ולא זהב — על דלתות העץ הזהב המלא נקרא כמדבקה */}
            <div className="absolute right-0 top-0">
              <BrandMark size={44} variant="glass" />
            </div>

            {/*
             * בורר השפה — קובייה תאומה ללוגו, בקצה הנגדי.
             *
             * רוחב קבוע (44) ו"דלג" שמרחף מתחתיה ב-absolute, כך שהיעלמות
             * "דלג" בשלב בחירת התפקיד לא מזיזה את הקובייה במילימטר. הוא
             * חי כאן, במסך הראשון, כי מי שאינו קורא עברית לא ימצא את
             * הבורר בפרופיל שמאחורי ההתחברות.
             */}
            <div ref={langRef} className="absolute left-0 top-0" style={{ width: 44 }}>
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={t("language")}
                className="relative grid size-11 place-items-center overflow-hidden rounded-[28%] border border-white/25 bg-white/10 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)] backdrop-blur-md transition active:scale-95"
              >
                {/* ברק עליון — אותו פרט שנותן ללוגו את תחושת הזכוכית */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent)]"
                />
                <span className="relative text-[11px] font-black uppercase tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
                  {LANG_CODES[lang]}
                </span>
              </button>

              {/* "דלג" מרחף מתחת לקובייה — לא משתתף בפריסה, ולכן לא מזיז אותה */}
              {!ctaLive && (
                <button
                  type="button"
                  onClick={skipToChoice}
                  className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-white/70 transition hover:text-white"
                >
                  {t("welcomeSkip")}
                </button>
              )}

              <AnimatePresence>
                {langOpen && (
                  <motion.ul
                    role="listbox"
                    aria-label={t("language")}
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-2xl border border-white/20 bg-black/70 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                  >
                    {LANGS.map((l) => (
                      <li key={l}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={l === lang}
                          onClick={() => {
                            setLang(l);
                            setLangOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-start transition ${
                            l === lang ? "bg-white/15" : "hover:bg-white/10"
                          }`}
                        >
                          <span className="text-[13px] font-semibold text-white">
                            {LANG_NAMES[l]}
                          </span>
                          <span className="text-[10.5px] font-black uppercase tracking-wide text-white/55">
                            {LANG_CODES[l]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            {beats.map((b) => (
              <Beat key={b.title} p={p} beat={b} />
            ))}
          </div>

          {/*
           * הטקסט לבדו במרכז — האצבע עברה הצידה (7/8/2026).
           *
           * פס הזהב שבין הדלתות עובר בדיוק במרכז המסך, והיד ישבה עליו
           * וקטעה אותו. הרמז זז לצד ימין ולמטה: שם האגודל באמת נמצא,
           * והתנועה מתחילה מתחתית המסך — בדיוק המחווה שמבקשים מהמשתמש.
           */}
          <motion.div
            style={{ opacity: hintFade }}
            className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex justify-center"
          >
            <span className="text-[13px] font-bold uppercase tracking-[0.4em] text-white/90 [text-shadow:0_2px_14px_rgba(0,0,0,0.8)]">
              {t("welcomeScrollHint")}
            </span>
          </motion.div>

          <motion.div
            style={{ opacity: hintFade }}
            className="pointer-events-none absolute bottom-24 right-6 z-10 flex flex-col items-center gap-3"
          >
            <ScrollGestureHint />
            {/*
             * הקו נוסע למעלה — אותו כיוון כמו היד וכמו ההחלקה עצמה.
             * עורך דין נתקע כאן ב-6/8/2026 כשהרמז הצביע למטה.
             */}
            <div className="relative h-20 w-px overflow-hidden bg-white/15">
              <motion.div
                animate={{ y: ["260%", "-100%"] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-gold to-transparent"
              />
            </div>
          </motion.div>


        </div>

        {/*
         * שני הכפתורים מדברים באותה שפה של הכיתובים לפניהם — טקסט לבן ממורכז
         * בלי כרטיס זכוכית. הם נולדים בדיוק על קו האמצע ונפרדים ממנו: אחד
         * עולה למחצית העליונה, השני יורד לתחתונה, וקו הזהב באמצע הוא הגבול
         * היחיד שמבדיל ביניהם.
         */}
        <motion.div
          style={{ opacity: ctaOpacity }}
          className={`absolute inset-0 z-20 ${ctaLive ? "" : "pointer-events-none"}`}
        >
          <motion.div
            aria-hidden
            style={{ scaleX: ctaLine }}
            className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/70 to-transparent"
          />
          {/*
           * הכותרת "מי אתם?" הוסרה: היא ישבה בדיוק על top-1/2, באותו מקום
           * שבו נפגשים שני כרטיסי הבחירה, והתנגשה בהם. קו הזהב נשאר —
           * בלי הטקסט הוא מפריד נקי בין שתי האפשרויות, והן ממילא אומרות
           * בעצמן מי הן.
           */}

          <motion.div
            style={{ y: ctaUp }}
            className="absolute inset-x-0 top-1/2 flex flex-col items-center"
          >
            <RoleChoice
              icon={UserRound}
              title={t("clientCTA")}
              sub={t("clientCTASub")}
              onClick={() => choose("client")}
            />
          </motion.div>

          <motion.div
            style={{ y: ctaDown }}
            className="absolute inset-x-0 top-1/2 flex flex-col items-center"
          >
            <RoleChoice
              icon={Scale}
              title={t("lawyerCTA")}
              sub={t("lawyerCTASub")}
              onClick={() => choose("lawyer")}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * הבחירה מנוסחת כמו כיתוב ולא כמו כרטיס: אותה טיפוגרפיה של הביטים, עם
 * אייקון עדין בזהב שמסמן שזו נקודת לחיצה.
 */
function RoleChoice({
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  icon: typeof UserRound;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="flex flex-col items-center px-6 py-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
    >
      <Icon className="mb-2 size-6 text-gold" strokeWidth={1.6} />
      <span className="text-2xl font-black leading-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
        {title}
      </span>
      <span className="mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-white/70 drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)]">
        {sub}
      </span>
    </motion.button>
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
