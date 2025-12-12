import type { SupabaseClient } from "@/db/supabase.client";
import type { UUID, CatchDto, CatchListResponseDto, CatchRow } from "@/types";
import type { CatchListQuery, CreateCatchInput, UpdateCatchInput } from "@/lib/schemas/catch.schema";
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
 * Trip date range for caught_at validation.
 */
interface TripDateRange {
  started_at: string;
  ended_at: string | null;
}

/**
 * Catch row with joined trip for date validation.
 */
interface CatchRowWithTrip extends CatchRow {
  trips: TripDateRange;
}

// ---------------------------------------------------------------------------
// Catch Service
// ---------------------------------------------------------------------------

/**
 * Service for managing catches (fish caught during trips).
 *
 * Features:
 * - List catches for a trip with filtering, pagination, and sorting
 * - Create catches with caught_at validation against trip date range
 * - Get individual catch details
 * - Update catches with partial data
 * - Hard delete catches (no soft-delete for catches)
 *
 * Security:
 * - RLS policies ensure users can only access catches from their own trips
 * - DB triggers validate lure/groundbait ownership and soft-delete status
 * - DB triggers automatically populate lure_name_snapshot and groundbait_name_snapshot
 */
export const catchService = {
  // ---------------------------------------------------------------------------
  // List by Trip ID
  // ---------------------------------------------------------------------------

  /**
   * Lists catches for a specific trip with filtering, pagination, and sorting.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - Trip UUID to list catches for
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of catches
   */
  async listByTripId(
    supabase: SupabaseClient,
    tripId: UUID,
    params: CatchListQuery
  ): Promise<ServiceResult<CatchListResponseDto>> {
    const { from, to, species_id, limit, cursor, sort, order } = params;

    // 1. Verify trip exists and user has access (RLS handles ownership)
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .is("deleted_at", null)
      .single();

    if (tripError || !trip) {
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
    let query = supabase.from("catches").select("*").eq("trip_id", tripId);

    // 3. Apply filters
    if (from) {
      query = query.gte("caught_at", from);
    }
    if (to) {
      query = query.lte("caught_at", to);
    }
    if (species_id) {
      query = query.eq("species_id", species_id);
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
      const lastItem = items[items.length - 1] as CatchRow;
      nextCursor = encodeCursor({
        sortValue: String(lastItem[sort as keyof CatchRow]),
        id: lastItem.id,
      });
    }

    return {
      data: {
        data: items as CatchDto[],
        page: { limit, next_cursor: nextCursor },
      },
      error: null,
    };
  },

  // ---------------------------------------------------------------------------
  // Get by ID
  // ---------------------------------------------------------------------------

  /**
   * Gets a single catch by ID.
   *
   * @param supabase - Supabase client from context.locals
   * @param id - Catch UUID
   * @returns Catch data
   */
  async getById(supabase: SupabaseClient, id: UUID): Promise<ServiceResult<CatchDto>> {
    const { data, error } = await supabase.from("catches").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          data: null,
          error: {
            code: "not_found",
            message: "Połów nie został znaleziony",
            httpStatus: 404,
          },
        };
      }
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    if (!data) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Połów nie został znaleziony",
          httpStatus: 404,
        },
      };
    }

    return { data: data as CatchDto, error: null };
  },

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  /**
   * Creates a new catch for a trip.
   * Validates that caught_at is within the trip date range.
   * DB triggers automatically populate snapshot fields and validate equipment ownership.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - Trip UUID to create catch for
   * @param input - Validated create catch input
   * @returns Created catch DTO
   */
  async create(supabase: SupabaseClient, tripId: UUID, input: CreateCatchInput): Promise<ServiceResult<CatchDto>> {
    // 1. Get trip date range for caught_at validation
    const tripRange = await this.getTripDateRange(supabase, tripId);
    if (!tripRange) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    // 2. Validate caught_at is within trip date range
    const rangeValidation = this.validateCaughtAtInTripRange(input.caught_at, tripRange.started_at, tripRange.ended_at);
    if (!rangeValidation.valid) {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: `caught_at ${rangeValidation.reason}`,
          httpStatus: 400,
        },
      };
    }

    // 3. Insert catch (without snapshot fields - DB trigger fills them)
    const { data, error } = await supabase
      .from("catches")
      .insert({
        trip_id: tripId,
        caught_at: input.caught_at,
        species_id: input.species_id,
        lure_id: input.lure_id,
        groundbait_id: input.groundbait_id,
        weight_g: input.weight_g ?? null,
        length_mm: input.length_mm ?? null,
      })
      .select()
      .single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: data as CatchDto, error: null };
  },

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  /**
   * Partially updates a catch.
   * If caught_at is being changed, validates against trip date range.
   * DB triggers automatically update snapshot fields if lure_id/groundbait_id is changed.
   *
   * @param supabase - Supabase client from context.locals
   * @param id - Catch UUID to update
   * @param input - Partial update input
   * @returns Updated catch DTO
   */
  async update(supabase: SupabaseClient, id: UUID, input: UpdateCatchInput): Promise<ServiceResult<CatchDto>> {
    // 1. Get existing catch with trip info for validation
    const { data: existingCatch, error: fetchError } = await supabase
      .from("catches")
      .select(
        `
        *,
        trips!inner ( started_at, ended_at )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          data: null,
          error: {
            code: "not_found",
            message: "Połów nie został znaleziony",
            httpStatus: 404,
          },
        };
      }
      const mapped = mapSupabaseError(fetchError);
      return { data: null, error: mapped };
    }

    if (!existingCatch) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Połów nie został znaleziony",
          httpStatus: 404,
        },
      };
    }

    const catchWithTrip = existingCatch as unknown as CatchRowWithTrip;

    // 2. If caught_at is being updated, validate range
    if (input.caught_at !== undefined) {
      const rangeValidation = this.validateCaughtAtInTripRange(
        input.caught_at,
        catchWithTrip.trips.started_at,
        catchWithTrip.trips.ended_at
      );
      if (!rangeValidation.valid) {
        return {
          data: null,
          error: {
            code: "validation_error",
            message: `caught_at ${rangeValidation.reason}`,
            httpStatus: 400,
          },
        };
      }
    }

    // 3. Build update payload (only include defined fields)
    const updatePayload: Partial<CatchRow> = {};
    if (input.caught_at !== undefined) updatePayload.caught_at = input.caught_at;
    if (input.species_id !== undefined) updatePayload.species_id = input.species_id;
    if (input.lure_id !== undefined) updatePayload.lure_id = input.lure_id;
    if (input.groundbait_id !== undefined) updatePayload.groundbait_id = input.groundbait_id;
    if (input.weight_g !== undefined) updatePayload.weight_g = input.weight_g;
    if (input.length_mm !== undefined) updatePayload.length_mm = input.length_mm;
    if (input.photo_path !== undefined) updatePayload.photo_path = input.photo_path;

    // 4. Update (DB trigger will update snapshots if lure_id/groundbait_id changed)
    const { data, error } = await supabase.from("catches").update(updatePayload).eq("id", id).select().single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: data as CatchDto, error: null };
  },

  // ---------------------------------------------------------------------------
  // Delete (Hard Delete)
  // ---------------------------------------------------------------------------

  /**
   * Permanently deletes a catch (hard delete - no soft-delete for catches).
   *
   * @param supabase - Supabase client from context.locals
   * @param id - Catch UUID to delete
   * @returns null on success
   */
  async delete(supabase: SupabaseClient, id: UUID): Promise<ServiceResult<null>> {
    // Delete and check if row was affected
    const { data, error } = await supabase.from("catches").delete().eq("id", id).select("id").maybeSingle();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // No rows deleted = catch not found (or RLS blocked)
    if (!data) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Połów nie został znaleziony",
          httpStatus: 404,
        },
      };
    }

    return { data: null, error: null };
  },

  // ---------------------------------------------------------------------------
  // Helper: Get Trip Date Range
  // ---------------------------------------------------------------------------

  /**
   * Fetches the date range of a trip for caught_at validation.
   *
   * @param supabase - Supabase client
   * @param tripId - Trip UUID
   * @returns Trip date range or null if not found
   */
  async getTripDateRange(supabase: SupabaseClient, tripId: UUID): Promise<TripDateRange | null> {
    const { data, error } = await supabase
      .from("trips")
      .select("started_at, ended_at")
      .eq("id", tripId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      started_at: data.started_at,
      ended_at: data.ended_at,
    };
  },

  // ---------------------------------------------------------------------------
  // Helper: Validate caught_at in Trip Range
  // ---------------------------------------------------------------------------

  /**
   * Validates that caught_at is within the trip's date range.
   *
   * @param caughtAt - The caught_at datetime to validate
   * @param tripStartedAt - Trip start datetime
   * @param tripEndedAt - Trip end datetime (null if ongoing)
   * @returns Validation result with reason if invalid
   */
  validateCaughtAtInTripRange(
    caughtAt: string,
    tripStartedAt: string,
    tripEndedAt: string | null
  ): { valid: boolean; reason?: string } {
    const caught = new Date(caughtAt);
    const started = new Date(tripStartedAt);

    // caught_at must be >= started_at
    if (caught < started) {
      return {
        valid: false,
        reason: "musi być równe lub późniejsze niż started_at wyprawy",
      };
    }

    // If trip has ended, caught_at must be <= ended_at
    if (tripEndedAt !== null) {
      const ended = new Date(tripEndedAt);
      if (caught > ended) {
        return {
          valid: false,
          reason: "musi być równe lub wcześniejsze niż ended_at wyprawy",
        };
      }
    }

    return { valid: true };
  },
};
