import React, { useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Back button component - Geist style
 * Simple icon button with hover state
 */
export const BackButton = React.memo(function BackButton() {
  const handleBack = useCallback(() => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to dashboard
      window.location.href = "/app";
    }
  }, []);

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "flex items-center justify-center",
        "h-8 w-8 rounded-md",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-secondary",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label="Wróć"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
});
