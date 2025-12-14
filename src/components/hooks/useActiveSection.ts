import type { NavigationSection } from "@/components/layout/navigation.types";

/**
 * Custom hook to determine the active navigation section based on the current URL path.
 *
 * @param currentPath - The current URL pathname
 * @returns The active NavigationSection
 */
export function useActiveSection(currentPath: string): NavigationSection {
  if (currentPath.startsWith("/app/equipment")) {
    return "equipment";
  }

  if (currentPath.startsWith("/app/profile")) {
    return "profile";
  }

  // Default: /app and /app/trips/* map to 'trips'
  return "trips";
}
