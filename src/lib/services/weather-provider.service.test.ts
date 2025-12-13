import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WeatherProviderService, mapWeatherProviderError } from "./weather-provider.service";

// ---------------------------------------------------------------------------
// Mock Setup
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const validConfig = {
  apiKey: "test-api-key",
  baseUrl: "https://dataservice.accuweather.com",
  timeout: 10000,
};

const validParams = {
  lat: 52.2297,
  lng: 21.0122,
  periodStart: "2025-01-15T08:00:00Z",
  periodEnd: "2025-01-15T18:00:00Z",
};

const mockLocationResponse = {
  Key: "274663",
  LocalizedName: "Warsaw",
  Country: {
    ID: "PL",
    LocalizedName: "Poland",
  },
};

const mockHourlyResponse = [
  {
    DateTime: "2025-01-15T10:00:00Z",
    EpochDateTime: 1736935200,
    WeatherIcon: 3,
    IconPhrase: "Partly sunny",
    HasPrecipitation: false,
    IsDaylight: true,
    Temperature: {
      Value: 12.5,
      Unit: "C",
      UnitType: 17,
    },
    RelativeHumidity: 65,
    Wind: {
      Speed: {
        Value: 15.0,
        Unit: "km/h",
      },
      Direction: {
        Degrees: 180,
        Localized: "S",
        English: "S",
      },
    },
    CloudCover: 40,
    Pressure: {
      Value: 1015,
      Unit: "mb",
    },
    TotalLiquid: {
      Value: 0,
      Unit: "mm",
    },
  },
  {
    DateTime: "2025-01-15T11:00:00Z",
    EpochDateTime: 1736938800,
    WeatherIcon: 4,
    IconPhrase: "Cloudy",
    HasPrecipitation: true,
    PrecipitationType: "Rain",
    PrecipitationIntensity: "Light",
    IsDaylight: true,
    Temperature: {
      Value: 13.2,
      Unit: "C",
      UnitType: 17,
    },
    RelativeHumidity: 70,
    Wind: {
      Speed: {
        Value: 18.5,
        Unit: "km/h",
      },
      Direction: {
        Degrees: 200,
        Localized: "SSW",
        English: "SSW",
      },
    },
    CloudCover: 75,
    Pressure: {
      Value: 1013,
      Unit: "mb",
    },
    TotalLiquid: {
      Value: 0.5,
      Unit: "mm",
    },
  },
];

// ---------------------------------------------------------------------------
// Tests: WeatherProviderService
// ---------------------------------------------------------------------------

describe("WeatherProviderService", () => {
  // ---------------------------------------------------------------------------
  // fetchWeather - Error Scenarios
  // ---------------------------------------------------------------------------

  describe("fetchWeather - error scenarios", () => {
    it("returns configuration error when API key is missing", async () => {
      const service = new WeatherProviderService({
        ...validConfig,
        apiKey: "",
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("configuration_error");
      expect(result.error?.status).toBe(500);
    });

    it("returns rate_limited error on 429 response from location API", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("rate_limited");
      expect(result.error?.status).toBe(429);
    });

    it("returns configuration error on 401 response", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("configuration_error");
      expect(result.error?.status).toBe(502);
    });

    it("returns configuration error on 403 response", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("configuration_error");
      expect(result.error?.status).toBe(502);
    });

    it("returns bad_gateway error on 500 response from location API", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("bad_gateway");
      expect(result.error?.status).toBe(502);
    });

    it("returns bad_gateway error on 503 response", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("bad_gateway");
      expect(result.error?.status).toBe(502);
    });

    it("returns rate_limited error on 429 response from hourly API", async () => {
      const service = new WeatherProviderService(validConfig);

      // First call (location) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      // Second call (hourly) returns 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("rate_limited");
    });

    it("returns bad_gateway error on 500 response from hourly API", async () => {
      const service = new WeatherProviderService(validConfig);

      // First call (location) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      // Second call (hourly) returns 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("bad_gateway");
    });

    it("returns network_error on fetch failure", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("network_error");
      expect(result.error?.status).toBe(502);
    });
  });

  // ---------------------------------------------------------------------------
  // fetchWeather - Success Scenarios
  // ---------------------------------------------------------------------------

  describe("fetchWeather - success scenarios", () => {
    it("returns mapped weather data on successful API calls", async () => {
      const service = new WeatherProviderService(validConfig);

      // Location API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      // Hourly API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHourlyResponse),
      });

      const result = await service.fetchWeather(validParams);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.hours).toHaveLength(2);
    });

    it("correctly maps AccuWeather response to WeatherHourDto", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHourlyResponse),
      });

      const result = await service.fetchWeather(validParams);

      expect(result.data).toBeDefined();
      const firstHour = result.data?.hours[0];

      expect(firstHour?.observed_at).toBe("2025-01-15T10:00:00Z");
      expect(firstHour?.temperature_c).toBe(12.5);
      expect(firstHour?.pressure_hpa).toBe(1015);
      expect(firstHour?.wind_speed_kmh).toBe(15.0);
      expect(firstHour?.wind_direction).toBe(180);
      expect(firstHour?.humidity_percent).toBe(65);
      expect(firstHour?.precipitation_mm).toBe(0);
      expect(firstHour?.cloud_cover).toBe(40);
      expect(firstHour?.weather_icon).toBe("3");
      expect(firstHour?.weather_text).toBe("Partly sunny");
    });

    it("handles empty hourly response", async () => {
      const service = new WeatherProviderService(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await service.fetchWeather(validParams);

      expect(result.error).toBeNull();
      expect(result.data?.hours).toHaveLength(0);
    });

    it("handles missing optional fields in hourly data", async () => {
      const service = new WeatherProviderService(validConfig);

      const minimalHourlyResponse = [
        {
          DateTime: "2025-01-15T10:00:00Z",
          EpochDateTime: 1736935200,
          WeatherIcon: 1,
          IconPhrase: "Sunny",
          HasPrecipitation: false,
          IsDaylight: true,
          Temperature: {
            Value: 15.0,
            Unit: "C",
            UnitType: 17,
          },
          // No Wind, Pressure, CloudCover, etc.
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(minimalHourlyResponse),
      });

      const result = await service.fetchWeather(validParams);

      expect(result.error).toBeNull();
      expect(result.data?.hours).toHaveLength(1);

      const hour = result.data?.hours[0];
      expect(hour?.temperature_c).toBe(15.0);
      expect(hour?.wind_speed_kmh).toBeNull();
      expect(hour?.wind_direction).toBeNull();
      expect(hour?.pressure_hpa).toBeNull();
      expect(hour?.cloud_cover).toBeNull();
      // RelativeHumidity is mapped directly - null if not provided
      expect(hour?.humidity_percent).toBeNull();
      expect(hour?.precipitation_mm).toBeNull();
    });

    it("calls location API with correct URL params", async () => {
      const service = new WeatherProviderService(validConfig);

      // Reset mock to ensure clean state
      mockFetch.mockReset();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.fetchWeather(validParams);

      // First call should be location API
      const locationCall = mockFetch.mock.calls[0][0] as string;
      expect(locationCall).toContain("locations/v1/cities/geoposition/search");
      expect(locationCall).toContain("apikey=test-api-key");
      expect(locationCall).toContain(`q=${validParams.lat}%2C${validParams.lng}`);
    });

    it("calls hourly API with correct URL params", async () => {
      const service = new WeatherProviderService(validConfig);

      // Reset mock to ensure clean state
      mockFetch.mockReset();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.fetchWeather(validParams);

      // Second call should be hourly API
      const hourlyCall = mockFetch.mock.calls[1][0] as string;
      expect(hourlyCall).toContain("forecasts/v1/hourly/12hour/274663");
      expect(hourlyCall).toContain("apikey=test-api-key");
      expect(hourlyCall).toContain("details=true");
      expect(hourlyCall).toContain("metric=true");
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: mapWeatherProviderError
// ---------------------------------------------------------------------------

describe("mapWeatherProviderError", () => {
  it("maps rate_limited error correctly", () => {
    const result = mapWeatherProviderError({
      status: 429,
      message: "Rate limit exceeded",
      code: "rate_limited",
    });

    expect(result.code).toBe("rate_limited");
    expect(result.httpStatus).toBe(429);
    expect(result.message).toContain("limit");
  });

  it("maps configuration_error to bad_gateway", () => {
    const result = mapWeatherProviderError({
      status: 502,
      message: "Config error",
      code: "configuration_error",
    });

    expect(result.code).toBe("bad_gateway");
    expect(result.httpStatus).toBe(502);
    expect(result.message).toContain("konfiguracji");
  });

  it("maps network_error to bad_gateway", () => {
    const result = mapWeatherProviderError({
      status: 502,
      message: "Network error",
      code: "network_error",
    });

    expect(result.code).toBe("bad_gateway");
    expect(result.httpStatus).toBe(502);
  });

  it("maps bad_gateway error correctly", () => {
    const result = mapWeatherProviderError({
      status: 502,
      message: "Server error",
      code: "bad_gateway",
    });

    expect(result.code).toBe("bad_gateway");
    expect(result.httpStatus).toBe(502);
  });
});
