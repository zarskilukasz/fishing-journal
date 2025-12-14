/**
 * Custom hook for fetching data for catch form select components.
 * Uses TanStack Query for caching and data fetching.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { fetchFishSpecies } from "@/lib/api/fish-species";
import { fetchLures, fetchGroundbaits } from "@/lib/api/equipment";
import {
  mapSpeciesToOption,
  mapLureToOption,
  mapGroundbaitToOption,
  type SpeciesOption,
  type LureOption,
  type GroundbaitOption,
} from "@/components/catches/types";

/**
 * Query keys for catch select data
 */
export const catchSelectQueryKeys = {
  species: (search?: string) => ["fish-species", { search }] as const,
  lures: () => ["lures", "active"] as const,
  groundbaits: () => ["groundbaits", "active"] as const,
};

/**
 * Return type for useCatchSelectData hook
 */
export interface UseCatchSelectDataReturn {
  /** Fish species options */
  species: SpeciesOption[];
  /** Lure options (active only) */
  lures: LureOption[];
  /** Groundbait options (active only) */
  groundbaits: GroundbaitOption[];

  /** Loading states */
  isLoadingSpecies: boolean;
  isLoadingLures: boolean;
  isLoadingGroundbaits: boolean;

  /** Error messages */
  speciesError: string | null;
  luresError: string | null;
  groundbaitsError: string | null;

  /** Species search query */
  speciesSearchQuery: string;
  /** Update species search query (with debounce) */
  setSpeciesSearchQuery: (query: string) => void;

  /** Refetch all data */
  refetchAll: () => void;
}

/**
 * Hook for fetching and managing select data for catch form.
 * Loads species, lures, and groundbaits.
 */
export function useCatchSelectData(): UseCatchSelectDataReturn {
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState("");

  // Fetch fish species
  const speciesQuery = useQuery({
    queryKey: catchSelectQueryKeys.species(speciesSearchQuery || undefined),
    queryFn: () =>
      fetchFishSpecies({
        q: speciesSearchQuery || undefined,
        limit: 100,
        sort: "name",
        order: "asc",
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes - species rarely change
  });

  // Fetch active lures
  const luresQuery = useQuery({
    queryKey: catchSelectQueryKeys.lures(),
    queryFn: () =>
      fetchLures({
        include_deleted: false,
        limit: 100,
        sort: "name",
        order: "asc",
      }),
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch active groundbaits
  const groundbaitsQuery = useQuery({
    queryKey: catchSelectQueryKeys.groundbaits(),
    queryFn: () =>
      fetchGroundbaits({
        include_deleted: false,
        limit: 100,
        sort: "name",
        order: "asc",
      }),
    staleTime: 60 * 1000, // 1 minute
  });

  // Map to select options
  const species = useMemo(() => {
    return speciesQuery.data?.data.map(mapSpeciesToOption) ?? [];
  }, [speciesQuery.data]);

  const lures = useMemo(() => {
    return luresQuery.data?.data.map(mapLureToOption) ?? [];
  }, [luresQuery.data]);

  const groundbaits = useMemo(() => {
    return groundbaitsQuery.data?.data.map(mapGroundbaitToOption) ?? [];
  }, [groundbaitsQuery.data]);

  // Error messages
  const speciesError = speciesQuery.error ? (speciesQuery.error as Error).message : null;
  const luresError = luresQuery.error ? (luresQuery.error as Error).message : null;
  const groundbaitsError = groundbaitsQuery.error ? (groundbaitsQuery.error as Error).message : null;

  // Refetch all
  const refetchAll = useCallback(() => {
    speciesQuery.refetch();
    luresQuery.refetch();
    groundbaitsQuery.refetch();
  }, [speciesQuery, luresQuery, groundbaitsQuery]);

  return {
    species,
    lures,
    groundbaits,

    isLoadingSpecies: speciesQuery.isLoading,
    isLoadingLures: luresQuery.isLoading,
    isLoadingGroundbaits: groundbaitsQuery.isLoading,

    speciesError,
    luresError,
    groundbaitsError,

    speciesSearchQuery,
    setSpeciesSearchQuery,

    refetchAll,
  };
}
