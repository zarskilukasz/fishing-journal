import React, { useMemo } from "react";
import { Calendar, MapPin, Fish } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTripCardViewModel, getStatusColorClass, formatCatchCount } from "@/lib/utils/tripFormatters";
import type { TripListItemDto } from "@/types";

export interface TripCardProps {
  trip: TripListItemDto;
  onClick?: () => void;
}

/**
 * Trip card component - displays a single trip summary.
 * Uses Geist design with glow effect on hover.
 * Clicking navigates to trip details page.
 */
export const TripCard = React.memo(function TripCard({ trip, onClick }: TripCardProps) {
  const viewModel = useMemo(() => toTripCardViewModel(trip), [trip]);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
    // If no onClick handler, let the <a> handle navigation naturally
  };

  const tripUrl = `/app/trips/${trip.id}`;

  return (
    <a
      href={tripUrl}
      onClick={handleClick}
      className={cn(
        "geist-card-glow shine cursor-pointer block",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "no-underline"
      )}
      aria-label={`Wyprawa ${viewModel.formattedStartDate}${viewModel.locationLabel ? `, ${viewModel.locationLabel}` : ""}`}
    >
      <div className="flex items-center gap-4">
        {/* Status icon */}
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
            getStatusColorClass(viewModel.status)
          )}
          aria-hidden="true"
        >
          <Fish className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Location or date as title */}
          <h3 className="text-sm font-medium text-foreground truncate">
            {viewModel.locationLabel || viewModel.formattedStartDate}
          </h3>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {/* Date (if location is shown as title) */}
            {viewModel.locationLabel && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                <span>{viewModel.formattedStartDate}</span>
              </span>
            )}

            {/* Time range */}
            {viewModel.formattedTimeRange && (
              <span className="flex items-center gap-1">
                <span>{viewModel.formattedTimeRange}</span>
              </span>
            )}

            {/* Location (if not shown as title) */}
            {!viewModel.locationLabel && viewModel.status !== "draft" && (
              <span className="flex items-center gap-1 text-muted-foreground/60">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                <span>Brak lokalizacji</span>
              </span>
            )}

            {/* Status badge for draft/active */}
            {viewModel.status !== "closed" && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                  viewModel.status === "active" && "bg-success/10 text-success",
                  viewModel.status === "draft" && "bg-muted text-muted-foreground"
                )}
              >
                {viewModel.statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* Catch count */}
        <div className="text-right shrink-0">
          <span className="text-lg font-semibold text-foreground">{viewModel.catchCount}</span>
          <span className="text-xs text-muted-foreground block">
            {formatCatchCount(viewModel.catchCount).split(" ")[1]}
          </span>
        </div>
      </div>
    </a>
  );
});
