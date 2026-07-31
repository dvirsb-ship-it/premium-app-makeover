import type { SVGProps } from "react";

/**
 * סמלים מותאמים — למקומות שבהם ספריית האייקונים נותנת את הצורה הנכונה
 * בטון שגוי.
 */

/**
 * עצם שבורה — נזיקין ונזקי גוף.
 *
 * lucide מציעה Bone, אבל זו עצם של כלב: היא נותנת לאפליקציה לנפגעי גוף
 * ויב של חנות חיות. כאן: עצם ארוכה באלכסון עם שבר והיסט בין שני החלקים.
 * גיאומטריה מפורשת (עיגולים + קווים) ולא קשתות, כדי שהצורה תישמר גם
 * ב-14px — הגודל שבו הסמל מופיע על שבבי התחומים בפרופיל.
 *
 * מצויר לפי מוסכמות lucide: viewBox 24, stroke, קצוות מעוגלים — כך הוא
 * יושב לצד שאר הסמלים בלי להיראות זר.
 */
export function BrokenBone(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="8.4" cy="5.6" r="2.3" />
      <circle cx="5.6" cy="8.4" r="2.3" />
      <path d="M8.5 9.7 11.6 12.8" />
      <path d="M12.4 11.2 15.5 14.3" />
      <circle cx="18.4" cy="15.6" r="2.3" />
      <circle cx="15.6" cy="18.4" r="2.3" />
    </svg>
  );
}
