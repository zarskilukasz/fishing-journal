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

      // 3. Fetch hourly weather data
      const hoursResult = await this.fetchHourlyWeather(locationResult.data);
      if (hoursResult.error) {
        return { data: null, error: hoursResult.error };
      }

      return {
        data: { hours: hoursResult.data },
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
// Singleton instance
// ---------------------------------------------------------------------------

let instance: WeatherProviderService | null = null;

/**
 * Gets the weather provider service singleton.
 * Reads configuration from environment variables.
 *
 * Environment variables:
 * - ACCUWEATHER_API_KEY: API key for AccuWeather
 * - ACCUWEATHER_BASE_URL: Base URL (optional, defaults to production)
 */
export function getWeatherProvider(): WeatherProviderService {
  if (!instance) {
    instance = new WeatherProviderService({
      apiKey: import.meta.env.ACCUWEATHER_API_KEY || "",
      baseUrl: import.meta.env.ACCUWEATHER_BASE_URL || "https://dataservice.accuweather.com",
      timeout: 10000,
    });
  }
  return instance;
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
