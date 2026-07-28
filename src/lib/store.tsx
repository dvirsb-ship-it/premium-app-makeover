import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import type { Case, FeedCase, Lawyer, Role } from "./types";
import { fbAuth, isBrowser } from "./firebase";
import {
  categoryMatchesSpecialties,
  chooseLawyerDb,
  ensureUserDoc,
  expressInterestDb,
  markNotificationRead,
  readLawyerProfile,
  readUserRole,
  watchLawyerFeed,
  watchMyCases,
  watchNotifications,
  writeUserRole,
  type AppNotification,
  type LawyerProfileDoc,
} from "./db";

/**
 * ה-store של JustAsk — אותו ממשק בדיוק כמו קודם, אבל מחובר ל-Firebase:
 * - session אמיתי (Firebase Auth) במקום טיימר
 * - תיקים ופיד ב-Firestore בזמן אמת במקום localStorage
 * - הבחירה בתפקיד נשמרת בשרת ושורדת החלפת מכשיר
 */

interface AppState {
  role: Role | null;
  setRole: (r: Role | null) => void;
  cases: Case[];
  addCase: (c: Case) => void;
  chooseLawyer: (caseId: string, lawyerId: string) => void;
  getCase: (id: string) => Case | undefined;
  feed: FeedCase[];
  expressInterest: (
    feedId: string,
    offer?: { fee: string; duration: string; note: string },
  ) => void;
  getFeedCase: (id: string) => FeedCase | undefined;
  /** משתמש Firebase מחובר (null = אורח). */
  user: User | null;
  /** false עד שסטטוס ההתחברות ידוע — מונע ניתוב שגוי בזמן רענון. */
  authReady: boolean;
  signOut: () => Promise<void>;
  /** התראות המשתמש — בזמן אמת, החדשות ראשונות. */
  notifications: AppNotification[];
  markRead: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const ROLE_CACHE_KEY = "justask-role-v2";

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRoleState] = useState<Role | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [feed, setFeed] = useState<FeedCase[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // מטמון תפקיד מקומי — טעינה מיידית לפני שהשרת עונה
  useEffect(() => {
    try {
      const cached = localStorage.getItem(ROLE_CACHE_KEY);
      if (cached === "client" || cached === "lawyer") setRoleState(cached);
    } catch {
      /* ignore */
    }
  }, []);

  // מעקב אחרי סטטוס ההתחברות
  useEffect(() => {
    if (!isBrowser) return;
    const unsub = onAuthStateChanged(fbAuth(), async (u) => {
      setUser(u);
      if (u) {
        // סנכרון פרופיל + תפקיד מהשרת
        void ensureUserDoc(u.uid, {
          email: u.email ?? undefined,
          phone: u.phoneNumber ?? undefined,
          name: u.displayName ?? undefined,
        });
        try {
          const serverRole = await readUserRole(u.uid);
          if (serverRole) {
            setRoleState(serverRole);
            try { localStorage.setItem(ROLE_CACHE_KEY, serverRole); } catch { /* ignore */ }
          }
        } catch {
          /* offline — נשארים עם המטמון */
        }
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // תיקי הלקוח — בזמן אמת
  useEffect(() => {
    if (!user || role !== "client") {
      setCases([]);
      return;
    }
    return watchMyCases(user.uid, setCases);
  }, [user, role]);

  // התראות — בזמן אמת, לכל תפקיד
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    return watchNotifications(user.uid, setNotifications);
  }, [user]);

  // הפרופיל המקצועי של עורך הדין (עיר + התמחויות) — לדירוג הפיד
  const [myLawyerProfile, setMyLawyerProfile] = useState<LawyerProfileDoc | null>(null);
  useEffect(() => {
    if (!user || role !== "lawyer") {
      setMyLawyerProfile(null);
      return;
    }
    void readLawyerProfile(user.uid).then(setMyLawyerProfile).catch(() => {});
  }, [user, role]);

  // פיד עורך הדין — בזמן אמת, מדורג: קרבה ← התמחות ← טריות
  useEffect(() => {
    if (!user || role !== "lawyer") {
      setFeed([]);
      return;
    }
    const myCity = (myLawyerProfile?.city ?? "").trim();
    const mySpecs = myLawyerProfile?.specialties ?? [];
    return watchLawyerFeed(user.uid, (items) => {
      const score = (f: FeedCase) => {
        const near = !!myCity && f.location.trim() === myCity;
        const fit = mySpecs.length > 0 && categoryMatchesSpecialties(f.category, mySpecs);
        return (near ? 2 : 0) + (fit ? 1 : 0);
      };
      const ranked = items
        .map((f) => {
          const s = score(f);
          return { ...f, match: s >= 3 ? ("high" as const) : s >= 1 ? ("medium" as const) : undefined };
        })
        .sort((a, b) => score(b) - score(a));
      setFeed(ranked);
    });
  }, [user, role, myLawyerProfile]);

  const setRole = useCallback(
    (r: Role | null) => {
      setRoleState(r);
      try {
        if (r) localStorage.setItem(ROLE_CACHE_KEY, r);
        else localStorage.removeItem(ROLE_CACHE_KEY);
      } catch {
        /* ignore */
      }
      const u = user ?? fbAuth().currentUser;
      if (u) void writeUserRole(u.uid, r).catch(() => {});
    },
    [user],
  );

  // התיק נכתב ל-Firestore ע"י זרימת הקליטה (intake); העדכון כאן אופטימי
  // כדי שמסך הוולידציה יראה אותו מיד — ה-onSnapshot יתיישר עם השרת.
  const addCase = useCallback((c: Case) => {
    setCases((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
  }, []);

  const chooseLawyer = useCallback(
    (caseId: string, lawyerId: string) => {
      setCases((prev) =>
        prev.map((c) =>
          c.id === caseId ? { ...c, chosenLawyerId: lawyerId, status: "connected" } : c,
        ),
      );
      // חילופי פרטים: פרטי הלקוח נכתבים לתיק וגלויים רק לעו"ד הנבחר
      const u = user ?? fbAuth().currentUser;
      const contact = u
        ? { name: u.displayName ?? "", phone: u.phoneNumber ?? "", email: u.email ?? "" }
        : undefined;
      void chooseLawyerDb(caseId, lawyerId, contact).catch(() => {});
    },
    [user],
  );

  const getCase = useCallback(
    (id: string) => cases.find((c) => c.id === id),
    [cases],
  );

  const expressInterest = useCallback(
    (feedId: string, offer?: { fee: string; duration: string; note: string }) => {
      setFeed((prev) =>
        prev.map((f) =>
          f.id === feedId
            ? { ...f, expressed: true, interestedCount: f.interestedCount + 1 }
            : f,
        ),
      );
      const u = user ?? fbAuth().currentUser;
      if (!u) return;
      const displayName = myLawyerProfile?.name || u.displayName || "עורך דין";
      const profile: Lawyer = {
        id: u.uid,
        name: displayName,
        firm: "",
        specialty: "",
        rating: 0,
        reviews: 0,
        years: myLawyerProfile?.barYear
          ? Math.max(0, new Date().getFullYear() - Number(myLawyerProfile.barYear))
          : 0,
        initials: displayName.slice(0, 2),
        blurb: "",
      };
      void expressInterestDb(feedId, { uid: u.uid, profile }, offer).catch(() => {});
    },
    [user, myLawyerProfile],
  );

  const getFeedCase = useCallback(
    (id: string) => feed.find((f) => f.id === id),
    [feed],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    void markNotificationRead(id).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fbSignOut(fbAuth());
    } finally {
      setRoleState(null);
      try { localStorage.removeItem(ROLE_CACHE_KEY); } catch { /* ignore */ }
    }
  }, []);

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
      user,
      authReady,
      signOut,
      notifications,
      markRead,
    }),
    [role, setRole, cases, addCase, chooseLawyer, getCase, feed, expressInterest, getFeedCase, user, authReady, signOut, notifications, markRead],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
