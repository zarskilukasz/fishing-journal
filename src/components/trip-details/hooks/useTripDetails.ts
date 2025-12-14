/**
 * useTripDetails - Custom hook for trip details functionality.
 * Manages data fetching, close/delete actions, and computed values.
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tripQueryKeys } from "@/components/hooks";
import type { TripGetResponseDto, ApiErrorResponse, CatchInTripDto } from "@/types";
import type {
  TripDetailsState,
  TripDetailsError,
  UseTripDetailsReturn,
  TripSummaryViewModel,
  TripActions,
} from "../types";

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
// Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/**
 * Format weight in grams to human-readable string
 */
function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
}

// ---------------------------------------------------------------------------
// API Fetch Functions
// ---------------------------------------------------------------------------

/**
 * Fetch trip details with all related data
 */
async function fetchTrip(tripId: string): Promise<TripGetResponseDto> {
  const response = await fetch(`/api/v1/trips/${tripId}?include=catches,rods,lures,groundbaits,weather_current`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Wyprawa nie została znaleziona");
    }
    if (response.status === 401) {
      navigateTo("/auth/login");
      throw new Error("Sesja wygasła. Zaloguj się ponownie.");
    }
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new Error(errorData.error?.message || "Nie udało się pobrać danych wyprawy");
  }

  return response.json();
}

/**
 * Close a trip by setting ended_at and status to closed
 */
async function closeTripApi(tripId: string, endedAt: string): Promise<TripGetResponseDto> {
  const response = await fetch(`/api/v1/trips/${tripId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ended_at: endedAt }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new Error(errorData.error?.message || "Nie udało się zamknąć wyprawy");
  }

  return response.json();
}

/**
 * Delete (soft-delete) a trip
 */
async function deleteTripApi(tripId: string): Promise<void> {
  const response = await fetch(`/api/v1/trips/${tripId}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new Error(errorData.error?.message || "Nie udało się usunąć wyprawy");
  }
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const tripDetailsQueryKeys = {
  detail: (id: string) => ["trip", "details", id] as const,
};

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

/**
 * Custom hook for trip details view.
 * Manages fetching, state, and mutations for viewing/closing/deleting a trip.
 */
export function useTripDetails(tripId: string): UseTripDetailsReturn {
  const queryClient = useQueryClient();

  // Local state for action loading states
  const [isClosing, setIsClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<TripDetailsError | null>(null);

  // Fetch trip data
  const tripQuery = useQuery({
    queryKey: tripDetailsQueryKeys.detail(tripId),
    queryFn: () => fetchTrip(tripId),
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on 404 or 401
      if (
        error instanceof Error &&
        (error.message.includes("nie została znaleziona") || error.message.includes("Sesja wygasła"))
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Convert query error to TripDetailsError
  const queryError = useMemo<TripDetailsError | null>(() => {
    if (!tripQuery.error) return null;
    const message = tripQuery.error instanceof Error ? tripQuery.error.message : "Nieznany błąd";
    const code = message.includes("nie została znaleziona") ? "not_found" : "fetch_error";
    return { code, message };
  }, [tripQuery.error]);

  // Combined error state (query error takes precedence)
  const error = queryError || actionError;

  // Close trip action
  const closeTrip = useCallback(
    async (endedAt: string) => {
      setIsClosing(true);
      setActionError(null);

      try {
        await closeTripApi(tripId, endedAt);
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: tripDetailsQueryKeys.detail(tripId) });
        await queryClient.invalidateQueries({ queryKey: tripQueryKeys.all });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się zamknąć wyprawy";
        setActionError({ code: "close_error", message });
        throw err;
      } finally {
        setIsClosing(false);
      }
    },
    [tripId, queryClient]
  );

  // Delete trip action
  const deleteTrip = useCallback(async () => {
    setIsDeleting(true);
    setActionError(null);

    try {
      await deleteTripApi(tripId);
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: tripQueryKeys.all });
      // Redirect to dashboard
      navigateTo("/app");
    } catch (err) {
      setIsDeleting(false);
      const message = err instanceof Error ? err.message : "Nie udało się usunąć wyprawy";
      setActionError({ code: "delete_error", message });
      throw err;
    }
  }, [tripId, queryClient]);

  // Refresh data
  const refresh = useCallback(async () => {
    setActionError(null);
    await tripQuery.refetch();
  }, [tripQuery]);

  // Computed: summary statistics
  const summary = useMemo<TripSummaryViewModel | null>(() => {
    if (!tripQuery.data) return null;

    const catches: CatchInTripDto[] = tripQuery.data.catches ?? [];
    const startedAt = new Date(tripQuery.data.started_at);
    const endedAt = tripQuery.data.ended_at
      ? new Date(tripQuery.data.ended_at)
      : tripQuery.data.status === "active"
        ? new Date()
        : null;

    const durationMinutes = endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000) : null;

    const totalWeightG = catches.reduce((sum, c) => sum + (c.weight_g ?? 0), 0);
    const biggestCatch = catches.reduce<number | null>((max, c) => {
      if (c.weight_g === null) return max;
      return max === null ? c.weight_g : Math.max(max, c.weight_g);
    }, null);

    return {
      durationMinutes,
      durationFormatted: formatDuration(durationMinutes),
      catchCount: catches.length,
      totalWeightG,
      totalWeightFormatted: formatWeight(totalWeightG),
      biggestCatchWeightG: biggestCatch,
      biggestCatchFormatted: biggestCatch ? formatWeight(biggestCatch) : "-",
    };
  }, [tripQuery.data]);

  // Computed: available actions based on trip status
  const tripActions = useMemo<TripActions>(() => {
    if (!tripQuery.data) {
      return { canEdit: false, canClose: false, canDelete: false, canAddCatch: false };
    }

    const { status } = tripQuery.data;
    return {
      canEdit: status !== "closed",
      canClose: status !== "closed",
      canDelete: true,
      canAddCatch: status === "active" || status === "draft",
    };
  }, [tripQuery.data]);

  // Build state object
  const state: TripDetailsState = {
    trip: tripQuery.data ?? null,
    isLoading: tripQuery.isLoading,
    error,
    isClosing,
    isDeleting,
  };

  return {
    state,
    actions: {
      closeTrip,
      deleteTrip,
      refresh,
    },
    computed: {
      summary,
      tripActions,
    },
  };
}
