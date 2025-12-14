/**
 * Custom hook for media query detection.
 * Uses matchMedia for efficient reactive queries.
 */
import { useState, useEffect } from "react";

/**
 * Hook that returns true if the given media query matches.
 *
 * @param query - CSS media query string (e.g. "(max-width: 839px)")
 * @returns boolean indicating if the query matches
 *
 * @example
 * const isMobile = useMediaQuery("(max-width: 839px)");
 * const isDesktop = useMediaQuery("(min-width: 840px)");
 */
export function useMediaQuery(query: string): boolean {
  // Default to false for SSR
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Handler for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoints based on Material Design 3 / plan requirements
 */
export const MEDIA_QUERIES = {
  mobile: "(max-width: 839px)",
  desktop: "(min-width: 840px)",
} as const;

/**
 * Convenience hook for checking if viewport is mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MEDIA_QUERIES.mobile);
}

/**
 * Convenience hook for checking if viewport is desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(MEDIA_QUERIES.desktop);
}
