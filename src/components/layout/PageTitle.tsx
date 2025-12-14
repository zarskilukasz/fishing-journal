import React from "react";

interface PageTitleProps {
  children: React.ReactNode;
}

/**
 * Page title component - Geist typography
 */
export function PageTitle({ children }: PageTitleProps) {
  return (
    <h1 className="text-base font-medium text-foreground truncate">
      {children}
    </h1>
  );
}
