/**
 * Types and constants for the App Layout navigation system.
 */
import type { IconName } from "./NavItem";

/** Navigation section identifiers */
export type NavigationSection = "trips" | "equipment" | "profile";

/** Data structure for a navigation item */
export interface NavItemData {
  section: NavigationSection;
  label: string;
  href: string;
  icon: IconName;
}

/** Breakpoint configuration for responsive layout */
export const BREAKPOINTS = {
  /** Mobile breakpoint - Bottom Navigation */
  mobile: 600,
  /** Tablet breakpoint (optional) */
  tablet: 840,
  /** Desktop breakpoint - Navigation Rail */
  desktop: 840,
} as const;

/** Navigation items configuration */
export const NAVIGATION_ITEMS: NavItemData[] = [
  {
    section: "trips",
    label: "Wyprawy",
    href: "/app",
    icon: "fish",
  },
  {
    section: "equipment",
    label: "Sprzęt",
    href: "/app/equipment",
    icon: "backpack",
  },
  {
    section: "profile",
    label: "Profil",
    href: "/app/profile",
    icon: "user",
  },
];

/** Props for the AppLayout Astro component */
export interface AppLayoutProps {
  title: string;
  showBackButton?: boolean;
  showFAB?: boolean;
  fabLabel?: string;
  fabHref?: string;
}

/** Simplified user session data */
export interface UserSessionData {
  id: string;
  email: string;
}
