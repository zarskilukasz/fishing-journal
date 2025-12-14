/**
 * Custom hook for fetching and managing equipment list with cursor pagination.
 * Uses TanStack Query useInfiniteQuery.
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchEquipmentList, type FetchEquipmentParams } from "@/lib/api/equipment";
import type { EquipmentType, EquipmentDto } from "@/components/equipment/types";

/**
 * Query key factory for equipment
 */
export const equipmentQueryKeys = {
  all: ["equipment"] as const,
  list: (type: EquipmentType, params?: { q?: string }) => ["equipment", type, "list", params] as const,
  detail: (type: EquipmentType, id: string) => ["equipment", type, "detail", id] as const,
};

/**
 * Options for useEquipmentList hook
 */
export interface UseEquipmentListOptions {
  type: EquipmentType;
  searchQuery?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Return type for useEquipmentList hook
 */
export interface UseEquipmentListReturn {
  /** All loaded equipment items */
  items: EquipmentDto[];
  /** True during initial load */
  isLoading: boolean;
  /** True if there was an error */
  isError: boolean;
  /** Error object if any */
  error: Error | null;
  /** True when fetching next page */
  isFetchingNextPage: boolean;
  /** True if there are more pages to load */
  hasNextPage: boolean;
  /** Fetch next page of equipment */
  fetchNextPage: () => void;
  /** Refetch all data */
  refetch: () => void;
}

/**
 * Hook for fetching equipment list with infinite scroll / load more pagination.
 */
export function useEquipmentList(options: UseEquipmentListOptions): UseEquipmentListReturn {
  const { type, searchQuery, limit = 20, enabled = true } = options;

  const query = useInfiniteQuery({
    queryKey: equipmentQueryKeys.list(type, { q: searchQuery }),
    queryFn: async ({ pageParam }) => {
      const params: FetchEquipmentParams = {
        limit,
        sort: "created_at",
        order: "desc",
        cursor: pageParam,
      };

      if (searchQuery) {
        params.q = searchQuery;
      }

      return fetchEquipmentList(type, params);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.page.next_cursor ?? undefined,
    staleTime: 60000, // 1 minute
    enabled,
  });

  // Flatten all pages into single items array
  const items = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.data);
  }, [query.data?.pages]);

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
