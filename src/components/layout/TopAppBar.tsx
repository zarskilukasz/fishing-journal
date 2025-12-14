import React from "react";
import { BackButton } from "./BackButton";
import { PageTitle } from "./PageTitle";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { NavItem } from "./NavItem";
import { NAVIGATION_ITEMS, type NavigationSection } from "./navigation.types";
import { cn } from "@/lib/utils";

export interface TopAppBarProps {
  title: string;
  showBackButton: boolean;
  email: string;
  isMobile: boolean;
  activeSection: NavigationSection;
}

/**
 * Top app bar component - Geist style
 * Glass effect with blur backdrop
 * Includes navigation on desktop
 */
export const TopAppBar = React.memo(function TopAppBar({
  title,
  showBackButton,
  email,
  isMobile,
  activeSection,
}: TopAppBarProps) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-14",
        "glass border-b",
        "flex items-center justify-between px-4"
      )}
      role="banner"
    >
      {/* Left section: Back button + Title */}
      <div className="flex items-center gap-3 min-w-0">
        {showBackButton && <BackButton />}
        <PageTitle>{title}</PageTitle>
      </div>

      {/* Center section: Navigation (desktop only) */}
      {!isMobile && (
        <nav
          className="flex items-center gap-1"
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
              variant="topbar"
            />
          ))}
        </nav>
      )}

      {/* Right section: Theme toggle + User menu */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <ThemeToggle />
        <UserMenu email={email} />
      </div>
    </header>
  );
});
