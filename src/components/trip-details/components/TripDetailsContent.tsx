/**
 * TripDetailsContent - Main content layout for trip details.
 * Orchestrates all sections: header, summary, location, weather, catches, equipment.
 */
import React, { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TripHeader } from "./TripHeader";
import { TripSummaryGrid } from "./TripSummaryGrid";
import { LocationSection } from "./LocationSection";
import { WeatherSection } from "./WeatherSection";
import { CatchesSection } from "./CatchesSection";
import { EquipmentSection } from "./EquipmentSection";
import { AddCatchFAB } from "./AddCatchFAB";
import { CatchFormDialog } from "@/components/catches";
import { useTripActions } from "../context/TripActionsContext";
import type { TripGetResponseDto, TripDto, CatchDto } from "@/types";
import type { TripSummaryViewModel } from "../types";

interface TripDetailsContentProps {
  trip: TripGetResponseDto;
  summary: TripSummaryViewModel | null;
}

/**
 * Convert TripGetResponseDto to TripDto (strip optional includes for header)
 */
function toTripDto(trip: TripGetResponseDto): TripDto {
  return {
    id: trip.id,
    started_at: trip.started_at,
    ended_at: trip.ended_at,
    status: trip.status,
    location: trip.location,
    deleted_at: trip.deleted_at,
    created_at: trip.created_at,
    updated_at: trip.updated_at,
  };
}

/**
 * Main content component organizing all trip detail sections.
 */
export function TripDetailsContent({ trip, summary }: TripDetailsContentProps) {
  const { tripId, actions, closeTrip, deleteTrip, isClosing, isDeleting } = useTripActions();
  const queryClient = useQueryClient();

  // Catch form dialog state
  const [isCatchDialogOpen, setIsCatchDialogOpen] = useState(false);

  const handleClose = useCallback(() => {
    const endedAt = new Date().toISOString();
    closeTrip(endedAt);
  }, [closeTrip]);

  const handleDelete = useCallback(() => {
    deleteTrip();
  }, [deleteTrip]);

  // Open catch form dialog
  const handleOpenCatchDialog = useCallback(() => {
    setIsCatchDialogOpen(true);
  }, []);

  // Close catch form dialog
  const handleCloseCatchDialog = useCallback(() => {
    setIsCatchDialogOpen(false);
  }, []);

  // Handle successful catch creation
  const handleCatchSuccess = useCallback(
    (_createdCatch: CatchDto) => {
      // Invalidate trip details query to refresh catches list
      queryClient.invalidateQueries({ queryKey: ["trip", "details", tripId] });
    },
    [queryClient, tripId]
  );

  const tripDto = toTripDto(trip);

  return (
    <div className="space-y-6 pb-24">
      {/* Header with status, dates, and actions */}
      <TripHeader
        trip={tripDto}
        onClose={handleClose}
        onDelete={handleDelete}
        isClosing={isClosing}
        isDeleting={isDeleting}
        canClose={actions.canClose}
      />

      {/* Summary statistics grid */}
      {summary && (
        <TripSummaryGrid
          startedAt={trip.started_at}
          endedAt={trip.ended_at}
          status={trip.status}
          catches={trip.catches ?? []}
        />
      )}

      {/* Location section (only if location exists) */}
      {trip.location && <LocationSection location={trip.location} />}

      {/* Weather section */}
      <WeatherSection weatherCurrent={trip.weather_current ?? null} tripId={tripId} />

      {/* Catches section */}
      <CatchesSection catches={trip.catches ?? []} tripId={tripId} />

      {/* Equipment section */}
      <EquipmentSection equipment={trip.equipment} />

      {/* FAB for adding catches (only for active/draft trips) */}
      {actions.canAddCatch && <AddCatchFAB onClick={handleOpenCatchDialog} />}

      {/* Catch form dialog */}
      <CatchFormDialog
        tripId={tripId}
        tripStartedAt={trip.started_at}
        tripEndedAt={trip.ended_at}
        isOpen={isCatchDialogOpen}
        onClose={handleCloseCatchDialog}
        onSuccess={handleCatchSuccess}
      />
    </div>
  );
}
