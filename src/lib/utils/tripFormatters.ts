/**
 * Helper functions for formatting trip data for display.
 */
import type { TripStatus, TripLocationDto, TripListItemDto } from "@/types";

/**
 * ViewModel for trip card (transformed from TripListItemDto for display)
 */
export interface TripCardViewModel {
  id: string;
  formattedStartDate: string; // e.g. "12 gru 2025"
  formattedTimeRange: string | null; // e.g. "10:00 - 14:00" or null
  locationLabel: string | null; // location.label or formatted coordinates
  catchCount: number;
  status: TripStatus;
  isActive: boolean;
  statusLabel: string; // "Szkic" | "W trakcie" | "Zakończona"
}

/**
 * Polish month names (short form)
 */
const POLISH_MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"] as const;

/**
 * Status labels in Polish
 */
const STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Szkic",
  active: "W trakcie",
  closed: "Zakończona",
};

/**
 * Format ISO date to Polish format (e.g. "12 gru 2025")
 */
export function formatTripDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (isNaN(date.getTime())) {
    return "Nieprawidłowa data";
  }

  const day = date.getDate();
  const month = POLISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format time range from start and end dates.
 * Returns null if endAt is null or dates are on different days.
 */
export function formatTimeRange(startAt: string, endAt: string | null): string | null {
  if (!endAt) {
    // Only show start time if no end
    const startDate = new Date(startAt);
    if (isNaN(startDate.getTime())) return null;

    const startTime = formatTime(startDate);
    return startTime;
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return null;
  }

  // Check if dates are on the same day
  const isSameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (!isSameDay) {
    // For multi-day trips, just show start time
    return formatTime(startDate);
  }

  const startTime = formatTime(startDate);
  const endTime = formatTime(endDate);

  return `${startTime} - ${endTime}`;
}

/**
 * Format Date to HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format location for display.
 * Returns label if available, otherwise formatted coordinates, or null.
 */
export function formatLocation(location: TripLocationDto | null): string | null {
  if (!location) {
    return null;
  }

  // Prefer label if available
  if (location.label) {
    return location.label;
  }

  // Format coordinates (truncated to 4 decimal places)
  const lat = location.lat.toFixed(4);
  const lng = location.lng.toFixed(4);
  return `${lat}, ${lng}`;
}

/**
 * Get Polish status label
 */
export function getStatusLabel(status: TripStatus): string {
  return STATUS_LABELS[status];
}

/**
 * Transform TripListItemDto to TripCardViewModel
 */
export function toTripCardViewModel(trip: TripListItemDto): TripCardViewModel {
  return {
    id: trip.id,
    formattedStartDate: formatTripDate(trip.started_at),
    formattedTimeRange: formatTimeRange(trip.started_at, trip.ended_at),
    locationLabel: formatLocation(trip.location),
    catchCount: trip.summary.catch_count,
    status: trip.status,
    isActive: trip.status === "active",
    statusLabel: getStatusLabel(trip.status),
  };
}

/**
 * Get status icon color class based on trip status
 */
export function getStatusColorClass(status: TripStatus): string {
  switch (status) {
    case "active":
      return "bg-success/10 text-success";
    case "closed":
      return "bg-primary/10 text-primary";
    case "draft":
    default:
      return "bg-muted text-muted-foreground";
  }
}

/**
 * Format catch count with proper Polish plural form
 */
export function formatCatchCount(count: number): string {
  if (count === 0) {
    return "0 ryb";
  }
  if (count === 1) {
    return "1 ryba";
  }
  if (count >= 2 && count <= 4) {
    return `${count} ryby`;
  }
  // 5+ or 0
  return `${count} ryb`;
}
