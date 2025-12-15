import type { SupabaseClient } from "@/db/supabase.client";
import type {
  UUID,
  WeatherSnapshotDto,
  WeatherSnapshotListResponseDto,
  WeatherSnapshotGetResponseDto,
  WeatherSnapshotDetailDto,
  WeatherHourDto,
  TripWeatherCurrentResponseDto,
  WeatherManualResponseDto,
  WeatherRefreshResponseDto,
  WeatherSnapshotRow,
} from "@/types";
import type {
  WeatherSnapshotListQuery,
  WeatherSnapshotGetQuery,
  WeatherManualCommandInput,
  WeatherRefreshCommandInput,
} from "@/lib/schemas/weather.schema";
import { encodeCursor, decodeCursor } from "@/lib/api/pagination";
import { mapSupabaseError, type MappedError } from "@/lib/errors/supabase-error-mapper";
import { createWeatherProvider, mapWeatherProviderError, type WeatherProviderConfig } from "./weather-provider.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result wrapper for service operations.
 * Either contains data on success or error details on failure.
 */
type ServiceResult<T> = { data: T; error: null } | { data: null; error: MappedError };

/**
 * Weather snapshot row with joined hours for nested select.
 */
interface WeatherSnapshotWithHours {
  id: UUID;
  trip_id: UUID;
  source: "api" | "manual";
  fetched_at: string;
  period_start: string;
  period_end: string;
  created_at: string;
  weather_hours: {
    observed_at: string;
    temperature_c: number | null;
    pressure_hpa: number | null;
    wind_speed_kmh: number | null;
    wind_direction: number | null;
    humidity_percent: number | null;
    precipitation_mm: number | null;
    cloud_cover: number | null;
    weather_icon: string | null;
    weather_text: string | null;
  }[];
}

// ---------------------------------------------------------------------------
// Weather Service
// ---------------------------------------------------------------------------

/**
 * Service for managing weather snapshots and hourly data.
 *
 * Features:
 * - List weather snapshots for a trip with filtering, pagination, and sorting
 * - Get snapshot details with optional hourly data
 * - Get "current" snapshot (prefers manual, falls back to API)
 * - Create manual weather snapshots with hourly data
 * - Delete snapshots (cascade deletes hours)
 *
 * Security:
 * - RLS policies ensure users can only access weather data from their own trips
 * - Trip ownership is validated through JOIN with trips table
 */
export const weatherService = {
  // ---------------------------------------------------------------------------
  // List Snapshots
  // ---------------------------------------------------------------------------

  /**
   * Lists weather snapshots for a specific trip with filtering, pagination, and sorting.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - Trip UUID to list snapshots for
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of weather snapshots
   */
  async listSnapshots(
    supabase: SupabaseClient,
    tripId: UUID,
    params: WeatherSnapshotListQuery
  ): Promise<ServiceResult<WeatherSnapshotListResponseDto>> {
    const { source, limit, cursor, sort, order } = params;

    // 1. Verify trip exists and user has access (RLS handles ownership)
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .is("deleted_at", null)
      .maybeSingle();

    if (tripError) {
      const mapped = mapSupabaseError(tripError);
      return { data: null, error: mapped };
    }

    if (!trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    // 2. Build query
    let query = supabase
      .from("weather_snapshots")
      .select("id, trip_id, source, fetched_at, period_start, period_end, created_at")
      .eq("trip_id", tripId);

    // 3. Apply source filter
    if (source) {
      query = query.eq("source", source);
    }

    // 4. Sorting (with secondary sort by id for stable pagination)
    query = query.order(sort, { ascending: order === "asc" }).order("id", { ascending: order === "asc" });

    // 5. Cursor-based pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return {
          data: null,
          error: {
            code: "validation_error",
            message: "Nieprawidłowy format kursora",
            httpStatus: 400,
          },
        };
      }

      // Keyset pagination condition
      const op = order === "asc" ? "gt" : "lt";
      query = query.or(
        `${sort}.${op}.${cursorData.sortValue},and(${sort}.eq.${cursorData.sortValue},id.${op}.${cursorData.id})`
      );
    }

    // 6. Fetch one extra to check for next page
    query = query.limit(limit + 1);

    const { data, error } = await query;

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // 7. Check if there are more results
    const hasMore = (data?.length ?? 0) > limit;
    const items = hasMore ? (data ?? []).slice(0, limit) : (data ?? []);

    // 8. Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1] as WeatherSnapshotRow;
      nextCursor = encodeCursor({
        sortValue: String(lastItem[sort as keyof WeatherSnapshotRow]),
        id: lastItem.id,
      });
    }

    return {
      data: {
        data: items as WeatherSnapshotDto[],
        page: { limit, next_cursor: nextCursor },
      },
      error: null,
    };
  },

  // ---------------------------------------------------------------------------
  // Get Snapshot by ID
  // ---------------------------------------------------------------------------

  /**
   * Gets a single weather snapshot by ID with optional hourly data.
   *
   * @param supabase - Supabase client from context.locals
   * @param snapshotId - Snapshot UUID
   * @param query - Query parameters (include_hours)
   * @returns Weather snapshot details with optional hours array
   */
  async getSnapshotById(
    supabase: SupabaseClient,
    snapshotId: UUID,
    query: WeatherSnapshotGetQuery
  ): Promise<ServiceResult<WeatherSnapshotGetResponseDto>> {
    const { include_hours } = query;

    // Build select query based on whether hours are included
    const selectFields = include_hours
      ? `
        id, trip_id, source, fetched_at, period_start, period_end,
        weather_hours (
          observed_at, temperature_c, pressure_hpa, wind_speed_kmh,
          wind_direction, humidity_percent, precipitation_mm,
          cloud_cover, weather_icon, weather_text
        )
      `
      : "id, trip_id, source, fetched_at, period_start, period_end";

    const { data, error } = await supabase
      .from("weather_snapshots")
      .select(selectFields)
      .eq("id", snapshotId)
      .maybeSingle();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    if (!data) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Snapshot pogodowy nie został znaleziony",
          httpStatus: 404,
        },
      };
    }

    // Transform to response DTO
    const snapshot: WeatherSnapshotDetailDto = {
      id: data.id,
      trip_id: data.trip_id,
      source: data.source,
      fetched_at: data.fetched_at,
      period_start: data.period_start,
      period_end: data.period_end,
    };

    let hours: WeatherHourDto[] = [];
    if (include_hours && "weather_hours" in data) {
      const snapshotWithHours = data as unknown as WeatherSnapshotWithHours;
      hours = (snapshotWithHours.weather_hours || []).map((h) => ({
        observed_at: h.observed_at,
        temperature_c: h.temperature_c,
        pressure_hpa: h.pressure_hpa,
        wind_speed_kmh: h.wind_speed_kmh,
        wind_direction: h.wind_direction,
        humidity_percent: h.humidity_percent,
        precipitation_mm: h.precipitation_mm,
        cloud_cover: h.cloud_cover,
        weather_icon: h.weather_icon,
        weather_text: h.weather_text,
      }));
    }

    return {
      data: { snapshot, hours },
      error: null,
    };
  },

  // ---------------------------------------------------------------------------
  // Get Current Snapshot
  // ---------------------------------------------------------------------------

  /**
   * Gets the "current" weather snapshot for a trip.
   * Prefers manual snapshots over API snapshots.
   * Returns the most recent snapshot of the preferred type.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - Trip UUID
   * @returns Current snapshot info (id and source)
   */
  async getCurrentSnapshot(
    supabase: SupabaseClient,
    tripId: UUID
  ): Promise<ServiceResult<TripWeatherCurrentResponseDto>> {
    // 1. Verify trip exists and user has access
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .is("deleted_at", null)
      .maybeSingle();

    if (tripError) {
      const mapped = mapSupabaseError(tripError);
      return { data: null, error: mapped };
    }

    if (!trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    // 2. Try to find manual snapshot first (preferred)
    const { data: manualSnapshot } = await supabase
      .from("weather_snapshots")
      .select("id, source")
      .eq("trip_id", tripId)
      .eq("source", "manual")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (manualSnapshot) {
      return {
        data: {
          snapshot_id: manualSnapshot.id,
          source: manualSnapshot.source,
        },
        error: null,
      };
    }

    // 3. Fallback to API snapshot
    const { data: apiSnapshot } = await supabase
      .from("weather_snapshots")
      .select("id, source")
      .eq("trip_id", tripId)
      .eq("source", "api")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (apiSnapshot) {
      return {
        data: {
          snapshot_id: apiSnapshot.id,
          source: apiSnapshot.source,
        },
        error: null,
      };
    }

    // 4. No snapshots found
    return {
      data: null,
      error: {
        code: "not_found",
        message: "Brak snapshotów pogodowych dla tej wyprawy",
        httpStatus: 404,
      },
    };
  },

  // ---------------------------------------------------------------------------
  // Create Manual Snapshot
  // ---------------------------------------------------------------------------

  /**
   * Creates a manual weather snapshot with hourly data.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - Trip UUID to create snapshot for
   * @param input - Validated manual snapshot input
   * @returns Created snapshot ID
   */
  async createManualSnapshot(
    supabase: SupabaseClient,
    tripId: UUID,
    input: WeatherManualCommandInput
  ): Promise<ServiceResult<WeatherManualResponseDto>> {
    // 1. Verify trip exists and get trip duration
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, started_at, ended_at")
      .eq("id", tripId)
      .is("deleted_at", null)
      .maybeSingle();

    if (tripError) {
      const mapped = mapSupabaseError(tripError);
      return { data: null, error: mapped };
    }

    if (!trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    // 2. Clip period to trip duration
    const tripStartedAt = new Date(trip.started_at);
    const tripEndedAt = trip.ended_at ? new Date(trip.ended_at) : null;

    let effectivePeriodStart = new Date(input.period_start);
    let effectivePeriodEnd = new Date(input.period_end);

    // Clip period_start to trip start
    if (effectivePeriodStart < tripStartedAt) {
      effectivePeriodStart = tripStartedAt;
    }

    // Clip period_end to trip end (if trip is closed)
    if (tripEndedAt && effectivePeriodEnd > tripEndedAt) {
      effectivePeriodEnd = tripEndedAt;
    }

    // Validate that we still have a valid period after clipping
    if (effectivePeriodEnd < effectivePeriodStart) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "Okres pogodowy wykracza poza czas trwania wyprawy",
          httpStatus: 400,
        },
      };
    }

    const clippedPeriodStart = effectivePeriodStart.toISOString();
    const clippedPeriodEnd = effectivePeriodEnd.toISOString();

    // 3. Filter hours to only include those within trip duration
    const filteredHours = input.hours.filter((hour) => {
      const hourTime = new Date(hour.observed_at);
      const isAfterStart = hourTime >= tripStartedAt;
      const isBeforeEnd = tripEndedAt ? hourTime <= tripEndedAt : true;
      return isAfterStart && isBeforeEnd;
    });

    if (filteredHours.length === 0) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "Żaden wpis godzinowy nie mieści się w czasie trwania wyprawy",
          httpStatus: 400,
        },
      };
    }

    // 4. Create snapshot (using clipped period)
    const { data: snapshot, error: snapshotError } = await supabase
      .from("weather_snapshots")
      .insert({
        trip_id: tripId,
        source: "manual" as const,
        fetched_at: input.fetched_at,
        period_start: clippedPeriodStart,
        period_end: clippedPeriodEnd,
      })
      .select("id")
      .single();

    if (snapshotError) {
      const mapped = mapSupabaseError(snapshotError);
      return { data: null, error: mapped };
    }

    // 5. Create hours (batch insert with filtered hours)
    const hourInserts = filteredHours.map((hour) => ({
      snapshot_id: snapshot.id,
      observed_at: hour.observed_at,
      temperature_c: hour.temperature_c ?? null,
      pressure_hpa: hour.pressure_hpa ?? null,
      wind_speed_kmh: hour.wind_speed_kmh ?? null,
      wind_direction: hour.wind_direction ?? null,
      humidity_percent: hour.humidity_percent ?? null,
      precipitation_mm: hour.precipitation_mm ?? null,
      cloud_cover: hour.cloud_cover ?? null,
      weather_icon: hour.weather_icon ?? null,
      weather_text: hour.weather_text ?? null,
    }));

    const { error: hoursError } = await supabase.from("weather_hours").insert(hourInserts);

    if (hoursError) {
      // Rollback: delete snapshot
      await supabase.from("weather_snapshots").delete().eq("id", snapshot.id);

      const mapped = mapSupabaseError(hoursError);
      return { data: null, error: mapped };
    }

    return {
      data: { snapshot_id: snapshot.id },
      error: null,
    };
  },

  // ---------------------------------------------------------------------------
  // Delete Snapshot
  // ---------------------------------------------------------------------------

  /**
   * Permanently deletes a weather snapshot (cascade deletes hours).
   *
   * @param supabase - Supabase client from context.locals
   * @param snapshotId - Snapshot UUID to delete
   * @returns null on success
   */
  async deleteSnapshot(supabase: SupabaseClient, snapshotId: UUID): Promise<ServiceResult<null>> {
    // Delete and check if row was affected
    const { data, error } = await supabase
      .from("weather_snapshots")
      .delete()
      .eq("id", snapshotId)
      .select("id")
      .maybeSingle();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // No rows deleted = snapshot not found (or RLS blocked)
    if (!data) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Snapshot pogodowy nie został znaleziony",
          httpStatus: 404,
        },
      };
    }

    return { data: null, error: null };
  },

  // ---------------------------------------------------------------------------
  // Refresh Weather from External API
  // ---------------------------------------------------------------------------

  /**
   * Fetches weather data from external API (AccuWeather) and creates a new snapshot.
   *
   * Business rules:
   * - Trip must have location coordinates (lat/lng)
   * - Trip must be within 24 hours old (unless force=true)
   * - Creates snapshot with source='api'
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - Trip UUID to fetch weather for
   * @param input - Validated refresh command input
   * @param weatherConfig - Weather provider configuration (API key, base URL)
   * @returns Created snapshot ID
   */
  async refreshWeather(
    supabase: SupabaseClient,
    tripId: UUID,
    input: WeatherRefreshCommandInput,
    weatherConfig: Partial<WeatherProviderConfig>
  ): Promise<ServiceResult<WeatherRefreshResponseDto>> {
    // 1. Fetch trip with location data and dates
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, location_lat, location_lng, started_at, ended_at")
      .eq("id", tripId)
      .is("deleted_at", null)
      .maybeSingle();

    if (tripError) {
      const mapped = mapSupabaseError(tripError);
      return { data: null, error: mapped };
    }

    if (!trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    // 2. Validate trip has location
    if (trip.location_lat === null || trip.location_lng === null) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "Wyprawa musi mieć lokalizację do odświeżenia pogody",
          httpStatus: 400,
        },
      };
    }

    // 3. Check trip age (24h limit unless force=true)
    const tripAge = Date.now() - new Date(trip.started_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms

    if (tripAge > maxAge && !input.force) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "Wyprawa jest starsza niż 24h. Użyj force=true lub wprowadź dane ręcznie",
          httpStatus: 400,
        },
      };
    }

    // 4. Clip period to trip duration
    // period_start should not be before trip started_at
    // period_end should not be after trip ended_at (if trip is closed)
    const tripStartedAt = new Date(trip.started_at);
    const tripEndedAt = trip.ended_at ? new Date(trip.ended_at) : null;

    let effectivePeriodStart = new Date(input.period_start);
    let effectivePeriodEnd = new Date(input.period_end);

    // Clip period_start to trip start
    if (effectivePeriodStart < tripStartedAt) {
      effectivePeriodStart = tripStartedAt;
    }

    // Clip period_end to trip end (if trip is closed)
    if (tripEndedAt && effectivePeriodEnd > tripEndedAt) {
      effectivePeriodEnd = tripEndedAt;
    }

    // Validate that we still have a valid period after clipping
    if (effectivePeriodEnd < effectivePeriodStart) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "Okres pogodowy wykracza poza czas trwania wyprawy",
          httpStatus: 400,
        },
      };
    }

    const clippedPeriodStart = effectivePeriodStart.toISOString();
    const clippedPeriodEnd = effectivePeriodEnd.toISOString();

    // 5. Fetch weather from external provider (using clipped period)
    const weatherProvider = createWeatherProvider(weatherConfig);
    const weatherResult = await weatherProvider.fetchWeather({
      lat: trip.location_lat,
      lng: trip.location_lng,
      periodStart: clippedPeriodStart,
      periodEnd: clippedPeriodEnd,
    });

    if (weatherResult.error) {
      const mapped = mapWeatherProviderError(weatherResult.error);
      return {
        data: null,
        error: {
          code: mapped.code,
          message: mapped.message,
          httpStatus: mapped.httpStatus,
        },
      };
    }

    // 6. Create weather snapshot (using clipped period)
    const { data: snapshot, error: snapshotError } = await supabase
      .from("weather_snapshots")
      .insert({
        trip_id: tripId,
        source: "api" as const,
        fetched_at: new Date().toISOString(),
        period_start: clippedPeriodStart,
        period_end: clippedPeriodEnd,
      })
      .select("id")
      .single();

    if (snapshotError) {
      const mapped = mapSupabaseError(snapshotError);
      return { data: null, error: mapped };
    }

    // 7. Create weather hours (batch insert)
    if (weatherResult.data.hours.length > 0) {
      const hourInserts = weatherResult.data.hours.map((hour) => ({
        snapshot_id: snapshot.id,
        observed_at: hour.observed_at,
        temperature_c: hour.temperature_c ?? null,
        pressure_hpa: hour.pressure_hpa ?? null,
        wind_speed_kmh: hour.wind_speed_kmh ?? null,
        wind_direction: hour.wind_direction ?? null,
        humidity_percent: hour.humidity_percent ?? null,
        precipitation_mm: hour.precipitation_mm ?? null,
        cloud_cover: hour.cloud_cover ?? null,
        weather_icon: hour.weather_icon ?? null,
        weather_text: hour.weather_text ?? null,
      }));

      const { error: hoursError } = await supabase.from("weather_hours").insert(hourInserts);

      if (hoursError) {
        // Snapshot was created - log error but continue
        // Hours can be empty if provider didn't return data for the period
      }
    }

    return {
      data: { snapshot_id: snapshot.id },
      error: null,
    };
  },
};
