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
import type { CaseOffer } from "./db";

/** ההצעה כפי שהעו"ד ממלא אותה — חותמת הזמן נוספת בשכבת הנתונים. */
type OfferInput = Omit<CaseOffer, "at" | "fee">;
import { toast } from "sonner";
import { LANGS, type Lang } from "./settings";
import { translate } from "./i18n";
import { fbAuth, isBrowser, isFirebaseConfigured } from "./firebase";
import { consumeRedirectSignIn, hasPendingRedirect } from "./auth-service";
import { maskLawyerName } from "./privacy";
import { isOnboarded } from "./post-auth-route";
import { matchScore, matchTone } from "./match";
import {
  categoryMatchesSpecialties,
  chooseLawyerDb,
  ensureUserDoc,
  expressInterestDb,
  markNotificationRead,
  watchLawyerProfile,
  readUserGate,
  markUserOnboarded,
  watchUserRole,
  watchLawyerFeed,
  watchMyCases,
  watchNotifications,
  writeUserRole,
  cancelScheduledDeletion,
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
  /** true כשטעינת הפיד נכשלה (לרוב הרשאות) — להבדיל מ״אין פניות״. */
  feedError: boolean;
  /** true כשטעינת תיקי הלקוח נכשלה — להבדיל מ״אין תיקים״. */
  casesError: boolean;
  /** ה-snapshot הראשון הגיע (או נכשל). לפניו "אין תיקים" אינו נתון. */
  casesLoaded: boolean;
  expressInterest: (feedId: string, offer?: OfferInput) => void;
  getFeedCase: (id: string) => FeedCase | undefined;
  /** משתמש Firebase מחובר (null = אורח). */
  user: User | null;
  /** false עד שסטטוס ההתחברות ידוע — מונע ניתוב שגוי בזמן רענון. */
  authReady: boolean;
  /** true אם חזרנו מהפניית התחברות בלי חשבון מחובר. מסך ההתחברות אומר זאת. */
  authRedirectFailed: boolean;
  clearAuthRedirectError: () => void;
  /** true בזמן קליטת החזרה מגוגל — מסך ההתחברות מציג "מתחברים" ולא כפתורים. */
  authResolving: boolean;
  /**
   * האם המשתמש כבר אישר את התנאים. null = עוד לא יודעים — וזה מצב
   * משמעותי: ניתוב לפני שהתשובה הגיעה הוא בדיוק מה ששלח משתמש חדש הביתה.
   */
  onboarded: boolean | null;
  /** נקרא בסיום מסך הפתיחה. נכתב לשרת, כדי שיחזיק גם במכשיר אחר. */
  markOnboarded: () => Promise<void>;
  signOut: () => Promise<void>;
  /** התראות המשתמש — בזמן אמת, החדשות ראשונות. */
  notifications: AppNotification[];
  markRead: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const ROLE_CACHE_KEY = "justask-role-v2";

/** שפת הממשק מחוץ להקשר של React — ה-store אינו צרכן של ספק ההגדרות. */
function uiLang(): Lang {
  try {
    const raw = localStorage.getItem("justask-settings-v1");
    const l = JSON.parse(raw ?? "{}").lang;
    return (LANGS as readonly string[]).includes(l) ? (l as Lang) : "he";
  } catch {
    return "he";
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authRedirectFailed, setAuthRedirectFailed] = useState(false);
  /*
   * לא נקבע ברינדור הראשון בכוונה: בשרת אין localStorage, ולכן ערך
   * התחלתי שתלוי בו יוצר hydration mismatch — ודווקא הבהוב, שזה מה
   * שבאנו למנוע. נקבע בפתיחת האפקט, כלומר בפריים הראשון אחרי ההרכבה.
   */
  const [authResolving, setAuthResolving] = useState(false);
  const [role, setRoleState] = useState<Role | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [feed, setFeed] = useState<FeedCase[]>([]);
  // פיד שנכשל נראה בדיוק כמו פיד ריק — לכן מבדילים ביניהם במפורש
  const [feedError, setFeedError] = useState(false);
  // "אין תיקים" מול "לא הצלחנו לטעון" — ללקוח זה ההבדל בין שקט לבהלה
  const [casesError, setCasesError] = useState(false);
  const [casesLoaded, setCasesLoaded] = useState(false);
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
    if (!isFirebaseConfigured()) {
      setAuthReady(true);
      return;
    }
    /*
     * חזרה מהפניית התחברות — נקלטת **לפני** שמאזינים לשינוי המצב.
     *
     * זה חייב להיות await ולא fire-and-forget: אחרת onAuthStateChanged
     * יורה null לפני שההפניה נקלטה, authReady יהפוך ל-true, השער ישלח
     * את המשתמש למסך ההתחברות — והוא ילחץ שוב. זו הלולאה שדווחה.
     */
    // סינכרוני, לפני כל עבודה אסינכרונית — כך המסך מציג "מסיימים
    // את ההתחברות" כבר בציור הבא, ולא את הכפתור שנראה ככישלון
    if (hasPendingRedirect()) setAuthResolving(true);

    let cancelled = false;
    let unsubAuth: (() => void) | undefined;

    void (async () => {
      const outcome = await consumeRedirectSignIn();
      if (cancelled) return;
      if (outcome.status === "failed") setAuthRedirectFailed(true);

      unsubAuth = onAuthStateChanged(fbAuth(), async (u) => {
        setUser(u);
        if (u) {
          // התחברות שהצליחה מוחקת שגיאה קודמת — אחרת היא נשארת על המסך
          setAuthRedirectFailed(false);
          /*
           * מי שמחובר עבר את הפתיחה בהגדרה — הדגל נחתם כאן ולא במסך
           * הפתיחה, כדי שמי שנטש באמצע ההתחברות יראה אותה שוב. זה גם
           * מרפא משתמשים ותיקים שנרשמו לפני שהדגל היה קיים.
           */
          try {
            localStorage.setItem("justask-welcomed", "1");
            /*
             * ההתחברות היא הביטול. מי שביקש למחוק וחזר להתחבר בתוך
             * הצינון — רוצה את החשבון שלו; אין צורך לשאול אותו שוב.
             */
            void cancelScheduledDeletion(u.uid)
              .then((was) => {
                if (was) toast.success(translate("deleteCancelled", uiLang()));
              })
              .catch(() => {});
          } catch {
            /* ignore */
          }
          // סנכרון פרופיל + תפקיד מהשרת
          void ensureUserDoc(u.uid, {
            email: u.email ?? undefined,
            phone: u.phoneNumber ?? undefined,
            name: u.displayName ?? undefined,
          });
          /*
           * התפקיד וסימון הפתיחה — שניהם, לפני כל ניתוב.
           *
           * התפקיד נכתב עד כה רק ע"י onSignedIn, שרצה בפופאפ בלבד; מי
           * שהתחבר בהפניה מהטלפון נשאר עם תפקיד במטמון המקומי ובלי שורה
           * במסד — ולכן חוקי הגישה דחו אותו. לכן: אם לשרת אין תפקיד ולנו
           * יש, אנחנו כותבים אותו.
           */
          let cachedRole: Role | null = null;
          try {
            const c = localStorage.getItem(ROLE_CACHE_KEY);
            if (c === "client" || c === "lawyer") cachedRole = c;
          } catch {
            /* ignore */
          }
          try {
            const gate = await readUserGate(u.uid);
            if (gate.role) {
              setRoleState(gate.role);
              try { localStorage.setItem(ROLE_CACHE_KEY, gate.role); } catch { /* ignore */ }
            } else if (cachedRole) {
              void writeUserRole(u.uid, cachedRole).catch(() => {
                /* המנוי החי ינסה שוב; אין מה להבהיל את המשתמש כאן */
              });
            }
            setOnboarded(
              isOnboarded({
                onboardedAt: gate.onboardedAt,
                accountCreatedAt: u.metadata?.creationTime ?? null,
              }),
            );
          } catch {
            /*
             * offline — נשארים עם מטמון התפקיד, אבל לא משאירים את
             * onboarded על null: מסך ההתחברות מחכה לערך הזה כדי לנתב,
             * ו"לחכות לרשת" פירושו משתמש תקוע מול מסך ריק. תאריך יצירת
             * החשבון קיים גם בלי רשת ומספיק להחלטה בטוחה: ותיק — פנימה;
             * חדש — למסך התנאים, שגרוע במקרה הרע בחזרה מיותרת עליו.
             */
            setOnboarded(
              isOnboarded({ accountCreatedAt: u.metadata?.creationTime ?? null }),
            );
          }
        }
        setAuthReady(true);
        // מרגע שסטטוס ההתחברות ידוע אין עוד מה לחכות לו
        setAuthResolving(false);
      });
    })();

    return () => {
      cancelled = true;
      unsubAuth?.();
    };
  }, []);

  /*
   * התפקיד — מנוי חי, ולא רק הקריאה החד-פעמית שבאפקט ההתחברות.
   *
   * הקריאה שם עלולה להיכשל ברגע ההתחברות, ואז המשתמש נשאר בלי תפקיד עד
   * לטעינה הבאה: הפיד ריק, ובלי תיקון נוסף גם התפריט התחתון נעלם. המנוי
   * מתקן את עצמו ברגע שהרשת חוזרת, ומעדכן גם אם התפקיד השתנה במכשיר אחר.
   */
  useEffect(() => {
    if (!user) return;
    return watchUserRole(
      user.uid,
      (r) => {
        setRoleState(r);
        try { localStorage.setItem(ROLE_CACHE_KEY, r); } catch { /* ignore */ }
      },
      () => {
        /* נשארים עם מה שכבר ידוע — ההתאוששות תגיע עם החיבור הבא */
      },
    );
  }, [user]);

  // תיקי הלקוח — בזמן אמת
  useEffect(() => {
    if (!user || role !== "client") {
      setCases([]);
      /*
       * אין מנוי — ולכן גם אין מה לחכות לו. בלי זה מסכים שממתינים
       * ל-casesLoaded נתקעים לנצח על שלד טעינה אצל עורך דין, או אצל
       * לקוח שכתיבת התפקיד שלו נכשלה.
       */
      setCasesLoaded(!user || role !== null);
      return;
    }
    setCasesLoaded(false);
    return watchMyCases(
      user.uid,
      (rows) => {
        setCases(rows);
        setCasesError(false);
        setCasesLoaded(true);
      },
      () => {
        setCasesError(true);
        setCasesLoaded(true);
      },
    );
  }, [user, role]);

  // התראות — בזמן אמת, לכל תפקיד
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    /*
     * כשל כאן היה מציג פעמון ריק — כלומר "אין לך עדכונים" בזמן שיש.
     * משאירים את מה שכבר נטען ולא מוחקים אותו למצב ריק מזויף.
     */
    return watchNotifications(user.uid, setNotifications, () => {});
  }, [user]);

  // הפרופיל המקצועי של עורך הדין (עיר + התמחויות) — לדירוג הפיד
  const [myLawyerProfile, setMyLawyerProfile] = useState<LawyerProfileDoc | null>(null);
  useEffect(() => {
    if (!user || role !== "lawyer") {
      setMyLawyerProfile(null);
      return;
    }
    /*
     * מנוי חי ולא קריאה חד-פעמית — אחרת התחומים שנבחרו בהרשמה אינם
     * מגיעים לפיד עד לטעינה הבאה של האפליקציה, וזה בדיוק המסך הראשון.
     */
    return watchLawyerProfile(user.uid, setMyLawyerProfile, () => {});
  }, [user, role]);

  /*
   * פיד עורך הדין — מסונן לפי תחום, ואז מדורג לפי קרבה גאוגרפית.
   *
   * עד כאן ההתמחות רק *דירגה*: תיק מחוץ לתחום ירד למטה אבל עדיין הופיע.
   * זה סתר ארבעה משפטים באפליקציה ("תראו רק פניות שמתאימות") ובעיקר
   * הרס את הפיד — עורך דין שרואה תיקים שאינם שלו מפסיק לסרוק אותו.
   * מי שטרם בחר תחומים רואה הכל, כדי שלא ייתקע מול פיד ריק בלי הסבר.
   */
  useEffect(() => {
    if (!user || role !== "lawyer") {
      setFeed([]);
      return;
    }
    const mySpecs = myLawyerProfile?.specialties ?? [];
    const matchProfile = {
      specialties: mySpecs,
      languages: myLawyerProfile?.languages,
      city: myLawyerProfile?.city,
    };
    return watchLawyerFeed(user.uid, (items) => {
      const inField =
        mySpecs.length === 0
          ? items
          : items.filter((f) => categoryMatchesSpecialties(f.category, mySpecs));
      /*
       * מד ההתאמה — כללים גלויים בלבד (lib/match.ts). פער שפה מסמן,
       * לא חוסם: עורך דין עשוי להיעזר בקולגה או במתרגם, וחסימה הייתה
       * משאירה לקוח דובר ערבית בלי אף עורך דין.
       */
      const ranked = inField
        .map((f) => {
          const m = matchScore(
            { category: f.category, clientLang: f.clientLang, location: f.location },
            matchProfile,
          );
          return {
            ...f,
            langMismatch: m.langMismatch,
            matchScore: m.score,
            matchReasons: m.reasons,
            match: (matchTone(m.score) === "high" ? "high" : "medium") as
              | "high"
              | "medium",
          };
        })
        .sort((a, b) => {
          if (a.langMismatch !== b.langMismatch) return a.langMismatch ? 1 : -1;
          return (b.matchScore ?? 0) - (a.matchScore ?? 0);
        });
      setFeed(ranked);
      setFeedError(false);
    }, () => setFeedError(true));
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
      /*
       * כישלון כאן נבלע בשקט — וזה בדיוק הבאג שכבר תפס אותנו: התפקיד
       * במטמון המקומי אמר "עורך דין", המסכים התנהגו בהתאם, אבל במסד לא
       * נכתב כלום ולכן החוקים דחו כל קריאה. הפיד נראה ריק בלי סיבה.
       * עכשיו: מנסים שוב פעם אחת, ואם גם זה נכשל — אומרים למשתמש.
       */
      const u = user ?? fbAuth().currentUser;
      if (u) {
        void writeUserRole(u.uid, r)
          .catch(() => writeUserRole(u.uid, r))
          .catch(() => {
            toast.error(translate("roleSaveFailed", uiLang()));
            setRoleState(null);
            try { localStorage.removeItem(ROLE_CACHE_KEY); } catch { /* ignore */ }
          });
      }
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
      /*
       * כתיבה שנכשלה השאירה את הלקוח במסך "נוצר חיבור" מזויף: הוא ראה שם
       * של עורך דין, ניסה להשיג פרטי קשר שלא נכתבו מעולם, ולא ידע כלום.
       * נכשל — מחזירים את המצב ואומרים את זה.
       */
      void chooseLawyerDb(caseId, lawyerId, contact).catch(() => {
        setCases((prev) =>
          prev.map((c) =>
            c.id === caseId
              ? { ...c, chosenLawyerId: undefined, status: "has_interest" }
              : c,
          ),
        );
        toast.error(translate("actionFailedRetry", uiLang()));
      });
    },
    [user],
  );

  const getCase = useCallback(
    (id: string) => cases.find((c) => c.id === id),
    [cases],
  );

  const expressInterest = useCallback(
    (feedId: string, offer?: OfferInput) => {
      setFeed((prev) =>
        prev.map((f) =>
          f.id === feedId
            ? { ...f, expressed: true, interestedCount: f.interestedCount + 1 }
            : f,
        ),
      );
      const u = user ?? fbAuth().currentUser;
      if (!u) return;
      // שם מוסתר עד לחיבור רשמי — מניעת עקיפת הפלטפורמה
      const displayName = maskLawyerName(myLawyerProfile?.name || u.displayName || "עורך דין");
      /*
       * הנתונים נלקחים מהפרופיל שעורך הדין מילא באימות ולא מומצאים.
       * specialty/firm/blurb היו קבועים ריקים, ולכן דף הפרופיל שהלקוח
       * רואה לפני הבחירה היה כותרות בלי תוכן.
       */
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
        specialties: myLawyerProfile?.specialties ?? [],
        city: myLawyerProfile?.city ?? "",
        university: myLawyerProfile?.university ?? "",
        languages: myLawyerProfile?.languages ?? [],
        /*
         * מצולמים לתוך התיק ולא נקראים ממנו בזמן אמת: זה מה שהלקוח ראה
         * ברגע שבחר. שדות ריקים אינם נכתבים — Firestore דוחה undefined.
         */
        ...(myLawyerProfile?.photoUrl ? { photoUrl: myLawyerProfile.photoUrl } : {}),
        ...(myLawyerProfile?.bio ? { bio: myLawyerProfile.bio } : {}),
      };
      // אותה בעיה בצד עו"ד: "נשלח ✓" קבוע גם כשהכתיבה נדחתה
      void expressInterestDb(feedId, { uid: u.uid, profile }, offer).catch((err) => {
        setFeed((prev) =>
          prev.map((f) =>
            f.id === feedId
              ? { ...f, expressed: false, interestedCount: Math.max(0, f.interestedCount - 1) }
              : f,
          ),
        );
        /*
         * "התיק התמלא" אינו תקלה — זה מרוץ שהוא הפסיד בשניות, וההודעה
         * חייבת לומר את זה. "נסו שוב" כאן היה שולח אותו ללחוץ שוב על
         * דבר שלעולם לא יצליח.
         */
        const full = err instanceof Error && err.message === "CASE_FULL";
        toast.error(translate(full ? "caseFullToast" : "actionFailedRetry", uiLang()));
      });
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

  const clearAuthRedirectError = useCallback(() => setAuthRedirectFailed(false), []);

  const markOnboarded = useCallback(async () => {
    // המסך המקומי לא מחכה לשרת — הכתיבה נועדה למכשיר הבא, לא לרגע הזה
    setOnboarded(true);
    const u = fbAuth().currentUser;
    if (u) {
      await markUserOnboarded(u.uid).catch(() => markUserOnboarded(u.uid)).catch(() => {
        /* אין מה לעצור בגלל זה — בפעם הבאה החריג של חשבונות ותיקים לא
           יעזור, אבל המסמך ייכתב בניסיון הבא שהרשת תרשה */
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fbSignOut(fbAuth());
    } finally {
      setRoleState(null);
      try { localStorage.removeItem(ROLE_CACHE_KEY); } catch { /* ignore */ }
      setOnboarded(null);
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
      feedError,
      casesError,
      casesLoaded,
      expressInterest,
      getFeedCase,
      user,
      authReady,
      authRedirectFailed,
      clearAuthRedirectError,
      authResolving,
      onboarded,
      markOnboarded,
      signOut,
      notifications,
      markRead,
    }),
    [role, setRole, cases, addCase, chooseLawyer, getCase, feed, feedError, casesError, casesLoaded, expressInterest, getFeedCase, user, authReady, authRedirectFailed, clearAuthRedirectError, authResolving, onboarded, markOnboarded, signOut, notifications, markRead],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
