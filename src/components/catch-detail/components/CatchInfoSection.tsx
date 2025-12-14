/**
 * CatchInfoSection - Displays catch information.
 * Shows species name, time, weight, and length with icons.
 */
import React from "react";
import { Clock, Scale, Ruler } from "lucide-react";
import type { CatchInfoSectionProps } from "../types";

/**
 * Info section showing species and measurements.
 */
export function CatchInfoSection({
  speciesName,
  caughtAtFormatted,
  weightFormatted,
  lengthFormatted,
}: CatchInfoSectionProps) {
  return (
    <div className="geist-card p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{speciesName}</h1>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {/* Caught time */}
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <time>{caughtAtFormatted}</time>
        </span>

        {/* Weight */}
        {weightFormatted && (
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4" aria-hidden="true" />
            {weightFormatted}
          </span>
        )}

        {/* Length */}
        {lengthFormatted && (
          <span className="flex items-center gap-2">
            <Ruler className="h-4 w-4" aria-hidden="true" />
            {lengthFormatted}
          </span>
        )}
      </div>
    </div>
  );
}
