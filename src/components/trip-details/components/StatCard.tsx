/**
 * StatCard - Single statistic card with icon, label, and value.
 * Used in the summary grid.
 */
import React from "react";
import type { StatCardProps } from "../types";

/**
 * Statistic card component for summary grid.
 */
export function StatCard({ icon: Icon, label, value, unit }: StatCardProps) {
  return (
    <div className="geist-card p-4">
      <Icon className="h-5 w-5 text-muted-foreground mb-2" aria-hidden="true" />
      <p className="text-xl font-semibold text-foreground">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
