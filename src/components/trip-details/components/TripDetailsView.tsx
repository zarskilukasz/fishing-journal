/**
 * TripDetailsView - Main container for trip details functionality.
 * React island that manages loading, error states, and content rendering.
 */
import React from "react";
import { QueryProvider } from "@/components/providers";
import { useTripDetails } from "../hooks/useTripDetails";
import { TripActionsProvider } from "../context/TripActionsContext";
import { TripDetailsLoading } from "./TripDetailsLoading";
import { TripDetailsError } from "./TripDetailsError";
import { TripDetailsContent } from "./TripDetailsContent";
import type { TripDetailsViewProps } from "../types";

/**
 * Inner component that uses the hook (must be inside QueryProvider)
 */
function TripDetailsViewInner({ tripId }: TripDetailsViewProps) {
  const { state, actions, computed } = useTripDetails(tripId);

  // Loading state
  if (state.isLoading) {
    return <TripDetailsLoading />;
  }

  // Error state
  if (state.error) {
    return <TripDetailsError error={state.error} onRetry={actions.refresh} />;
  }

  // No trip found (shouldn't happen if API returns 404 correctly)
  if (!state.trip) {
    return (
      <TripDetailsError
        error={{ code: "not_found", message: "Wyprawa nie została znaleziona" }}
        onRetry={actions.refresh}
      />
    );
  }

  // Provide trip actions context to child components
  const contextValue = {
    tripId,
    actions: computed.tripActions,
    closeTrip: actions.closeTrip,
    deleteTrip: actions.deleteTrip,
    isClosing: state.isClosing,
    isDeleting: state.isDeleting,
  };

  return (
    <TripActionsProvider value={contextValue}>
      <TripDetailsContent trip={state.trip} summary={computed.summary} />
    </TripActionsProvider>
  );
}

/**
 * Main TripDetailsView component - wraps content with QueryProvider
 */
export function TripDetailsView({ tripId }: TripDetailsViewProps) {
  return (
    <QueryProvider>
      <TripDetailsViewInner tripId={tripId} />
    </QueryProvider>
  );
}

export type { TripDetailsViewProps };
