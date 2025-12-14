/**
 * useCatchDetail - Custom hook for catch details functionality.
 * Manages data fetching and computed values for viewing a single catch.
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatchDto, FishSpeciesDto, TripDto, CatchPhotoDownloadUrlResponseDto, ApiErrorResponse } from "@/types";
import type { CatchDetailState, CatchDetailError, CatchDetailViewModel, UseCatchDetailReturn } from "../types";
import { deleteCatch as deleteCatchApi } from "@/lib/api/catches";

// ---------------------------------------------------------------------------
// Navigation Helper
// ---------------------------------------------------------------------------

/**
 * Navigate to a URL (extracted to avoid react-compiler issues)
 */
function navigateTo(url: string): void {
  window.location.href = url;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const catchDetailQueryKeys = {
  catch: (id: string) => ["catch", "detail", id] as const,
  species: (id: string) => ["fish-species", id] as const,
  photoUrl: (catchId: string) => ["catch", "photo-url", catchId] as const,
  trip: (id: string) => ["trip", "detail", id] as const,
};

// ---------------------------------------------------------------------------
// API Fetch Functions
// ---------------------------------------------------------------------------

/**
 * Fetch catch data from API
 */
async function fetchCatch(catchId: string): Promise<CatchDto> {
  const response = await fetch(`/api/v1/catches/${catchId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Połów nie został znaleziony");
    }
    if (response.status === 401) {
      navigateTo("/auth/login");
      throw new Error("Sesja wygasła. Zaloguj się ponownie.");
    }
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new Error(errorData.error?.message || "Nie udało się pobrać danych połowu");
  }

  return response.json();
}

/**
 * Fetch fish species data from API
 */
async function fetchSpecies(speciesId: string): Promise<FishSpeciesDto> {
  const response = await fetch(`/api/v1/fish-species/${speciesId}`);

  if (!response.ok) {
    throw new Error("Nie udało się pobrać danych gatunku");
  }

  return response.json();
}

/**
 * Fetch photo download URL from API
 * Returns null if photo doesn't exist or on error (silent fail)
 */
async function fetchPhotoUrl(catchId: string): Promise<string | null> {
  const response = await fetch(`/api/v1/catches/${catchId}/photo/download-url`);

  if (response.status === 404) {
    return null; // No photo
  }
  if (!response.ok) {
    return null; // Ignore photo errors
  }

  const data = (await response.json()) as CatchPhotoDownloadUrlResponseDto;
  return data.url;
}

/**
 * Fetch trip data from API (for date range validation in edit form)
 */
async function fetchTrip(tripId: string): Promise<TripDto> {
  const response = await fetch(`/api/v1/trips/${tripId}`);

  if (!response.ok) {
    throw new Error("Nie udało się pobrać danych wyprawy");
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Format ISO datetime to Polish locale string
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format weight in grams to human-readable string
 */
function formatWeight(grams: number | null): string | null {
  if (grams === null) return null;
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
}

/**
 * Format length in mm to human-readable string (cm)
 */
function formatLength(mm: number | null): string | null {
  if (mm === null) return null;
  if (mm >= 10) {
    return `${(mm / 10).toFixed(1)} cm`;
  }
  return `${mm} mm`;
}

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

/**
 * Custom hook for catch detail view.
 * Manages fetching catch data, species info, photo URL, and trip data.
 * Provides actions for refresh and delete.
 */
export function useCatchDetail(catchId: string): UseCatchDetailReturn {
  const queryClient = useQueryClient();

  // Action states
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<CatchDetailError | null>(null);

  // 1. Fetch catch data
  const catchQuery = useQuery({
    queryKey: catchDetailQueryKeys.catch(catchId),
    queryFn: () => fetchCatch(catchId),
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 404 or 401
      if (
        error instanceof Error &&
        (error.message.includes("nie został znaleziony") || error.message.includes("Sesja wygasła"))
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // 2. Fetch species (depends on catch data)
  const speciesId = catchQuery.data?.species_id ?? "";
  const speciesQuery = useQuery({
    queryKey: catchDetailQueryKeys.species(speciesId),
    queryFn: () => fetchSpecies(speciesId),
    enabled: !!speciesId,
    staleTime: 300000, // 5 minutes - species rarely change
  });

  // 3. Fetch photo URL (depends on catch having photo_path)
  const photoQuery = useQuery({
    queryKey: catchDetailQueryKeys.photoUrl(catchId),
    queryFn: () => fetchPhotoUrl(catchId),
    enabled: !!catchQuery.data?.photo_path,
    staleTime: 300000, // 5 minutes
  });

  // 4. Fetch trip data (for edit form date validation)
  const tripId = catchQuery.data?.trip_id ?? "";
  const tripQuery = useQuery({
    queryKey: catchDetailQueryKeys.trip(tripId),
    queryFn: () => fetchTrip(tripId),
    enabled: !!tripId,
    staleTime: 300000, // 5 minutes
  });

  // Combine errors - catch error takes precedence, then action error
  const error = useMemo<CatchDetailError | null>(() => {
    if (catchQuery.error) {
      const message = catchQuery.error instanceof Error ? catchQuery.error.message : "Nieznany błąd";
      const code = message.includes("nie został znaleziony") ? "not_found" : "fetch_error";
      return { code, message };
    }
    if (speciesQuery.error) {
      return {
        code: "species_error",
        message: "Nie udało się pobrać danych gatunku",
      };
    }
    if (actionError) {
      return actionError;
    }
    return null;
  }, [catchQuery.error, speciesQuery.error, actionError]);

  // Build ViewModel
  const viewModel = useMemo<CatchDetailViewModel | null>(() => {
    if (!catchQuery.data || !speciesQuery.data) return null;

    const c = catchQuery.data;
    const s = speciesQuery.data;
    const t = tripQuery.data;

    return {
      id: c.id,
      tripId: c.trip_id,
      caughtAt: c.caught_at,
      speciesName: s.name,
      speciesId: c.species_id,
      lureId: c.lure_id,
      groundbaitId: c.groundbait_id,
      lureName: c.lure_name_snapshot,
      groundbaitName: c.groundbait_name_snapshot,
      weightG: c.weight_g,
      lengthMm: c.length_mm,
      photoUrl: photoQuery.data ?? null,
      photoPath: c.photo_path,

      // Trip dates for edit form
      tripStartedAt: t?.started_at ?? "",
      tripEndedAt: t?.ended_at ?? null,

      // Formatted values
      caughtAtFormatted: formatDateTime(c.caught_at),
      weightFormatted: formatWeight(c.weight_g),
      lengthFormatted: formatLength(c.length_mm),
    };
  }, [catchQuery.data, speciesQuery.data, photoQuery.data, tripQuery.data]);

  // Refresh action
  const refresh = useCallback(async () => {
    setActionError(null);
    await Promise.all([catchQuery.refetch(), speciesQuery.refetch(), photoQuery.refetch(), tripQuery.refetch()]);
  }, [catchQuery, speciesQuery, photoQuery, tripQuery]);

  // Delete catch action
  const deleteCatch = useCallback(async () => {
    if (!catchQuery.data) return;

    setIsDeleting(true);
    setActionError(null);

    try {
      await deleteCatchApi(catchId);
      // Invalidate catches list for the trip
      await queryClient.invalidateQueries({ queryKey: ["catches", catchQuery.data.trip_id] });
      // Redirect to trip details
      navigateTo(`/app/trips/${catchQuery.data.trip_id}`);
    } catch (err) {
      setIsDeleting(false);
      const message = err instanceof Error ? err.message : "Nie udało się usunąć połowu";
      setActionError({ code: "delete_error", message });
      throw err;
    }
  }, [catchId, catchQuery.data, queryClient]);

  // Determine loading state
  const isLoading = catchQuery.isLoading || (catchQuery.isSuccess && speciesQuery.isLoading);

  const state: CatchDetailState = {
    catch: viewModel,
    isLoading,
    isDeleting,
    error,
  };

  return {
    state,
    actions: {
      refresh,
      deleteCatch,
    },
  };
}
