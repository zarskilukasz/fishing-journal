import React from "react";
import { NavItem } from "./NavItem";
import { NAVIGATION_ITEMS, type NavigationSection } from "./navigation.types";

export interface NavigationRailProps {
  activeSection: NavigationSection;
}

/**
 * Navigation rail - Geist style
 * Desktop only (>=768px)
 */
export const NavigationRail = React.memo(function NavigationRail({ activeSection }: NavigationRailProps) {
  return (
    <nav
      className="fixed left-0 top-14 bottom-0 z-40 w-16 bg-background border-r border-border flex flex-col items-center py-4 gap-2"
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
          variant="rail"
        />
      ))}
    </nav>
  );
});
