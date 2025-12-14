/**
 * Custom hook for creating a trip using quick-start API.
 * Uses TanStack Query useMutation.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quickStartTrip, type QuickStartOptions, getApiErrorMessage } from "@/lib/api/trips";
import { tripQueryKeys } from "./useTripList";
import type { QuickStartTripResponseDto } from "@/types";

/**
 * Options for useQuickStartTrip hook
 */
export interface UseQuickStartTripOptions {
  /** Callback on successful trip creation */
  onSuccess?: (response: QuickStartTripResponseDto) => void;
  /** Callback on error */
  onError?: (error: Error, message: string) => void;
}

/**
 * Return type for useQuickStartTrip hook
 */
export interface UseQuickStartTripReturn {
  /** Trigger quick start mutation */
  quickStart: (options: QuickStartOptions) => void;
  /** True when mutation is in progress */
  isLoading: boolean;
  /** True when getting GPS location */
  isGettingLocation: boolean;
  /** Error from mutation */
  error: Error | null;
  /** Reset mutation state */
  reset: () => void;
}

/**
 * Hook for creating a trip via quick-start endpoint.
 * Handles GPS location fetching and cache invalidation.
 */
export function useQuickStartTrip(options: UseQuickStartTripOptions = {}): UseQuickStartTripReturn {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: quickStartTrip,
    onSuccess: (response) => {
      // Invalidate trips list to refetch with new trip
      queryClient.invalidateQueries({ queryKey: tripQueryKeys.all });

      onSuccess?.(response);
    },
    onError: (error: Error) => {
      const message = getApiErrorMessage(error);
      onError?.(error, message);
    },
  });

  return {
    quickStart: mutation.mutate,
    isLoading: mutation.isPending,
    // GPS location is fetched inside quickStartTrip, so we track via isPending
    isGettingLocation: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
