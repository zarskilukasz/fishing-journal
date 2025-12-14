import React, { useState, useCallback } from "react";
import { TripList } from "./TripList";
import { EmptyState } from "./EmptyState";
import { ActiveTripBanner } from "./ActiveTripBanner";
import { ErrorBanner } from "./ErrorBanner";
import { QuickStartSheet } from "./QuickStartSheet";
import { useTripList } from "@/components/hooks";
import type { TripDto } from "@/types";

export interface TripListSectionProps {
  /** Callback when a new trip is created */
  onTripCreated?: (trip: TripDto) => void;
}

/**
 * Main section component for the trip list.
 * Manages data fetching, loading states, and QuickStart modal.
 */
export function TripListSection({ onTripCreated }: TripListSectionProps) {
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);

  const { trips, activeTrip, isLoading, isFetchingNextPage, hasNextPage, error, fetchNextPage, refetch } = useTripList({
    limit: 20,
    sort: "started_at",
    order: "desc",
  });

  const handleOpenQuickStart = useCallback(() => {
    setIsQuickStartOpen(true);
  }, []);

  const handleCloseQuickStart = useCallback(() => {
    setIsQuickStartOpen(false);
  }, []);

  const handleTripCreated = useCallback(
    (trip: TripDto) => {
      setIsQuickStartOpen(false);
      onTripCreated?.(trip);
      // Navigate to the new trip
      window.location.href = `/app/trips/${trip.id}`;
    },
    [onTripCreated]
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // Error state
  if (error && trips.length === 0) {
    return <ErrorBanner error={error} onRetry={handleRetry} />;
  }

  // Empty state (after loading)
  if (!isLoading && trips.length === 0) {
    return (
      <>
        <EmptyState onCreateTrip={handleOpenQuickStart} />
        <QuickStartSheet isOpen={isQuickStartOpen} onClose={handleCloseQuickStart} onSuccess={handleTripCreated} />
      </>
    );
  }

  // Non-active trips (exclude active trip from main list if shown in banner)
  const displayTrips = activeTrip ? trips.filter((t) => t.id !== activeTrip.id) : trips;

  return (
    <div className="space-y-6">
      {/* Active trip banner */}
      {activeTrip && <ActiveTripBanner trip={activeTrip} />}

      {/* Section header */}
      {displayTrips.length > 0 && (
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {activeTrip ? "Historia wypraw" : "Twoje wyprawy"}
        </h2>
      )}

      {/* Trip list */}
      <TripList
        trips={displayTrips}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        onLoadMore={handleLoadMore}
      />

      {/* Error during pagination */}
      {error && trips.length > 0 && <ErrorBanner error={error} onRetry={handleRetry} />}

      {/* QuickStart modal */}
      <QuickStartSheet isOpen={isQuickStartOpen} onClose={handleCloseQuickStart} onSuccess={handleTripCreated} />
    </div>
  );
}
