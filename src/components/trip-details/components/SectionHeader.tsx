/**
 * SectionHeader - Reusable section header with title and optional count/action.
 */
import React from "react";
import type { SectionHeaderProps } from "../types";

/**
 * Section header with title, optional count badge, and optional action.
 */
export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-foreground" id={`${title.toLowerCase().replace(/\s+/g, "-")}-heading`}>
        {title}
        {count !== undefined && (
          <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
            {count}
          </span>
        )}
      </h3>
      {action && <div>{action}</div>}
    </div>
  );
}
