import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Geist-style Button variants
 * Inspired by Vercel's design system
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium transition-all duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ],
  {
    variants: {
      variant: {
        // Primary - filled with brand color
        default: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary-hover hover:shadow-glow",
          "active:scale-[0.98]",
        ],
        // Secondary - subtle background
        secondary: [
          "bg-secondary text-foreground border border-border",
          "hover:bg-card-hover hover:border-border-hover",
          "active:scale-[0.98]",
        ],
        // Outline - transparent with border
        outline: [
          "border border-border bg-transparent text-foreground",
          "hover:bg-secondary hover:border-border-hover",
          "active:scale-[0.98]",
        ],
        // Ghost - no background
        ghost: ["text-foreground", "hover:bg-secondary", "active:scale-[0.98]"],
        // Destructive - danger actions
        destructive: [
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90",
          "active:scale-[0.98]",
        ],
        // Link - text only
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
          "p-0 h-auto",
        ],
      },
      size: {
        default: "h-10 px-4 py-2 rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        xl: "h-14 px-8 text-base rounded-lg",
        icon: "h-10 w-10 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
