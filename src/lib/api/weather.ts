/**
 * API functions for weather - client-side fetch wrappers.
 */
import type {
  WeatherSnapshotGetResponseDto,
  WeatherRefreshResponseDto,
  WeatherRefreshCommand,
  ApiErrorResponse,
} from "@/types";

/**
 * API error class for typed weather error handling
 */
export class WeatherApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "WeatherApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Fetch weather snapshot with hourly data
 */
export async function fetchWeatherSnapshot(snapshotId: string): Promise<WeatherSnapshotGetResponseDto> {
  const response = await fetch(`/api/v1/weather/snapshots/${snapshotId}?include_hours=true`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new WeatherApiError(
      errorData.error?.message || "Nie udało się pobrać danych pogodowych",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<WeatherSnapshotGetResponseDto>;
}

/**
 * Refresh weather from external API (AccuWeather)
 */
export async function refreshWeather(
  tripId: string,
  command: WeatherRefreshCommand
): Promise<WeatherRefreshResponseDto> {
  const response = await fetch(`/api/v1/trips/${tripId}/weather/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new WeatherApiError(
      errorData.error?.message || "Nie udało się pobrać pogody",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<WeatherRefreshResponseDto>;
}

/**
 * Polish error messages for weather API errors
 */
export const WEATHER_ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Przekroczono limit zapytań. Spróbuj ponownie za chwilę.",
  bad_gateway: "Błąd serwisu pogodowego. Spróbuj ponownie później.",
  validation_error: "Wyprawa nie spełnia wymagań (brak lokalizacji lub zbyt stara).",
  not_found: "Dane pogodowe nie zostały znalezione.",
  unauthorized: "Sesja wygasła. Zaloguj się ponownie.",
  unknown_error: "Wystąpił nieoczekiwany błąd.",
};

/**
 * Get user-friendly error message from weather API error
 */
export function getWeatherErrorMessage(error: unknown): string {
  if (error instanceof WeatherApiError) {
    return WEATHER_ERROR_MESSAGES[error.code] || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return WEATHER_ERROR_MESSAGES.unknown_error;
}
