import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  cubicBezier,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Globe, Scale, UserRound } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import courtroom from "../assets/welcome/courtroom-deep.webp";
import doorRight from "../assets/welcome/door-modern.jpg";
import portalFrame from "../assets/welcome/portal-frame.webp";
import { useT } from "../lib/i18n";
import { LANGS, LANG_NAMES, useSettings, type Lang } from "../lib/settings";
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

          <div className="pointer-events-auto relative flex items-center justify-between">
            {/* זכוכית ולא זהב — על דלתות העץ הזהב המלא נקרא כמדבקה */}
            <BrandMark size={44} variant="glass" />
            {/*
             * בורר השפה — במרכז, בין הלוגו ל"דלג", וקבוע: absolute עם
             * מרכוז, כדי שהיעלמות "דלג" (כשמגיעים לבחירה) לא תזיז אותו,
             * ורוחב נעול כדי שגם החלפת שפה לא תזיז את הקצוות. הוא חי
             * במסך הראשון כי מי שאינו קורא עברית לא ימצא אותו בפרופיל
             * שמאחורי ההתחברות. select נטיבי: גלגלת מערכת בנייד, בלי
             * לגעת ב-scroll-snap.
             */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Globe
                className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-white/70"
                strokeWidth={2}
                aria-hidden
              />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                aria-label={t("language")}
                className="w-32 appearance-none rounded-full border border-white/25 bg-white/10 py-1.5 pe-3 ps-9 text-center text-xs font-semibold text-white/90 backdrop-blur-md outline-none transition hover:bg-white/15"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l} className="text-neutral-900">
                    {LANG_NAMES[l]}
                  </option>
                ))}
              </select>
            </div>
            {/* שומר מקום קבוע ל"דלג" — כשהוא נעלם, הלוגו לא זז */}
            <div className="min-w-[52px] text-end">
              {!ctaLive && (
                <button
                  type="button"
                  onClick={skipToChoice}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
                >
                  {t("welcomeSkip")}
                </button>
              )}
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            {beats.map((b) => (
              <Beat key={b.title} p={p} beat={b} />
            ))}
          </div>

          <motion.div
            style={{ opacity: hintFade }}
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-4"
          >
            <span className="text-[13px] font-bold uppercase tracking-[0.4em] text-white/90 [text-shadow:0_2px_14px_rgba(0,0,0,0.8)]">
              {t("welcomeScrollHint")}
            </span>
            {/* קו זהב דק שנוסע למטה — מסביר את כיוון הגלילה בלי חצים */}
            <div className="relative h-24 w-px overflow-hidden bg-white/15">
              <motion.div
                animate={{ y: ["-100%", "260%"] }}
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
