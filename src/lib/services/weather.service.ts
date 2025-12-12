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
  WeatherSnapshotRow,
} from "@/types";
import type {
  WeatherSnapshotListQuery,
  WeatherSnapshotGetQuery,
  WeatherManualCommandInput,
} from "@/lib/schemas/weather.schema";
import { encodeCursor, decodeCursor } from "@/lib/api/pagination";
import { mapSupabaseError, type MappedError } from "@/lib/errors/supabase-error-mapper";

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

    // 2. Create snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("weather_snapshots")
      .insert({
        trip_id: tripId,
        source: "manual" as const,
        fetched_at: input.fetched_at,
        period_start: input.period_start,
        period_end: input.period_end,
      })
      .select("id")
      .single();

    if (snapshotError) {
      const mapped = mapSupabaseError(snapshotError);
      return { data: null, error: mapped };
    }

    // 3. Create hours (batch insert)
    const hourInserts = input.hours.map((hour) => ({
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
};
