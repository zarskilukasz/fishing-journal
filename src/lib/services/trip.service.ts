import type { SupabaseClient } from "@/db/supabase.client";
import type {
  UUID,
  TripRow,
  TripDto,
  TripListItemDto,
  TripListResponseDto,
  TripGetResponseDto,
  TripLocationDto,
  QuickStartTripResponseDto,
  TripEquipmentDto,
  WeatherSnapshotSource,
} from "@/types";
import type { TripListQuery, CreateTripInput, UpdateTripInput, TripIncludeValue } from "@/lib/schemas/trip.schema";
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
 * DB row structure for trip with catch count (from aggregate).
 */
interface TripRowWithCatchCount extends TripRow {
  catches: { count: number }[] | null;
}

/**
 * DB row structure for trip detail with optional relations.
 */
interface TripDetailRow extends TripRow {
  trip_rods?: { id: UUID; rod_id: UUID; rod_name_snapshot: string }[];
  trip_lures?: { id: UUID; lure_id: UUID; lure_name_snapshot: string }[];
  trip_groundbaits?: { id: UUID; groundbait_id: UUID; groundbait_name_snapshot: string }[];
  catches?: CatchRowWithSpecies[];
  weather_snapshots?: { id: UUID; source: WeatherSnapshotSource }[];
}

/**
 * Catch row with joined fish species.
 */
interface CatchRowWithSpecies {
  id: UUID;
  caught_at: string;
  weight_g: number | null;
  length_mm: number | null;
  photo_path: string | null;
  lure_id: UUID;
  groundbait_id: UUID;
  lure_name_snapshot: string;
  groundbait_name_snapshot: string;
  fish_species: { id: UUID; name: string } | null;
}

/**
 * Equipment IDs copied from last trip.
 */
interface CopiedEquipment {
  rod_ids: UUID[];
  lure_ids: UUID[];
  groundbait_ids: UUID[];
}

// ---------------------------------------------------------------------------
// Trip Service
// ---------------------------------------------------------------------------

/**
 * Service for managing fishing trips (CRUD + lifecycle operations).
 *
 * Features:
 * - List trips with filtering, pagination, and sorting
 * - Create trips with optional equipment copy from last trip
 * - Quick-start trips (one-click start)
 * - Get trip details with optional relations (catches, equipment, weather)
 * - Update trips (partial)
 * - Close trips (lifecycle operation)
 * - Soft-delete trips
 *
 * Security:
 * - RLS policies ensure users can only access their own trips
 * - All operations use Supabase client from context.locals with user session
 */
export const tripService = {
  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  /**
   * Lists trips with filtering, pagination, and sorting.
   * Includes catch_count summary for each trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of trips with summaries
   */
  async list(supabase: SupabaseClient, params: TripListQuery): Promise<ServiceResult<TripListResponseDto>> {
    const { status, from, to, include_deleted, limit, cursor, sort, order } = params;

    // Build query with catch count aggregation
    let query = supabase.from("trips").select(
      `
        id, user_id, started_at, ended_at, status,
        location_lat, location_lng, location_label,
        deleted_at, created_at, updated_at,
        catches ( count )
      `,
      { count: "exact" }
    );

    // Filters
    if (!include_deleted) {
      query = query.is("deleted_at", null);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (from) {
      query = query.gte("started_at", from);
    }
    if (to) {
      query = query.lte("started_at", to);
    }

    // Sorting (with secondary sort by id for stable pagination)
    query = query.order(sort, { ascending: order === "asc" }).order("id", { ascending: order === "asc" });

    // Cursor-based pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return {
          data: null,
          error: {
            code: "validation_error",
            message: "Invalid cursor format",
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

    // Fetch one extra to check for next page
    query = query.limit(limit + 1);

    const { data, error } = await query;

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // Check if there are more results
    const hasMore = (data?.length ?? 0) > limit;
    const items = hasMore ? (data ?? []).slice(0, limit) : (data ?? []);

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1] as TripRowWithCatchCount;
      nextCursor = encodeCursor({
        sortValue: String(lastItem[sort as keyof TripRow]),
        id: lastItem.id,
      });
    }

    // Map rows to DTOs
    const mappedItems: TripListItemDto[] = (items as TripRowWithCatchCount[]).map((row) => ({
      ...this.mapRowToDto(row),
      summary: {
        catch_count: row.catches?.[0]?.count ?? 0,
      },
    }));

    return {
      data: {
        data: mappedItems,
        page: { limit, next_cursor: nextCursor },
      },
      error: null,
    };
  },

  // ---------------------------------------------------------------------------
  // Get by ID
  // ---------------------------------------------------------------------------

  /**
   * Gets a single trip by ID with optional related data.
   *
   * @param supabase - Supabase client from context.locals
   * @param id - Trip UUID
   * @param includes - Optional array of relations to include
   * @returns Trip data with requested relations
   */
  async getById(
    supabase: SupabaseClient,
    id: UUID,
    includes?: TripIncludeValue[]
  ): Promise<ServiceResult<TripGetResponseDto>> {
    // Build select string based on includes
    const selectParts: string[] = [
      "id, user_id, started_at, ended_at, status, location_lat, location_lng, location_label, deleted_at, created_at, updated_at",
    ];

    const includeSet = new Set(includes ?? []);
    const includeRods = includeSet.has("rods");
    const includeLures = includeSet.has("lures");
    const includeGroundbaits = includeSet.has("groundbaits");
    const includeCatches = includeSet.has("catches");
    const includeWeather = includeSet.has("weather_current");

    if (includeRods) {
      selectParts.push("trip_rods ( id, rod_id, rod_name_snapshot )");
    }
    if (includeLures) {
      selectParts.push("trip_lures ( id, lure_id, lure_name_snapshot )");
    }
    if (includeGroundbaits) {
      selectParts.push("trip_groundbaits ( id, groundbait_id, groundbait_name_snapshot )");
    }
    if (includeCatches) {
      selectParts.push(`
        catches (
          id, caught_at, weight_g, length_mm, photo_path,
          lure_id, groundbait_id, lure_name_snapshot, groundbait_name_snapshot,
          fish_species ( id, name )
        )
      `);
    }
    if (includeWeather) {
      selectParts.push("weather_snapshots ( id, source )");
    }

    const { data, error } = await supabase
      .from("trips")
      .select(selectParts.join(", "))
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116" || !data) {
        return {
          data: null,
          error: {
            code: "not_found",
            message: "Trip not found",
            httpStatus: 404,
          },
        };
      }
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // Cast to proper type for accessing optional relations
    const tripData = data as unknown as TripDetailRow;

    // Build response DTO
    const tripDto = this.mapRowToDto(tripData);
    const response: TripGetResponseDto = { ...tripDto };

    // Add equipment if any equipment includes were requested
    if (includeRods || includeLures || includeGroundbaits) {
      const equipment: TripEquipmentDto = {
        rods: [],
        lures: [],
        groundbaits: [],
      };

      if (includeRods && tripData.trip_rods) {
        equipment.rods = tripData.trip_rods.map((r) => ({
          id: r.rod_id,
          name_snapshot: r.rod_name_snapshot,
        }));
      }
      if (includeLures && tripData.trip_lures) {
        equipment.lures = tripData.trip_lures.map((l) => ({
          id: l.lure_id,
          name_snapshot: l.lure_name_snapshot,
        }));
      }
      if (includeGroundbaits && tripData.trip_groundbaits) {
        equipment.groundbaits = tripData.trip_groundbaits.map((g) => ({
          id: g.groundbait_id,
          name_snapshot: g.groundbait_name_snapshot,
        }));
      }

      response.equipment = equipment;
    }

    // Add catches if requested
    if (includeCatches && tripData.catches) {
      response.catches = tripData.catches.map((c) => ({
        id: c.id,
        caught_at: c.caught_at,
        species: {
          id: c.fish_species?.id ?? "",
          name: c.fish_species?.name ?? "",
        },
        lure: {
          id: c.lure_id,
          name_snapshot: c.lure_name_snapshot,
        },
        groundbait: {
          id: c.groundbait_id,
          name_snapshot: c.groundbait_name_snapshot,
        },
        weight_g: c.weight_g,
        length_mm: c.length_mm,
        photo: {
          path: c.photo_path,
          url: null,
        },
      }));
    }

    // Add weather if requested
    if (includeWeather) {
      if (tripData.weather_snapshots && tripData.weather_snapshots.length > 0) {
        // Get the most recent snapshot
        const latest = tripData.weather_snapshots[0];
        response.weather_current = {
          snapshot_id: latest.id,
          source: latest.source,
        };
      } else {
        response.weather_current = null;
      }
    }

    return { data: response, error: null };
  },

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  /**
   * Creates a new trip with optional equipment copy from last trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param userId - User ID from session
   * @param input - Validated create trip input
   * @returns Created trip DTO
   */
  async create(supabase: SupabaseClient, userId: UUID, input: CreateTripInput): Promise<ServiceResult<TripDto>> {
    const { started_at, ended_at, status, location, copy_equipment_from_last_trip } = input;

    // Prepare insert data
    const insertData: Partial<TripRow> = {
      user_id: userId,
      started_at,
      ended_at: ended_at ?? null,
      status,
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
      location_label: location?.label ?? null,
    };

    const { data, error } = await supabase.from("trips").insert(insertData).select().single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // Copy equipment if requested
    if (copy_equipment_from_last_trip && data) {
      await this.copyEquipmentFromLastTrip(supabase, userId, data.id);
    }

    return { data: this.mapRowToDto(data as TripRow), error: null };
  },

  // ---------------------------------------------------------------------------
  // Quick Start
  // ---------------------------------------------------------------------------

  /**
   * Creates a trip with one click (started_at=now, status=active).
   * Optionally saves GPS location and copies equipment from last trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param userId - User ID from session
   * @param input - Quick start input with optional location and copy_equipment flag
   * @returns Created trip with list of copied equipment IDs
   */
  async quickStart(
    supabase: SupabaseClient,
    userId: UUID,
    input: {
      location?: TripLocationDto | null;
      copy_equipment_from_last_trip: boolean;
    }
  ): Promise<ServiceResult<QuickStartTripResponseDto>> {
    // Create trip with current timestamp and active status
    const insertData: Partial<TripRow> = {
      user_id: userId,
      started_at: new Date().toISOString(),
      ended_at: null,
      status: "active",
      location_lat: input.location?.lat ?? null,
      location_lng: input.location?.lng ?? null,
      location_label: input.location?.label ?? null,
    };

    const { data, error } = await supabase.from("trips").insert(insertData).select().single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // Copy equipment if requested
    let copiedEquipment: CopiedEquipment = {
      rod_ids: [],
      lure_ids: [],
      groundbait_ids: [],
    };

    if (input.copy_equipment_from_last_trip && data) {
      copiedEquipment = await this.copyEquipmentFromLastTrip(supabase, userId, data.id);
    }

    return {
      data: {
        trip: this.mapRowToDto(data as TripRow),
        copied_equipment: copiedEquipment,
      },
      error: null,
    };
  },

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  /**
   * Partially updates a trip.
   * Validates business rules when combined with existing data.
   *
   * @param supabase - Supabase client from context.locals
   * @param id - Trip UUID
   * @param input - Partial update input
   * @returns Updated trip DTO
   */
  async update(supabase: SupabaseClient, id: UUID, input: UpdateTripInput): Promise<ServiceResult<TripDto>> {
    // First, get existing trip to validate business rules
    const { data: existingTrip, error: fetchError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          data: null,
          error: {
            code: "not_found",
            message: "Trip not found",
            httpStatus: 404,
          },
        };
      }
      const mapped = mapSupabaseError(fetchError);
      return { data: null, error: mapped };
    }

    // Merge input with existing data for validation
    const mergedStartedAt = input.started_at ?? existingTrip.started_at;
    const mergedEndedAt = input.ended_at !== undefined ? input.ended_at : existingTrip.ended_at;
    const mergedStatus = input.status ?? existingTrip.status;

    // Validate: ended_at >= started_at
    if (mergedEndedAt && new Date(mergedEndedAt) < new Date(mergedStartedAt)) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "ended_at must be greater than or equal to started_at",
          httpStatus: 400,
        },
      };
    }

    // Validate: status 'closed' requires ended_at
    if (mergedStatus === "closed" && !mergedEndedAt) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "ended_at is required when status is 'closed'",
          httpStatus: 400,
        },
      };
    }

    // Build update object
    const updateData: Partial<TripRow> = {};
    if (input.started_at !== undefined) {
      updateData.started_at = input.started_at;
    }
    if (input.ended_at !== undefined) {
      updateData.ended_at = input.ended_at;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.location !== undefined) {
      updateData.location_lat = input.location?.lat ?? null;
      updateData.location_lng = input.location?.lng ?? null;
      updateData.location_label = input.location?.label ?? null;
    }

    // Perform update
    const { data, error } = await supabase.from("trips").update(updateData).eq("id", id).select().single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: this.mapRowToDto(data as TripRow), error: null };
  },

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  /**
   * Closes a trip (sets status to 'closed' and ended_at).
   *
   * @param supabase - Supabase client from context.locals
   * @param id - Trip UUID
   * @param endedAt - End datetime
   * @returns Closed trip DTO
   */
  async close(supabase: SupabaseClient, id: UUID, endedAt: string): Promise<ServiceResult<TripDto>> {
    // First, get existing trip to validate
    const { data: existingTrip, error: fetchError } = await supabase
      .from("trips")
      .select("started_at")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          data: null,
          error: {
            code: "not_found",
            message: "Trip not found",
            httpStatus: 404,
          },
        };
      }
      const mapped = mapSupabaseError(fetchError);
      return { data: null, error: mapped };
    }

    // Validate: ended_at >= started_at
    if (new Date(endedAt) < new Date(existingTrip.started_at)) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "ended_at must be greater than or equal to started_at",
          httpStatus: 400,
        },
      };
    }

    // Update trip
    const { data, error } = await supabase
      .from("trips")
      .update({
        status: "closed" as const,
        ended_at: endedAt,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: this.mapRowToDto(data as TripRow), error: null };
  },

  // ---------------------------------------------------------------------------
  // Soft Delete
  // ---------------------------------------------------------------------------

  /**
   * Soft-deletes a trip by setting deleted_at timestamp.
   *
   * @param supabase - Supabase client from context.locals
   * @param id - Trip UUID
   * @returns null on success
   */
  async softDelete(supabase: SupabaseClient, id: UUID): Promise<ServiceResult<null>> {
    const { data, error } = await supabase
      .from("trips")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // No rows updated = trip not found
    if (!data) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Trip not found",
          httpStatus: 404,
        },
      };
    }

    return { data: null, error: null };
  },

  // ---------------------------------------------------------------------------
  // Helper: Copy Equipment from Last Trip
  // ---------------------------------------------------------------------------

  /**
   * Copies equipment (rods, lures, groundbaits) from the user's last non-deleted trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param userId - User ID
   * @param newTripId - ID of the newly created trip
   * @returns IDs of copied equipment
   */
  async copyEquipmentFromLastTrip(supabase: SupabaseClient, userId: UUID, newTripId: UUID): Promise<CopiedEquipment> {
    // Find last non-deleted trip (excluding the new one)
    const { data: lastTrip } = await supabase
      .from("trips")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .neq("id", newTripId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastTrip) {
      return { rod_ids: [], lure_ids: [], groundbait_ids: [] };
    }

    // Get equipment from last trip in parallel
    const [rodsResult, luresResult, groundbaitsResult] = await Promise.all([
      supabase.from("trip_rods").select("rod_id, rod_name_snapshot").eq("trip_id", lastTrip.id),
      supabase.from("trip_lures").select("lure_id, lure_name_snapshot").eq("trip_id", lastTrip.id),
      supabase.from("trip_groundbaits").select("groundbait_id, groundbait_name_snapshot").eq("trip_id", lastTrip.id),
    ]);

    const copied: CopiedEquipment = {
      rod_ids: [],
      lure_ids: [],
      groundbait_ids: [],
    };

    // Copy rods
    if (rodsResult.data?.length) {
      const rodInserts = rodsResult.data.map((r) => ({
        trip_id: newTripId,
        rod_id: r.rod_id,
        rod_name_snapshot: r.rod_name_snapshot,
      }));
      await supabase.from("trip_rods").insert(rodInserts);
      copied.rod_ids = rodsResult.data.map((r) => r.rod_id);
    }

    // Copy lures
    if (luresResult.data?.length) {
      const lureInserts = luresResult.data.map((l) => ({
        trip_id: newTripId,
        lure_id: l.lure_id,
        lure_name_snapshot: l.lure_name_snapshot,
      }));
      await supabase.from("trip_lures").insert(lureInserts);
      copied.lure_ids = luresResult.data.map((l) => l.lure_id);
    }

    // Copy groundbaits
    if (groundbaitsResult.data?.length) {
      const groundbaitInserts = groundbaitsResult.data.map((g) => ({
        trip_id: newTripId,
        groundbait_id: g.groundbait_id,
        groundbait_name_snapshot: g.groundbait_name_snapshot,
      }));
      await supabase.from("trip_groundbaits").insert(groundbaitInserts);
      copied.groundbait_ids = groundbaitsResult.data.map((g) => g.groundbait_id);
    }

    return copied;
  },

  // ---------------------------------------------------------------------------
  // Helper: Map DB Row to DTO
  // ---------------------------------------------------------------------------

  /**
   * Maps a TripRow from DB to TripDto for API response.
   * Groups location_* columns into a single location object.
   *
   * @param row - TripRow from database
   * @returns TripDto for API response
   */
  mapRowToDto(row: TripRow): TripDto {
    // Destructure to omit user_id and extract location fields
    const { user_id: _, location_lat, location_lng, location_label, ...rest } = row;
    void _; // Explicitly mark as intentionally unused

    let location: TripLocationDto | null = null;
    if (location_lat !== null && location_lng !== null) {
      location = {
        lat: location_lat,
        lng: location_lng,
        label: location_label,
      };
    }

    return {
      ...rest,
      location,
    };
  },
};
