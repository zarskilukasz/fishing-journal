import React from "react";
import { Fish, Backpack, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconName = "fish" | "backpack" | "user";

const iconMap: Record<IconName, LucideIcon> = {
  fish: Fish,
  backpack: Backpack,
  user: User,
};

export interface NavItemProps {
  icon: IconName;
  label: string;
  href: string;
  isActive: boolean;
  variant: "bottom" | "rail" | "topbar";
}

/**
 * Navigation item component - Geist style
 * Used in both BottomNavigation and NavigationRail
 */
export const NavItem = React.memo(function NavItem({ icon, label, href, isActive, variant }: NavItemProps) {
  const Icon = iconMap[icon];

  if (variant === "bottom") {
    return (
      <a
        href={href}
        className={cn(
          "flex flex-col items-center justify-center gap-1",
          "min-w-[64px] py-2 px-3 rounded-lg",
          "transition-colors duration-200",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon className="h-5 w-5" />
        <span className="text-[10px] font-medium">{label}</span>
      </a>
    );
  }

  if (variant === "topbar") {
    return (
      <a
        href={href}
        className={cn(
          "flex items-center gap-2",
          "py-2 px-3 rounded-lg",
          "text-sm font-medium",
          "transition-colors duration-200",
          isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </a>
    );
  }

  // Rail variant
  return (
    <a
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1",
        "w-full py-3 px-2 rounded-lg",
        "transition-all duration-200",
        isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </a>
  );
});
