import React from "react";
import { NavItem } from "./NavItem";
import { NAVIGATION_ITEMS, type NavigationSection } from "./navigation.types";

export interface BottomNavigationProps {
  activeSection: NavigationSection;
}

/**
 * Bottom navigation bar - Geist style with glass effect
 * Mobile only (<768px)
 */
export const BottomNavigation = React.memo(function BottomNavigation({
  activeSection,
}: BottomNavigationProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 h-16 glass border-t flex items-center justify-around px-2 safe-area-bottom"
      role="navigation"
      aria-label="Nawigacja główna"
    >
      {NAVIGATION_ITEMS.map((item) => (
        <NavItem
          key={item.section}
          icon={item.icon}
          label={item.label}
          href={item.href}
          isActive={activeSection === item.section}
          variant="bottom"
        />
      ))}
    </nav>
  );
});
