/**
 * StatusBadge - Visual indicator of trip status.
 * Displays different colors and icons based on status.
 */
import React from "react";
import { FileEdit, Play, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusBadgeProps } from "../types";
import type { TripStatus } from "@/types";

/**
 * Status configuration mapping
 */
const statusConfig: Record<
  TripStatus,
  {
    label: string;
    icon: React.ElementType;
    className: string;
  }
> = {
  draft: {
    label: "Szkic",
    icon: FileEdit,
    className: "bg-muted text-muted-foreground",
  },
  active: {
    label: "Aktywna",
    icon: Play,
    className: "bg-success/10 text-success",
  },
  closed: {
    label: "Zakończona",
    icon: CheckCircle,
    className: "bg-primary/10 text-primary",
  },
};

/**
 * Status badge component showing trip status with icon.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.className)}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}
