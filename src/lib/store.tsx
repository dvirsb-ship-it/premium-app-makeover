import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Case, FeedCase, Lawyer, Role } from "./types";

export const LAWYERS: Lawyer[] = [
  {
    id: "l1",
    name: "עו״ד מיכל אברהמי",
    firm: "אברהמי ושות׳",
    specialty: "נזיקין ותאונות דרכים",
    rating: 4.9,
    reviews: 132,
    years: 14,
    initials: "מא",
    blurb: "מתמחה בתביעות נזקי גוף מול חברות הביטוח. ליווי אישי מתחילת הדרך.",
  },
  {
    id: "l2",
    name: "עו״ד דניאל כהן",
    firm: "כהן־לוי משרד עורכי דין",
    specialty: "נזיקין וביטוח",
    rating: 4.8,
    reviews: 98,
    years: 11,
    initials: "דכ",
    blurb: "ניסיון רב בתיקי תאונות עבודה ותאונות דרכים. אחוזי הצלחה גבוהים.",
  },
  {
    id: "l3",
    name: "עו״ד שירה בן־דוד",
    firm: "בן־דוד ושותפים",
    specialty: "דיני נזיקין",
    rating: 5.0,
    reviews: 76,
    years: 9,
    initials: "שב",
    blurb: "גישה אנושית ומקצועית. זמינה מסביב לשעון עבור לקוחות.",
  },
  {
    id: "l4",
    name: "עו״ד יוסי מזרחי",
    firm: "מזרחי משפט",
    specialty: "נזקי גוף",
    rating: 4.7,
    reviews: 210,
    years: 18,
    initials: "ימ",
    blurb: "בכיר בתחום הנזיקין עם עשרות פסקי דין תקדימיים לזכותו.",
  },
];

const seededCase: Case = {
  id: "c-demo",
  title: "תאונת דרכים בדרך לעבודה",
  category: "נזיקין ותאונות דרכים",
  summary:
    "נפגעתי בתאונת דרכים בנסיעה לעבודה, והביטוח מסרב לכסות את ההוצאות הרפואיות.",
  createdAt: Date.now() - 1000 * 60 * 60 * 26,
  status: "has_interest",
  interested: [LAWYERS[0], LAWYERS[2]],
};

const FEED: FeedCase[] = [
  {
    id: "f1",
    title: "פיטורים ללא הודעה מוקדמת",
    category: "דיני עבודה",
    summary:
      "פוטרתי לאחר 5 שנות עבודה ללא הודעה מוקדמת וללא שימוע. מחפש/ת ייצוג להשבת זכויות.",
    location: "תל אביב",
    postedAgo: "לפני שעה",
    urgency: "דחוף",
    interestedCount: 3,
  },
  {
    id: "f2",
    title: "נזק לרכב עקב עבודות תשתית",
    category: "נזיקין",
    summary:
      "הרכב שלי ניזוק בעקבות בור בכביש שלא סומן. העירייה דוחה את הטיפול בפנייה.",
    location: "חיפה",
    postedAgo: "לפני 3 שעות",
    urgency: "רגיל",
    interestedCount: 1,
  },
  {
    id: "f3",
    title: "סכסוך שכנים בבית משותף",
    category: "מקרקעין",
    summary:
      "שכן ביצע שיפוץ שפוגע ברכוש המשותף ובקיר המשותף בדירתי. נדרש ייעוץ משפטי.",
    location: "ירושלים",
    postedAgo: "אתמול",
    urgency: "רגיל",
    interestedCount: 5,
  },
];

interface AppState {
  role: Role | null;
  setRole: (r: Role | null) => void;
  cases: Case[];
  addCase: (c: Case) => void;
  chooseLawyer: (caseId: string, lawyerId: string) => void;
  getCase: (id: string) => Case | undefined;
  feed: FeedCase[];
  expressInterest: (feedId: string) => void;
  getFeedCase: (id: string) => FeedCase | undefined;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = "justask-state-v1";

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [cases, setCases] = useState<Case[]>([seededCase]);
  const [feed, setFeed] = useState<FeedCase[]>(FEED);

  // Hydrate from localStorage (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.role) setRole(parsed.role);
        if (Array.isArray(parsed.cases) && parsed.cases.length)
          setCases(parsed.cases);
        if (Array.isArray(parsed.feed) && parsed.feed.length)
          setFeed(parsed.feed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, cases, feed }));
    } catch {
      /* ignore */
    }
  }, [role, cases, feed]);

  const addCase = useCallback((c: Case) => {
    setCases((prev) => [c, ...prev]);
  }, []);

  const chooseLawyer = useCallback((caseId: string, lawyerId: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? { ...c, chosenLawyerId: lawyerId, status: "connected" }
          : c,
      ),
    );
  }, []);

  const getCase = useCallback(
    (id: string) => cases.find((c) => c.id === id),
    [cases],
  );

  const expressInterest = useCallback((feedId: string) => {
    setFeed((prev) =>
      prev.map((f) =>
        f.id === feedId
          ? { ...f, expressed: true, interestedCount: f.interestedCount + 1 }
          : f,
      ),
    );
  }, []);

  const getFeedCase = useCallback(
    (id: string) => feed.find((f) => f.id === id),
    [feed],
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      cases,
      addCase,
      chooseLawyer,
      getCase,
      feed,
      expressInterest,
      getFeedCase,
    }),
    [role, cases, addCase, chooseLawyer, getCase, feed, expressInterest, getFeedCase],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
