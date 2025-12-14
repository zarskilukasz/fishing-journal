import React, { useMemo } from "react";
import { Play, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLocation, formatTripDate } from "@/lib/utils/tripFormatters";
import type { TripListItemDto } from "@/types";

export interface ActiveTripBannerProps {
  trip: TripListItemDto;
}

/**
 * Banner component displayed when user has an active trip.
 * Provides quick access to continue the trip.
 * Clicking navigates to trip details page.
 */
export const ActiveTripBanner = React.memo(function ActiveTripBanner({ trip }: ActiveTripBannerProps) {
  const locationLabel = useMemo(() => formatLocation(trip.location), [trip.location]);
  const dateLabel = useMemo(() => formatTripDate(trip.started_at), [trip.started_at]);

  const displayLabel = locationLabel || dateLabel;
  const tripUrl = `/app/trips/${trip.id}`;

  return (
    <a
      href={tripUrl}
      className={cn(
        "geist-card-glow cursor-pointer block no-underline",
        "border-success/30 bg-success/5",
        "hover:border-success/50 hover:bg-success/10",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
      aria-label={`Kontynuuj aktywną wyprawę: ${displayLabel}`}
    >
      <div className="flex items-center gap-4">
        {/* Status icon with pulse animation */}
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success shrink-0">
          <Play className="h-5 w-5" aria-hidden="true" />
          {/* Pulse indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-success uppercase tracking-wider">Trwa wyprawa</p>
          <p className="text-sm font-medium text-foreground truncate mt-0.5">{displayLabel}</p>
        </div>

        {/* Action indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-success">Kontynuuj</span>
          <ChevronRight className="h-4 w-4 text-success" aria-hidden="true" />
        </div>
      </div>
    </a>
  );
});
