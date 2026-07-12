import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";
export type Lang = "he" | "en";

interface SettingsState {
  theme: Theme;
  lang: Lang;
  dir: "rtl" | "ltr";
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

const STORAGE_KEY = "justask-settings-v1";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("he");

  // Hydrate from localStorage (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.theme === "light" || parsed.theme === "dark")
          setThemeState(parsed.theme);
        if (parsed.lang === "he" || parsed.lang === "en")
          setLangState(parsed.lang);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Apply theme + language to <html> and persist.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "he" ? "rtl" : "ltr");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, lang }));
    } catch {
      /* ignore */
    }
  }, [theme, lang]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  );
  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const value = useMemo(
    () => ({
      theme,
      lang,
      dir: (lang === "he" ? "rtl" : "ltr") as "rtl" | "ltr",
      setTheme,
      toggleTheme,
      setLang,
    }),
    [theme, lang, setTheme, toggleTheme, setLang],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
