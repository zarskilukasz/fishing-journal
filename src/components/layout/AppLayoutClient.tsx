import React from "react";
import { useBreakpoint } from "@/components/hooks/useBreakpoint";
import { useActiveSection } from "@/components/hooks/useActiveSection";
import { TopAppBar } from "./TopAppBar";
import { BottomNavigation } from "./BottomNavigation";
import { ContentContainer } from "./ContentContainer";
import { FAB } from "./FAB";

export interface AppLayoutClientProps {
  title: string;
  currentPath: string;
  showBackButton: boolean;
  showFAB: boolean;
  fabLabel?: string;
  fabHref?: string;
  user: { id: string; email: string };
  children: React.ReactNode;
}

/**
 * Main React wrapper component for the app layout.
 * Manages responsive navigation and combines all layout elements.
 */
export function AppLayoutClient({
  title,
  currentPath,
  showBackButton,
  showFAB,
  fabLabel = "Nowy",
  fabHref,
  user,
  children,
}: AppLayoutClientProps) {
  const { isMobile, isDesktop } = useBreakpoint();
  const activeSection = useActiveSection(currentPath);

  return (
    <>
      {/* Top App Bar - always visible, includes navigation on desktop */}
      <TopAppBar
        title={title}
        showBackButton={showBackButton}
        email={user.email}
        isMobile={isMobile}
        activeSection={activeSection}
      />

      {/* Main content area */}
      <ContentContainer hasBottomNav={isMobile}>{children}</ContentContainer>

      {/* FAB - optional */}
      {showFAB && <FAB label={fabLabel} href={fabHref} isExtended={isDesktop} />}

      {/* Bottom Navigation - mobile only */}
      {isMobile && <BottomNavigation activeSection={activeSection} />}
    </>
  );
}
