/**
 * TripEditView - Main container for trip edit functionality.
 * React island that manages loading, error states, and form rendering.
 */
import React from "react";
import { QueryProvider } from "@/components/providers";
import { useTripEdit } from "./useTripEdit";
import { TripForm } from "./TripForm";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import type { TripEditViewProps } from "./types";
import { apiToFormData } from "./utils";

/**
 * Inner component that uses the hook (must be inside QueryProvider)
 */
function TripEditViewInner({ tripId }: TripEditViewProps) {
  const {
    trip,
    availableEquipment,
    isLoading,
    isSubmitting,
    error,
    showWeatherWarning,
    handleSubmit,
    handleCancel,
    handleWeatherWarningConfirm,
    handleWeatherWarningCancel,
    refetch,
  } = useTripEdit(tripId);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  // No trip found (shouldn't happen if API returns 404 correctly)
  if (!trip) {
    return <ErrorState message="Wyprawa nie została znaleziona" onRetry={refetch} />;
  }

  // Convert API data to form data
  const initialData = apiToFormData(trip);

  return (
    <TripForm
      initialData={initialData}
      availableEquipment={availableEquipment}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      showWeatherWarning={showWeatherWarning}
      onWeatherWarningConfirm={handleWeatherWarningConfirm}
      onWeatherWarningCancel={handleWeatherWarningCancel}
    />
  );
}

/**
 * Main TripEditView component - wraps content with QueryProvider
 */
export function TripEditView({ tripId }: TripEditViewProps) {
  return (
    <QueryProvider>
      <TripEditViewInner tripId={tripId} />
    </QueryProvider>
  );
}

export type { TripEditViewProps };
