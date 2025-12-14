import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/hooks/useTheme";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Theme toggle button component
 * Switches between light and dark mode with sun/moon icons
 */
export const ThemeToggle = React.memo(function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-lg",
        "bg-secondary text-foreground",
        "hover:bg-secondary/80 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label={theme === "dark" ? "Włącz tryb jasny" : "Włącz tryb ciemny"}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all duration-300",
          theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )}
      />
    </button>
  );
});
