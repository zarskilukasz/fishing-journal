/**
 * TripDetailsContent - Main content layout for trip details.
 * Orchestrates all sections: header, summary, location, weather, catches, equipment.
 */
import React, { useCallback } from "react";
import { TripHeader } from "./TripHeader";
import { TripSummaryGrid } from "./TripSummaryGrid";
import { LocationSection } from "./LocationSection";
import { WeatherSection } from "./WeatherSection";
import { CatchesSection } from "./CatchesSection";
import { EquipmentSection } from "./EquipmentSection";
import { AddCatchFAB } from "./AddCatchFAB";
import { useTripActions } from "../context/TripActionsContext";
import type { TripGetResponseDto, TripDto } from "@/types";
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

  const handleClose = useCallback(() => {
    const endedAt = new Date().toISOString();
    closeTrip(endedAt);
  }, [closeTrip]);

  const handleDelete = useCallback(() => {
    deleteTrip();
  }, [deleteTrip]);

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
      {actions.canAddCatch && <AddCatchFAB tripId={tripId} />}
    </div>
  );
}
