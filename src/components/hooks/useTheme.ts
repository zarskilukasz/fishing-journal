import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "theme";

/**
 * Gets the initial theme from localStorage or system preference
 */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  // Check system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

/**
 * Hook to manage theme (light/dark mode)
 * Persists preference in localStorage and syncs with document class
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Sync theme to document and localStorage
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem(THEME_KEY, theme);

    // Update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        theme === "dark" ? "#000000" : "#ffffff"
      );
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}

