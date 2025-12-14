/**
 * Hook for managing weather data in trip details view.
 * Handles fetching weather snapshots and refreshing weather from external API.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { fetchWeatherSnapshot, refreshWeather, getWeatherErrorMessage } from "@/lib/api/weather";
import type {
  WeatherSnapshotGetResponseDto,
  TripWeatherCurrentDto,
  WeatherRefreshCommand,
  TripLocationDto,
  WeatherHourDto,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseWeatherOptions {
  tripId: string;
  tripStartedAt: string;
  tripEndedAt: string | null;
  weatherCurrent: TripWeatherCurrentDto | null;
  location: TripLocationDto | null;
}

export interface UseWeatherReturn {
  /** Weather snapshot data with hourly details */
  weatherData: WeatherSnapshotGetResponseDto | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error message for fetch errors */
  error: string | null;

  /** Loading state for refresh mutation */
  isRefreshing: boolean;
  /** Error message for refresh errors */
  refreshError: string | null;
  /** Whether refresh is possible (has location, trip not too old) */
  canRefresh: boolean;
  /** Function to trigger weather refresh */
  handleRefresh: () => Promise<void>;

  /** Computed: whether we have weather data to display */
  hasWeatherData: boolean;
  /** Whether the trip has location set */
  hasLocation: boolean;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

/**
 * Query keys for weather data
 */
export const weatherQueryKeys = {
  snapshot: (snapshotId: string) => ["weather", "snapshot", snapshotId] as const,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum age for weather refresh (24 hours in milliseconds) */
const MAX_TRIP_AGE_FOR_REFRESH_MS = 24 * 60 * 60 * 1000;

/** Stale time for weather snapshot queries (1 minute) */
const WEATHER_STALE_TIME_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

/**
 * Hook for managing weather data in trip details view
 */
export function useWeather(options: UseWeatherOptions): UseWeatherReturn {
  const { tripId, tripStartedAt, tripEndedAt, weatherCurrent, location } = options;
  const queryClient = useQueryClient();

  const hasLocation = location !== null;

  // Check if refresh is possible (trip has location and is recent enough)
  const tripAge = Date.now() - new Date(tripStartedAt).getTime();
  const canRefresh = hasLocation && tripAge <= MAX_TRIP_AGE_FOR_REFRESH_MS;

  // Track previous tripEndedAt to detect when trip is closed
  const prevTripEndedAtRef = useRef<string | null | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Fetch weather snapshot data (only if we have a current snapshot)
  // ---------------------------------------------------------------------------
  const snapshotQuery = useQuery({
    queryKey: weatherCurrent ? weatherQueryKeys.snapshot(weatherCurrent.snapshot_id) : ["weather", "none"],
    queryFn: () => {
      if (!weatherCurrent) {
        throw new Error("No snapshot available");
      }
      return fetchWeatherSnapshot(weatherCurrent.snapshot_id);
    },
    enabled: !!weatherCurrent,
    staleTime: WEATHER_STALE_TIME_MS,
  });

  // ---------------------------------------------------------------------------
  // Refresh weather mutation
  // ---------------------------------------------------------------------------
  const refreshMutation = useMutation({
    mutationFn: async () => {
      // Calculate period from trip times
      const periodStart = tripStartedAt;
      const periodEnd = tripEndedAt || new Date().toISOString();

      const command: WeatherRefreshCommand = {
        period_start: periodStart,
        period_end: periodEnd,
        force: false,
      };

      return refreshWeather(tripId, command);
    },
    onSuccess: async () => {
      // Invalidate trip details to get new weather_current
      await queryClient.invalidateQueries({
        queryKey: ["trip", "details", tripId],
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Auto-refresh when trip is closed (tripEndedAt changes from null to a value)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Skip first render (ref is undefined)
    if (prevTripEndedAtRef.current === undefined) {
      prevTripEndedAtRef.current = tripEndedAt;
      return;
    }

    // Detect when trip is closed: previous was null, current has value
    const tripJustClosed = prevTripEndedAtRef.current === null && tripEndedAt !== null;

    // Update ref for next comparison
    prevTripEndedAtRef.current = tripEndedAt;

    // Auto-refresh weather when trip is closed and we can refresh
    if (tripJustClosed && canRefresh && !refreshMutation.isPending) {
      refreshMutation.mutate();
    }
  }, [tripEndedAt, canRefresh, refreshMutation]);

  // ---------------------------------------------------------------------------
  // Handler for refresh action
  // ---------------------------------------------------------------------------
  const handleRefresh = useCallback(async () => {
    await refreshMutation.mutateAsync();
  }, [refreshMutation]);

  // ---------------------------------------------------------------------------
  // Filter hours to trip duration
  // ---------------------------------------------------------------------------
  const filteredWeatherData = useMemo((): WeatherSnapshotGetResponseDto | null => {
    if (!snapshotQuery.data) return null;

    const tripStart = new Date(tripStartedAt);
    const tripEnd = tripEndedAt ? new Date(tripEndedAt) : null;

    // If trip is not closed, show all hours
    if (!tripEnd) {
      return snapshotQuery.data;
    }

    // Filter hours to only show those within trip duration
    const filteredHours = snapshotQuery.data.hours.filter((hour: WeatherHourDto) => {
      const hourTime = new Date(hour.observed_at);
      return hourTime >= tripStart && hourTime <= tripEnd;
    });

    return {
      ...snapshotQuery.data,
      hours: filteredHours,
    };
  }, [snapshotQuery.data, tripStartedAt, tripEndedAt]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------
  const hasWeatherData = !!weatherCurrent && !!filteredWeatherData;

  return {
    weatherData: filteredWeatherData,
    isLoading: snapshotQuery.isLoading,
    error: snapshotQuery.error ? getWeatherErrorMessage(snapshotQuery.error) : null,

    isRefreshing: refreshMutation.isPending,
    refreshError: refreshMutation.error ? getWeatherErrorMessage(refreshMutation.error) : null,
    canRefresh,
    handleRefresh,

    hasWeatherData,
    hasLocation,
  };
}
