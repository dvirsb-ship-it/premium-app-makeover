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

/** שש שפות הממשק. עברית וערבית — מימין לשמאל. */
export const LANGS = ["he", "en", "ru", "ar", "es", "fr"] as const;
export type Lang = (typeof LANGS)[number];
const RTL_LANGS: ReadonlySet<Lang> = new Set(["he", "ar"]);
export const langDir = (l: Lang): "rtl" | "ltr" => (RTL_LANGS.has(l) ? "rtl" : "ltr");

/** השם של כל שפה — בשפתה שלה, כי כך מזהים אותה גם כשהממשק זר. */
export const LANG_NAMES: Record<Lang, string> = {
  he: "עברית",
  en: "English",
  ru: "Русский",
  ar: "العربية",
  es: "Español",
  fr: "Français",
};

interface SettingsState {
  theme: Theme;
  lang: Lang;
  dir: "rtl" | "ltr";
  /** true when the user hasn't chosen a theme; app follows OS. */
  usesSystemTheme: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  /** Reset to following system preference. */
  useSystemTheme: () => void;
  setLang: (l: Lang) => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

const STORAGE_KEY = "justask-settings-v1";

function detectSystemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("he");
  const [usesSystemTheme, setUsesSystemTheme] = useState(true);

  // Hydrate from localStorage (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (LANGS.includes(parsed.lang)) setLangState(parsed.lang);

      if (parsed.themeSource === "user" && (parsed.theme === "light" || parsed.theme === "dark")) {
        setUsesSystemTheme(false);
        setThemeState(parsed.theme);
      } else {
        // No explicit user choice — follow the system.
        setUsesSystemTheme(true);
        setThemeState(detectSystemTheme());
      }
    } catch {
      setThemeState(detectSystemTheme());
    }
  }, []);

  // Follow OS changes while the user hasn't picked a theme.
  useEffect(() => {
    if (!usesSystemTheme || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setThemeState(e.matches ? "dark" : "light");
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [usesSystemTheme]);

  // Apply theme + language to <html> and persist.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("lang", lang);
    root.setAttribute("dir", langDir(lang));
    root.style.colorScheme = theme;
    // Dynamic status-bar / browser chrome color per theme.
    const themeColor = theme === "dark" ? "#04060b" : "#F8FAFC";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = themeColor;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme,
          lang,
          themeSource: usesSystemTheme ? "system" : "user",
        }),
      );
    } catch {
      /* ignore */
    }
  }, [theme, lang, usesSystemTheme]);

  const setTheme = useCallback((t: Theme) => {
    setUsesSystemTheme(false);
    setThemeState(t);
  }, []);
  const toggleTheme = useCallback(() => {
    setUsesSystemTheme(false);
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);
  const useSystemTheme = useCallback(() => {
    setUsesSystemTheme(true);
    setThemeState(detectSystemTheme());
  }, []);
  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const value = useMemo(
    () => ({
      theme,
      lang,
      dir: langDir(lang),
      usesSystemTheme,
      setTheme,
      toggleTheme,
      useSystemTheme,
      setLang,
    }),
    [theme, lang, usesSystemTheme, setTheme, toggleTheme, useSystemTheme, setLang],
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
