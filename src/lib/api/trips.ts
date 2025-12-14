/**
 * API functions for trips - client-side fetch wrappers.
 */
import type {
  TripListResponseDto,
  QuickStartTripCommand,
  QuickStartTripResponseDto,
  TripLocationDto,
  ApiErrorResponse,
} from "@/types";

/**
 * Parameters for fetching trips list
 */
export interface FetchTripsParams {
  sort?: "started_at" | "created_at" | "updated_at";
  order?: "asc" | "desc";
  limit?: number;
  cursor?: string;
}

/**
 * API error class for typed error handling
 */
export class TripApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "TripApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Fetch trips list with pagination
 */
export async function fetchTrips(params: FetchTripsParams = {}): Promise<TripListResponseDto> {
  const { sort = "started_at", order = "desc", limit = 20, cursor } = params;

  const searchParams = new URLSearchParams({
    sort,
    order,
    limit: limit.toString(),
  });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(`/api/v1/trips?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new TripApiError(
      errorData.error?.message || "Nie udało się pobrać wypraw",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<TripListResponseDto>;
}

/**
 * Options for quick start trip with GPS
 */
export interface QuickStartOptions {
  useGps: boolean;
  copyEquipment: boolean;
}

/**
 * Get current GPS position with timeout
 */
async function getCurrentPosition(): Promise<TripLocationDto | null> {
  if (!navigator.geolocation) {
    return null;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      });
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch {
    // Continue without location if GPS fails
    return null;
  }
}

/**
 * Create a new trip using quick-start endpoint
 */
export async function quickStartTrip(options: QuickStartOptions): Promise<QuickStartTripResponseDto> {
  const { useGps, copyEquipment } = options;

  // Get GPS location if requested
  let location: TripLocationDto | null = null;
  if (useGps) {
    location = await getCurrentPosition();
  }

  const command: QuickStartTripCommand = {
    location: location || undefined,
    copy_equipment_from_last_trip: copyEquipment,
  };

  const response = await fetch("/api/v1/trips/quick-start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new TripApiError(
      errorData.error?.message || "Nie udało się utworzyć wyprawy",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<QuickStartTripResponseDto>;
}

/**
 * Polish error messages mapping
 */
export const API_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sesja wygasła. Zaloguj się ponownie.",
  validation_error: "Nieprawidłowe dane.",
  not_found: "Zasób nie został znaleziony.",
  conflict: "Wystąpił konflikt. Spróbuj ponownie.",
  rate_limited: "Zbyt wiele prób. Poczekaj chwilę.",
  internal_error: "Wystąpił błąd serwera. Spróbuj ponownie.",
  unknown_error: "Wystąpił nieoczekiwany błąd.",
};

/**
 * Get user-friendly error message from API error
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof TripApiError) {
    return API_ERROR_MESSAGES[error.code] || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return API_ERROR_MESSAGES.unknown_error;
}
