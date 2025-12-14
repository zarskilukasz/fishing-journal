import { useState, useEffect } from "react";
import { BREAKPOINTS } from "@/components/layout/navigation.types";

/**
 * Custom hook for detecting current breakpoint (mobile vs desktop).
 * Follows Material Design 3 responsive guidelines.
 *
 * @returns Object with isMobile and isDesktop boolean flags
 */
export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsMobile(width < BREAKPOINTS.mobile);
      setIsDesktop(width >= BREAKPOINTS.desktop);
    };

    // Initial check
    checkBreakpoint();

    // Listen for resize events
    window.addEventListener("resize", checkBreakpoint);

    return () => {
      window.removeEventListener("resize", checkBreakpoint);
    };
  }, []);

  return { isMobile, isDesktop };
}
