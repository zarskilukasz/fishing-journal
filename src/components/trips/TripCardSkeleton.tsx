import React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton loading component for TripCard.
 * Matches the dimensions and layout of the actual TripCard.
 */
export const TripCardSkeleton = React.memo(function TripCardSkeleton() {
  return (
    <div className={cn("geist-card animate-pulse", "pointer-events-none")} aria-hidden="true">
      <div className="flex items-center gap-4">
        {/* Status icon skeleton */}
        <div className="h-10 w-10 rounded-lg bg-secondary" />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title skeleton */}
          <div className="h-4 w-32 rounded bg-secondary" />
          {/* Meta skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 rounded bg-secondary" />
            <div className="h-3 w-24 rounded bg-secondary" />
          </div>
        </div>

        {/* Catch count skeleton */}
        <div className="text-right space-y-1">
          <div className="h-5 w-6 rounded bg-secondary mx-auto" />
          <div className="h-3 w-8 rounded bg-secondary" />
        </div>
      </div>
    </div>
  );
});
