import React, { useCallback } from "react";
import { TripCard } from "./TripCard";
import { TripCardSkeleton } from "./TripCardSkeleton";
import { InfiniteScrollTrigger } from "./InfiniteScrollTrigger";
import { LoadMoreButton } from "./LoadMoreButton";
import { useIsMobile } from "@/components/hooks";
import type { TripListItemDto } from "@/types";

export interface TripListProps {
  trips: TripListItemDto[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
}

/**
 * Trip list component with responsive pagination.
 * Uses infinite scroll on mobile, load more button on desktop.
 */
export const TripList = React.memo(function TripList({
  trips,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: TripListProps) {
  const isMobile = useIsMobile();

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      onLoadMore();
    }
  }, [isFetchingNextPage, hasNextPage, onLoadMore]);

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Ładowanie wypraw">
        {Array.from({ length: 5 }).map((_, i) => (
          <TripCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Trip cards */}
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}

      {/* Pagination */}
      {hasNextPage && (
        <>
          {isMobile ? (
            <InfiniteScrollTrigger
              onIntersect={handleLoadMore}
              disabled={isFetchingNextPage}
              isLoading={isFetchingNextPage}
            />
          ) : (
            <LoadMoreButton onClick={handleLoadMore} isLoading={isFetchingNextPage} disabled={!hasNextPage} />
          )}
        </>
      )}
    </div>
  );
});
