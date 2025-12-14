/**
 * CatchCard - Single catch item in the list.
 * Shows species, weight, length, and photo thumbnail.
 */
import React from "react";
import { Fish, Clock, Scale, Ruler } from "lucide-react";
import type { CatchCardProps } from "../types";

/**
 * Format time for display
 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format weight in grams
 */
function formatWeight(grams: number | null): string | null {
  if (grams === null) return null;
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
}

/**
 * Format length in mm
 */
function formatLength(mm: number | null): string | null {
  if (mm === null) return null;
  return `${mm} mm`;
}

/**
 * Catch card component showing catch details.
 */
export function CatchCard({ catch: catchItem }: CatchCardProps) {
  const weight = formatWeight(catchItem.weight_g);
  const length = formatLength(catchItem.length_mm);

  return (
    <a
      href={`/app/catches/${catchItem.id}`}
      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-border-hover transition-colors"
    >
      {/* Photo or placeholder */}
      <div className="flex-shrink-0 h-16 w-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
        {catchItem.photo?.url ? (
          <img
            src={catchItem.photo.url}
            alt={catchItem.species.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Fish className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground truncate">{catchItem.species.name}</h4>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatTime(catchItem.caught_at)}
          </span>

          {weight && (
            <span className="flex items-center gap-1">
              <Scale className="h-3 w-3" aria-hidden="true" />
              {weight}
            </span>
          )}

          {length && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" aria-hidden="true" />
              {length}
            </span>
          )}
        </div>

        {(catchItem.lure.name_snapshot || catchItem.groundbait.name_snapshot) && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {catchItem.lure.name_snapshot}
            {catchItem.lure.name_snapshot && catchItem.groundbait.name_snapshot && " • "}
            {catchItem.groundbait.name_snapshot}
          </p>
        )}
      </div>
    </a>
  );
}
