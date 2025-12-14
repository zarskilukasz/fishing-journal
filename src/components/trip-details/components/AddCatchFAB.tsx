/**
 * AddCatchFAB - Floating action button for adding a catch.
 * Uses the same styling as the main FAB component.
 */
import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/components/hooks/useMediaQuery";
import type { AddCatchFABProps } from "../types";

/**
 * FAB for adding a new catch to the trip.
 * Matches the size and style of the main FAB component.
 */
export const AddCatchFAB = React.memo(function AddCatchFAB({ onClick, disabled = false }: AddCatchFABProps) {
  const isExtended = useIsDesktop();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "fixed z-40 flex items-center justify-center",
        "bg-primary text-primary-foreground",
        "transition-all duration-200",
        "hover:bg-primary-hover hover:shadow-glow",
        "active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Position and size (matching FAB.tsx)
        isExtended ? "bottom-6 right-6 h-10 px-4 rounded-lg gap-2" : "bottom-20 right-4 h-12 w-12 rounded-xl",
        disabled && "pointer-events-none opacity-50"
      )}
      aria-label={!isExtended ? "Dodaj połów" : undefined}
    >
      <Plus className={cn("shrink-0", isExtended ? "h-4 w-4" : "h-5 w-5")} aria-hidden="true" />
      {isExtended && <span className="text-sm font-medium">Dodaj połów</span>}
    </button>
  );
});
