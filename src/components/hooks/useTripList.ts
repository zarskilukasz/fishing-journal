/**
 * Custom hook for fetching and managing trip list with cursor pagination.
 * Uses TanStack Query useInfiniteQuery.
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchTrips, type FetchTripsParams } from "@/lib/api/trips";
import type { TripListItemDto } from "@/types";

/**
 * Options for useTripList hook
 */
export interface UseTripListOptions {
  limit?: number;
  sort?: FetchTripsParams["sort"];
  order?: FetchTripsParams["order"];
  enabled?: boolean;
}

/**
 * Return type for useTripList hook
 */
export interface UseTripListReturn {
  /** All loaded trips */
  trips: TripListItemDto[];
  /** Currently active trip (status === "active"), if any */
  activeTrip: TripListItemDto | null;
  /** True during initial load */
  isLoading: boolean;
  /** True when fetching next page */
  isFetchingNextPage: boolean;
  /** True if there are more pages to load */
  hasNextPage: boolean;
  /** Error object if any */
  error: Error | null;
  /** Fetch next page of trips */
  fetchNextPage: () => void;
  /** Refetch all data */
  refetch: () => void;
}

/**
 * Query key factory for trips
 */
export const tripQueryKeys = {
  all: ["trips"] as const,
  list: (params: Pick<FetchTripsParams, "sort" | "order">) => ["trips", "list", params] as const,
  detail: (id: string) => ["trips", "detail", id] as const,
};

/**
 * Hook for fetching trip list with infinite scroll / load more pagination.
 */
export function useTripList(options: UseTripListOptions = {}): UseTripListReturn {
  const { limit = 20, sort = "started_at", order = "desc", enabled = true } = options;

  const query = useInfiniteQuery({
    queryKey: tripQueryKeys.list({ sort, order }),
    queryFn: async ({ pageParam }) => {
      return fetchTrips({
        sort,
        order,
        limit,
        cursor: pageParam,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.page.next_cursor ?? undefined,
    staleTime: 60000, // 1 minute
    enabled,
  });

  // Flatten all pages into single trips array
  const trips = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.data);
  }, [query.data?.pages]);

  // Find active trip (only one can be active at a time)
  const activeTrip = useMemo(() => {
    return trips.find((trip) => trip.status === "active") ?? null;
  }, [trips]);

  return {
    trips,
    activeTrip,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
