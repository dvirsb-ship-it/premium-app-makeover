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
  chooseLawyerDb,
  ensureUserDoc,
  expressInterestDb,
  markNotificationRead,
  readUserRole,
  watchLawyerFeed,
  watchMyCases,
  watchNotifications,
  writeUserRole,
  type AppNotification,
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
  expressInterest: (feedId: string) => void;
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

  // פיד עורך הדין — בזמן אמת
  useEffect(() => {
    if (!user || role !== "lawyer") {
      setFeed([]);
      return;
    }
    return watchLawyerFeed(user.uid, setFeed);
  }, [user, role]);

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
    (feedId: string) => {
      setFeed((prev) =>
        prev.map((f) =>
          f.id === feedId
            ? { ...f, expressed: true, interestedCount: f.interestedCount + 1 }
            : f,
        ),
      );
      const u = user ?? fbAuth().currentUser;
      if (!u) return;
      const profile: Lawyer = {
        id: u.uid,
        name: u.displayName || "עורך דין",
        firm: "",
        specialty: "",
        rating: 0,
        reviews: 0,
        years: 0,
        initials: (u.displayName || "עו").slice(0, 2),
        blurb: "",
      };
      void expressInterestDb(feedId, { uid: u.uid, profile }).catch(() => {});
    },
    [user],
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
