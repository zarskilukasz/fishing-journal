import { z } from "zod";

/**
 * Zod schemas for weather endpoint validation.
 * Covers query params, path params, and request bodies for all weather snapshot operations.
 *
 * Key validation aspects:
 * - UUIDs for tripId and snapshotId
 * - ISO 8601 datetime validation for period_start, period_end, fetched_at, observed_at
 * - Numeric ranges for weather measurements (temperature, pressure, humidity, etc.)
 * - Cursor-based pagination for list endpoint
 * - Custom refinement for period_end >= period_start
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Weather snapshot source enum.
 */
export const weatherSnapshotSourceSchema = z.enum(["api", "manual"]);

export type WeatherSnapshotSourceInput = z.infer<typeof weatherSnapshotSourceSchema>;

// ---------------------------------------------------------------------------
// Path Params
// ---------------------------------------------------------------------------

/**
 * Path param schema for trip ID.
 * Used in /trips/{tripId}/weather/... endpoints.
 */
export const tripIdParamSchema = z.object({
  tripId: z.string().uuid("Nieprawidłowy format UUID tripId"),
});

export type TripIdParam = z.infer<typeof tripIdParamSchema>;

/**
 * Path param schema for snapshot ID.
 * Used in /weather/snapshots/{snapshotId}/... endpoints.
 */
export const snapshotIdParamSchema = z.object({
  snapshotId: z.string().uuid("Nieprawidłowy format UUID snapshotId"),
});

export type SnapshotIdParam = z.infer<typeof snapshotIdParamSchema>;

// ---------------------------------------------------------------------------
// Query Params: GET /trips/{tripId}/weather/snapshots (List)
// ---------------------------------------------------------------------------

/**
 * Query params for listing weather snapshots.
 * Supports filtering by source, pagination, and sorting.
 */
export const weatherSnapshotListQuerySchema = z.object({
  /** Filter by snapshot source (api or manual) */
  source: weatherSnapshotSourceSchema.optional(),
  /** Results per page (1-100, default 20) */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Pagination cursor (opaque base64 string) */
  cursor: z.string().optional(),
  /** Sort field */
  sort: z.enum(["fetched_at", "created_at"]).default("fetched_at"),
  /** Sort direction */
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type WeatherSnapshotListQuery = z.infer<typeof weatherSnapshotListQuerySchema>;

// ---------------------------------------------------------------------------
// Query Params: GET /weather/snapshots/{snapshotId} (Details)
// ---------------------------------------------------------------------------

/**
 * Query params for getting weather snapshot details.
 * Supports optional inclusion of hourly data.
 */
export const weatherSnapshotGetQuerySchema = z.object({
  /** Whether to include hourly weather data (default false) */
  include_hours: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export type WeatherSnapshotGetQuery = z.infer<typeof weatherSnapshotGetQuerySchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /trips/{tripId}/weather/refresh
// ---------------------------------------------------------------------------

/**
 * Request body schema for refreshing weather from external API.
 * Validates period dates and ensures period_end >= period_start.
 */
export const weatherRefreshCommandSchema = z
  .object({
    /** Start of weather period (ISO 8601 datetime) */
    period_start: z.string().datetime("Nieprawidłowy format datetime dla period_start"),
    /** End of weather period (ISO 8601 datetime) */
    period_end: z.string().datetime("Nieprawidłowy format datetime dla period_end"),
    /** Force refresh for older trips (default false) */
    force: z.boolean().default(false),
  })
  .refine((data) => new Date(data.period_end) >= new Date(data.period_start), {
    message: "period_end musi być równe lub późniejsze niż period_start",
    path: ["period_end"],
  });

export type WeatherRefreshCommandInput = z.infer<typeof weatherRefreshCommandSchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /trips/{tripId}/weather/manual - Hour Entry
// ---------------------------------------------------------------------------

/**
 * Schema for a single hour entry in manual weather data.
 * All weather measurements are optional except observed_at.
 */
export const weatherHourSchema = z.object({
  /** Observation timestamp (required, ISO 8601 datetime) */
  observed_at: z.string().datetime("Nieprawidłowy format datetime dla observed_at"),
  /** Temperature in Celsius (-100 to 100) */
  temperature_c: z
    .number()
    .min(-100, "temperature_c musi być >= -100")
    .max(100, "temperature_c musi być <= 100")
    .nullable()
    .optional(),
  /** Atmospheric pressure in hPa (800 to 1200) */
  pressure_hpa: z
    .number()
    .int("pressure_hpa musi być liczbą całkowitą")
    .min(800, "pressure_hpa musi być >= 800")
    .max(1200, "pressure_hpa musi być <= 1200")
    .nullable()
    .optional(),
  /** Wind speed in km/h (>= 0) */
  wind_speed_kmh: z.number().min(0, "wind_speed_kmh musi być >= 0").nullable().optional(),
  /** Wind direction in degrees (0 to 360) */
  wind_direction: z
    .number()
    .int("wind_direction musi być liczbą całkowitą")
    .min(0, "wind_direction musi być >= 0")
    .max(360, "wind_direction musi być <= 360")
    .nullable()
    .optional(),
  /** Humidity percentage (0 to 100) */
  humidity_percent: z
    .number()
    .int("humidity_percent musi być liczbą całkowitą")
    .min(0, "humidity_percent musi być >= 0")
    .max(100, "humidity_percent musi być <= 100")
    .nullable()
    .optional(),
  /** Precipitation in mm (>= 0) */
  precipitation_mm: z.number().min(0, "precipitation_mm musi być >= 0").nullable().optional(),
  /** Cloud cover percentage (0 to 100) */
  cloud_cover: z
    .number()
    .int("cloud_cover musi być liczbą całkowitą")
    .min(0, "cloud_cover musi być >= 0")
    .max(100, "cloud_cover musi być <= 100")
    .nullable()
    .optional(),
  /** Weather icon identifier (max 50 chars) */
  weather_icon: z.string().max(50, "weather_icon nie może przekraczać 50 znaków").nullable().optional(),
  /** Weather description text (max 255 chars) */
  weather_text: z.string().max(255, "weather_text nie może przekraczać 255 znaków").nullable().optional(),
});

export type WeatherHourInput = z.infer<typeof weatherHourSchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /trips/{tripId}/weather/manual
// ---------------------------------------------------------------------------

/**
 * Request body schema for creating a manual weather snapshot.
 * Requires at least one hour entry and validates period dates.
 */
export const weatherManualCommandSchema = z
  .object({
    /** When the data was fetched/entered (ISO 8601 datetime) */
    fetched_at: z.string().datetime("Nieprawidłowy format datetime dla fetched_at"),
    /** Start of weather period (ISO 8601 datetime) */
    period_start: z.string().datetime("Nieprawidłowy format datetime dla period_start"),
    /** End of weather period (ISO 8601 datetime) */
    period_end: z.string().datetime("Nieprawidłowy format datetime dla period_end"),
    /** Array of hourly weather entries (min 1 entry) */
    hours: z.array(weatherHourSchema).min(1, "Wymagany jest co najmniej jeden wpis godzinowy"),
  })
  .refine((data) => new Date(data.period_end) >= new Date(data.period_start), {
    message: "period_end musi być równe lub późniejsze niż period_start",
    path: ["period_end"],
  });

export type WeatherManualCommandInput = z.infer<typeof weatherManualCommandSchema>;
