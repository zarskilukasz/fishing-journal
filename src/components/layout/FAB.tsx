import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FABProps {
  label: string;
  href?: string;
  onClick?: () => void;
  isExtended: boolean;
}

/**
 * Floating Action Button - Geist style
 * Primary action with glow effect on hover
 */
export const FAB = React.memo(function FAB({
  label,
  href,
  onClick,
  isExtended,
}: FABProps) {
  const className = cn(
    "fixed z-40 flex items-center justify-center",
    "bg-primary text-primary-foreground",
    "transition-all duration-200",
    "hover:bg-primary-hover hover:shadow-glow",
    "active:scale-[0.97]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Position
    isExtended
      ? "bottom-6 right-6 h-10 px-4 rounded-lg gap-2"
      : "bottom-20 right-4 h-12 w-12 rounded-xl"
  );

  const content = (
    <>
      <Plus className={cn("shrink-0", isExtended ? "h-4 w-4" : "h-5 w-5")} />
      {isExtended && <span className="text-sm font-medium">{label}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={className}
        aria-label={!isExtended ? label : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={!isExtended ? label : undefined}
    >
      {content}
    </button>
  );
});
