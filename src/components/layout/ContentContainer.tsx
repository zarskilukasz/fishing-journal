import React from "react";
import { cn } from "@/lib/utils";

export interface ContentContainerProps {
  children: React.ReactNode;
  hasBottomNav: boolean;
}

/**
 * Content container - manages padding for nav elements
 */
export function ContentContainer({ children, hasBottomNav }: ContentContainerProps) {
  return (
    <main className={cn("min-h-screen pt-14", hasBottomNav && "pb-16")}>
      <div className="p-4 md:p-6">{children}</div>
    </main>
  );
}
