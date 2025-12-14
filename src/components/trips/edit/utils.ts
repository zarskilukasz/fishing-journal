/**
 * Utility functions for trip edit view.
 * Handles data transformation between API DTOs and form data.
 */
import type { TripGetResponseDto, UpdateTripCommand, TripLocationDto } from "@/types";
import type { TripEditFormData } from "@/lib/schemas/trip-edit.schema";

/**
 * Convert API response to form data format.
 * Transforms ISO strings to Date objects and extracts equipment IDs.
 */
export function apiToFormData(trip: TripGetResponseDto): TripEditFormData {
  return {
    started_at: new Date(trip.started_at),
    ended_at: trip.ended_at ? new Date(trip.ended_at) : null,
    location: trip.location
      ? {
          lat: trip.location.lat,
          lng: trip.location.lng,
          label: trip.location.label ?? "",
        }
      : null,
    selectedRodIds: trip.equipment?.rods.map((r) => r.id) ?? [],
    selectedLureIds: trip.equipment?.lures.map((l) => l.id) ?? [],
    selectedGroundbaitIds: trip.equipment?.groundbaits.map((g) => g.id) ?? [],
  };
}

/**
 * Convert form data to API command format.
 * Transforms Date objects to ISO strings.
 */
export function formToApiCommand(data: TripEditFormData): UpdateTripCommand {
  const location: TripLocationDto | null = data.location
    ? {
        lat: data.location.lat,
        lng: data.location.lng,
        label: data.location.label || null,
      }
    : null;

  return {
    started_at: data.started_at.toISOString(),
    ended_at: data.ended_at?.toISOString() ?? null,
    location,
  };
}

/**
 * Check if dates have changed compared to original values.
 * Used to determine whether to show weather warning dialog.
 */
export function haveDatesChanged(
  original: { started_at: Date; ended_at: Date | null },
  current: { started_at: Date; ended_at: Date | null }
): boolean {
  // Compare started_at timestamps
  if (original.started_at.getTime() !== current.started_at.getTime()) {
    return true;
  }

  // Compare ended_at (handle null cases)
  if (original.ended_at === null && current.ended_at === null) {
    return false;
  }
  if (original.ended_at === null || current.ended_at === null) {
    return true;
  }
  return original.ended_at.getTime() !== current.ended_at.getTime();
}

/**
 * Format date for display in form fields.
 */
export function formatDateTime(date: Date | null): string {
  if (!date) return "";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format date for datetime-local input value.
 */
export function formatDateTimeForInput(date: Date | null): string {
  if (!date) return "";

  // Format: YYYY-MM-DDTHH:mm
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse datetime-local input value to Date.
 */
export function parseDateTimeFromInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
