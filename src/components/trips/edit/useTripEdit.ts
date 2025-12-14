/**
 * useTripEdit - Custom hook for trip edit functionality.
 * Manages data fetching, form submission, and weather warning logic.
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripQueryKeys } from "@/components/hooks";
import { formToApiCommand, haveDatesChanged } from "./utils";
import type { TripEditFormData } from "@/lib/schemas/trip-edit.schema";
import type {
  TripGetResponseDto,
  RodDto,
  LureDto,
  GroundbaitDto,
  UpdateTripCommand,
  PutTripRodsCommand,
  PutTripLuresCommand,
  PutTripGroundbaitsCommand,
  ApiErrorResponse,
} from "@/types";
import type { AvailableEquipmentData, UseTripEditReturn } from "./types";

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
// API Fetch Functions
// ---------------------------------------------------------------------------

/**
 * Fetch trip details with equipment
 */
async function fetchTrip(tripId: string): Promise<TripGetResponseDto> {
  const response = await fetch(`/api/v1/trips/${tripId}?include=rods,lures,groundbaits`);

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
 * Fetch available equipment (rods, lures, groundbaits)
 */
async function fetchEquipment(): Promise<AvailableEquipmentData> {
  const [rodsRes, luresRes, groundbaitsRes] = await Promise.all([
    fetch("/api/v1/rods?limit=100"),
    fetch("/api/v1/lures?limit=100"),
    fetch("/api/v1/groundbaits?limit=100"),
  ]);

  const rods: RodDto[] = rodsRes.ok ? (await rodsRes.json()).data : [];
  const lures: LureDto[] = luresRes.ok ? (await luresRes.json()).data : [];
  const groundbaits: GroundbaitDto[] = groundbaitsRes.ok ? (await groundbaitsRes.json()).data : [];

  return { rods, lures, groundbaits };
}

/**
 * Update trip basic data
 */
async function updateTrip(tripId: string, command: UpdateTripCommand): Promise<TripGetResponseDto> {
  const response = await fetch(`/api/v1/trips/${tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new Error(errorData.error?.message || "Nie udało się zapisać wyprawy");
  }

  return response.json();
}

/**
 * Update trip equipment (rods, lures, groundbaits)
 */
async function updateTripEquipment(
  tripId: string,
  rodIds: string[],
  lureIds: string[],
  groundbaitIds: string[]
): Promise<void> {
  const requests: Promise<Response>[] = [];

  // Update rods
  const rodsCommand: PutTripRodsCommand = { rod_ids: rodIds };
  requests.push(
    fetch(`/api/v1/trips/${tripId}/rods`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rodsCommand),
    })
  );

  // Update lures
  const luresCommand: PutTripLuresCommand = { lure_ids: lureIds };
  requests.push(
    fetch(`/api/v1/trips/${tripId}/lures`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(luresCommand),
    })
  );

  // Update groundbaits
  const groundbaitsCommand: PutTripGroundbaitsCommand = { groundbait_ids: groundbaitIds };
  requests.push(
    fetch(`/api/v1/trips/${tripId}/groundbaits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groundbaitsCommand),
    })
  );

  const responses = await Promise.all(requests);

  // Check for errors
  for (const response of responses) {
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
      throw new Error(errorData.error?.message || "Nie udało się zapisać sprzętu");
    }
  }
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const tripEditQueryKeys = {
  trip: (id: string) => ["trip", "edit", id] as const,
  equipment: ["equipment", "available"] as const,
};

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

/**
 * Custom hook for trip edit view.
 * Manages fetching, state, and mutations for editing a trip.
 */
export function useTripEdit(tripId: string): UseTripEditReturn {
  const queryClient = useQueryClient();

  // Local state
  const [showWeatherWarning, setShowWeatherWarning] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<TripEditFormData | null>(null);

  // Fetch trip data
  const tripQuery = useQuery({
    queryKey: tripEditQueryKeys.trip(tripId),
    queryFn: () => fetchTrip(tripId),
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on 404 or 401
      if (error.message.includes("nie została znaleziona") || error.message.includes("Sesja wygasła")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch available equipment
  const equipmentQuery = useQuery({
    queryKey: tripEditQueryKeys.equipment,
    queryFn: fetchEquipment,
    staleTime: 60000, // 1 minute
  });

  // Mutation for saving trip
  const saveMutation = useMutation({
    mutationFn: async (data: TripEditFormData) => {
      // Update basic trip data
      await updateTrip(tripId, formToApiCommand(data));

      // Update equipment
      await updateTripEquipment(tripId, data.selectedRodIds, data.selectedLureIds, data.selectedGroundbaitIds);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: tripQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: tripEditQueryKeys.trip(tripId) });

      // Redirect to trip details
      navigateTo(`/app/trips/${tripId}`);
    },
  });

  // Get original dates for comparison (for weather warning)
  const originalDates = useMemo(() => {
    if (!tripQuery.data) return null;
    return {
      started_at: new Date(tripQuery.data.started_at),
      ended_at: tripQuery.data.ended_at ? new Date(tripQuery.data.ended_at) : null,
    };
  }, [tripQuery.data]);

  // Check if dates have changed
  const hasDateChanged = useCallback(
    (newStartedAt: Date, newEndedAt: Date | null): boolean => {
      if (!originalDates) return false;
      return haveDatesChanged(originalDates, { started_at: newStartedAt, ended_at: newEndedAt });
    },
    [originalDates]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: TripEditFormData) => {
      // Check if dates changed (weather warning needed)
      if (hasDateChanged(data.started_at, data.ended_at)) {
        setPendingFormData(data);
        setShowWeatherWarning(true);
        return;
      }

      // Proceed with save
      await saveMutation.mutateAsync(data);
    },
    [hasDateChanged, saveMutation]
  );

  // Handle weather warning confirmation
  const handleWeatherWarningConfirm = useCallback(async () => {
    setShowWeatherWarning(false);
    if (pendingFormData) {
      await saveMutation.mutateAsync(pendingFormData);
      setPendingFormData(null);
    }
  }, [pendingFormData, saveMutation]);

  // Handle weather warning cancel
  const handleWeatherWarningCancel = useCallback(() => {
    setShowWeatherWarning(false);
    setPendingFormData(null);
  }, []);

  // Handle cancel (go back)
  const handleCancel = useCallback(() => {
    navigateTo(`/app/trips/${tripId}`);
  }, [tripId]);

  // Refetch data
  const refetch = useCallback(() => {
    tripQuery.refetch();
    equipmentQuery.refetch();
  }, [tripQuery, equipmentQuery]);

  // Combine loading states
  const isLoading = tripQuery.isLoading || equipmentQuery.isLoading;

  // Get error message
  const error = tripQuery.error?.message || equipmentQuery.error?.message || saveMutation.error?.message || null;

  // Get available equipment with fallback
  const availableEquipment: AvailableEquipmentData = equipmentQuery.data ?? {
    rods: [],
    lures: [],
    groundbaits: [],
  };

  return {
    trip: tripQuery.data ?? null,
    availableEquipment,
    isLoading,
    isSubmitting: saveMutation.isPending,
    error,
    showWeatherWarning,
    handleSubmit,
    handleCancel,
    handleWeatherWarningConfirm,
    handleWeatherWarningCancel,
    refetch,
    hasDateChanged,
  };
}
