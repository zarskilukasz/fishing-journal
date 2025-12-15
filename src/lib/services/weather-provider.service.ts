import type { WeatherHourDto } from "@/types";

/**
 * Weather Provider Service - Integration with AccuWeather API
 *
 * This service handles fetching weather data from AccuWeather API and mapping
 * the response to the internal WeatherHourDto format.
 *
 * AccuWeather API flow:
 * 1. Get location key from coordinates (Geoposition Search API)
 * 2. Fetch historical hourly weather for that location
 * 3. Map response to WeatherHourDto[]
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeatherProviderConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

export interface FetchWeatherParams {
  lat: number;
  lng: number;
  periodStart: string;
  periodEnd: string;
}

export interface WeatherProviderResult {
  hours: WeatherHourDto[];
}

export interface WeatherProviderError {
  status: number;
  message: string;
  code: "rate_limited" | "bad_gateway" | "configuration_error" | "network_error";
}

type WeatherProviderResponse =
  | { data: WeatherProviderResult; error: null }
  | { data: null; error: WeatherProviderError };

// ---------------------------------------------------------------------------
// AccuWeather API Response Types
// ---------------------------------------------------------------------------

interface AccuWeatherLocationResponse {
  Key: string;
  LocalizedName: string;
  Country: {
    ID: string;
    LocalizedName: string;
  };
}

interface AccuWeatherHourlyResponse {
  DateTime: string;
  EpochDateTime: number;
  WeatherIcon: number;
  IconPhrase: string;
  HasPrecipitation: boolean;
  PrecipitationType?: string;
  PrecipitationIntensity?: string;
  IsDaylight: boolean;
  Temperature: {
    Value: number;
    Unit: string;
    UnitType: number;
  };
  RelativeHumidity?: number;
  Wind?: {
    Speed: {
      Value: number;
      Unit: string;
    };
    Direction: {
      Degrees: number;
      Localized: string;
      English: string;
    };
  };
  CloudCover?: number;
  Pressure?: {
    Value: number;
    Unit: string;
  };
  PrecipitationProbability?: number;
  TotalLiquid?: {
    Value: number;
    Unit: string;
  };
}

/**
 * AccuWeather Current Conditions API response type.
 * Used to get atmospheric pressure which is not available in Hourly Forecast.
 */
interface AccuWeatherCurrentConditionsResponse {
  EpochTime: number;
  WeatherText: string;
  WeatherIcon: number;
  IsDayTime: boolean;
  Temperature: {
    Metric: { Value: number; Unit: string };
    Imperial: { Value: number; Unit: string };
  };
  Pressure: {
    Metric: { Value: number; Unit: string };
    Imperial: { Value: number; Unit: string };
  };
  RelativeHumidity?: number;
  Wind?: {
    Speed: { Metric: { Value: number }; Imperial: { Value: number } };
    Direction: { Degrees: number };
  };
  CloudCover?: number;
}

// ---------------------------------------------------------------------------
// Weather Provider Service
// ---------------------------------------------------------------------------

/**
 * Weather provider service for AccuWeather API integration.
 *
 * Features:
 * - Location key lookup from coordinates
 * - Historical hourly weather data fetching
 * - Response mapping to internal format
 * - Error handling (rate limits, network issues, configuration errors)
 */
export class WeatherProviderService {
  private config: WeatherProviderConfig;

  constructor(config: WeatherProviderConfig) {
    this.config = config;
  }

  /**
   * Fetches weather data for given coordinates and time period.
   *
   * @param params - Location and time period parameters
   * @returns Weather hours data or error
   */
  async fetchWeather(params: FetchWeatherParams): Promise<WeatherProviderResponse> {
    // 1. Validate API key configuration
    if (!this.config.apiKey) {
      return {
        data: null,
        error: {
          status: 500,
          message: "Weather provider configuration error",
          code: "configuration_error",
        },
      };
    }

    try {
      // 2. Get location key from coordinates
      const locationResult = await this.getLocationKey(params.lat, params.lng);
      if (locationResult.error) {
        return { data: null, error: locationResult.error };
      }

      // 3. Fetch current conditions (for pressure) and hourly forecast in parallel
      const [currentResult, hoursResult] = await Promise.all([
        this.fetchCurrentConditions(locationResult.data),
        this.fetchHourlyWeather(locationResult.data),
      ]);

      // 4. Get pressure from current conditions (if available)
      const currentPressure = currentResult.data?.pressure_hpa ?? null;

      // 5. Handle hourly data error
      if (hoursResult.error) {
        return { data: null, error: hoursResult.error };
      }

      // 6. Merge pressure into hourly data (use current pressure for all hours if hourly doesn't have it)
      const hoursWithPressure = hoursResult.data.map((hour) => ({
        ...hour,
        // Use hour's pressure if available, otherwise use current conditions pressure
        pressure_hpa: hour.pressure_hpa ?? currentPressure,
      }));

      return {
        data: { hours: hoursWithPressure },
        error: null,
      };
    } catch {
      return {
        data: null,
        error: {
          status: 502,
          message: "Weather provider network error",
          code: "network_error",
        },
      };
    }
  }

  /**
   * Gets AccuWeather location key from coordinates.
   */
  private async getLocationKey(
    lat: number,
    lng: number
  ): Promise<{ data: string; error: null } | { data: null; error: WeatherProviderError }> {
    const url = new URL(`${this.config.baseUrl}/locations/v1/cities/geoposition/search`);
    url.searchParams.set("apikey", this.config.apiKey);
    url.searchParams.set("q", `${lat},${lng}`);
    url.searchParams.set("details", "false");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const errorResult = this.handleErrorResponse(response);
      if (errorResult) {
        return { data: null, error: errorResult };
      }

      const data = (await response.json()) as AccuWeatherLocationResponse;
      return { data: data.Key, error: null };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetches current conditions for a location.
   * Used primarily to get atmospheric pressure which is not available in hourly forecast.
   * Returns null data (not error) if fetch fails - pressure is non-critical.
   */
  private async fetchCurrentConditions(
    locationKey: string
  ): Promise<{ data: { pressure_hpa: number } | null; error: null }> {
    const url = new URL(`${this.config.baseUrl}/currentconditions/v1/${locationKey}`);
    url.searchParams.set("apikey", this.config.apiKey);
    url.searchParams.set("details", "true");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If error, return null data (pressure is non-critical)
      if (!response.ok) {
        return { data: null, error: null };
      }

      const data = (await response.json()) as AccuWeatherCurrentConditionsResponse[];

      // Current conditions returns an array, we want the first (and usually only) item
      if (data.length > 0 && data[0].Pressure?.Metric?.Value) {
        return {
          data: { pressure_hpa: Math.round(data[0].Pressure.Metric.Value) },
          error: null,
        };
      }

      return { data: null, error: null };
    } catch {
      // Non-critical - return null data
      clearTimeout(timeoutId);
      return { data: null, error: null };
    }
  }

  /**
   * Fetches hourly weather data for a location.
   * Uses 12-hour forecast API (free tier) - historical data requires paid API.
   */
  private async fetchHourlyWeather(
    locationKey: string
  ): Promise<{ data: WeatherHourDto[]; error: null } | { data: null; error: WeatherProviderError }> {
    // AccuWeather free tier: hourly forecasts (not historical)
    // For historical data, you'd need AccuWeather's Historical API (paid)
    const url = new URL(`${this.config.baseUrl}/forecasts/v1/hourly/12hour/${locationKey}`);
    url.searchParams.set("apikey", this.config.apiKey);
    url.searchParams.set("details", "true");
    url.searchParams.set("metric", "true");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const errorResult = this.handleErrorResponse(response);
      if (errorResult) {
        return { data: null, error: errorResult };
      }

      const data = (await response.json()) as AccuWeatherHourlyResponse[];
      const hours = this.mapAccuWeatherResponse(data);

      return { data: hours, error: null };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handles error responses from AccuWeather API.
   */
  private handleErrorResponse(response: Response): WeatherProviderError | null {
    if (response.ok) {
      return null;
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: 502,
        message: "Weather provider configuration error",
        code: "configuration_error",
      };
    }

    if (response.status === 429) {
      return {
        status: 429,
        message: "Weather provider rate limit exceeded",
        code: "rate_limited",
      };
    }

    if (response.status >= 500) {
      return {
        status: 502,
        message: "Weather provider error",
        code: "bad_gateway",
      };
    }

    return {
      status: 502,
      message: `Weather provider error: ${response.status}`,
      code: "bad_gateway",
    };
  }

  /**
   * Maps AccuWeather API response to internal WeatherHourDto format.
   */
  private mapAccuWeatherResponse(data: AccuWeatherHourlyResponse[]): WeatherHourDto[] {
    return data.map((hour) => ({
      observed_at: hour.DateTime,
      temperature_c: hour.Temperature?.Value ?? null,
      pressure_hpa: hour.Pressure ? Math.round(hour.Pressure.Value) : null,
      wind_speed_kmh: hour.Wind?.Speed?.Value ?? null,
      wind_direction: hour.Wind?.Direction?.Degrees ?? null,
      humidity_percent: hour.RelativeHumidity ?? null,
      precipitation_mm: hour.TotalLiquid?.Value ?? null,
      cloud_cover: hour.CloudCover ?? null,
      weather_icon: hour.WeatherIcon?.toString() ?? null,
      weather_text: hour.IconPhrase ?? null,
    }));
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Creates a weather provider service with the given configuration.
 * Use this when you have access to request context (Cloudflare runtime env).
 *
 * @param config - Optional partial configuration (apiKey, baseUrl, timeout)
 * @returns Configured WeatherProviderService instance
 */
export function createWeatherProvider(config?: Partial<WeatherProviderConfig>): WeatherProviderService {
  return new WeatherProviderService({
    apiKey: config?.apiKey ?? "",
    baseUrl: config?.baseUrl ?? "https://dataservice.accuweather.com",
    timeout: config?.timeout ?? 10000,
  });
}

/**
 * Maps weather provider errors to API error format.
 *
 * @param error - Weather provider error
 * @returns Mapped error with code, message, and HTTP status
 */
export function mapWeatherProviderError(error: WeatherProviderError): {
  code: string;
  message: string;
  httpStatus: number;
} {
  switch (error.code) {
    case "rate_limited":
      return {
        code: "rate_limited",
        message: "Przekroczono limit zapytań do serwisu pogodowego",
        httpStatus: 429,
      };
    case "configuration_error":
      return {
        code: "bad_gateway",
        message: "Błąd konfiguracji serwisu pogodowego",
        httpStatus: 502,
      };
    case "network_error":
    case "bad_gateway":
    default:
      return {
        code: "bad_gateway",
        message: "Błąd serwisu pogodowego",
        httpStatus: 502,
      };
  }
}
