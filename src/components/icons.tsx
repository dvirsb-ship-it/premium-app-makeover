import type { SVGProps } from "react";

/**
 * סמלים מותאמים — למקומות שבהם ספריית האייקונים נותנת את הרעיון הנכון
 * בצורה שאינה עובדת.
 */

/**
 * פלסטר — נזיקין ונזקי גוף.
 *
 * הדרך הארוכה עד לכאן: lucide מציעה Bone, אבל זו עצם של כלב — ויב של
 * חנות חיות באפליקציה לנפגעי גוף. עצם שבורה מותאמת נמרחה בגדלים קטנים
 * ונקראה כשרשרת. ו-Bandage של lucide מצוירת כמלבן ישר ונראית כקופסה.
 *
 * הפלסטר המוכר הוא **אלכסוני עם כרית באמצע** — וברגע שמסובבים אותו
 * ב-45° הוא נקרא מיד. הנקודות נעלמות ב-13px והצורה נשארת קריאה בלעדיהן,
 * ולכן הן רווח נטו: פירוט בגודל מלא, אפס עלות בקטן.
 *
 * גם מדויק יותר מעצם: נזיקין אינו רק שברים — גם כוויה, נכות ונזק נפשי.
 */
export function Bandage(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <g transform="rotate(-45 12 12)">
        <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" />
        <rect x="8.5" y="8.5" width="7" height="7" />
        <circle cx="10.6" cy="10.6" r=".45" fill="currentColor" stroke="none" />
        <circle cx="13.4" cy="10.6" r=".45" fill="currentColor" stroke="none" />
        <circle cx="10.6" cy="13.4" r=".45" fill="currentColor" stroke="none" />
        <circle cx="13.4" cy="13.4" r=".45" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
