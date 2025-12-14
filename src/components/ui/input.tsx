import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Geist-style Input component
 * Clean, minimal with subtle focus states
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md px-3 py-2",
          "bg-input text-foreground text-sm",
          "border border-border",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary",
          // Hover
          "hover:border-border-hover transition-colors duration-200",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Invalid state
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
