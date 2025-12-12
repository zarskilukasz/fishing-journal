import type { SupabaseClient } from "@/db/supabase.client";
import type { UUID, TripRodDto, TripLureDto, TripGroundbaitDto } from "@/types";
import { mapSupabaseError, type MappedError } from "@/lib/errors/supabase-error-mapper";

/**
 * Result wrapper for service operations.
 * Either contains data on success or error details on failure.
 */
type ServiceResult<T> = { data: T; error: null } | { data: null; error: MappedError };

/**
 * Service for managing trip equipment assignments (rods, lures, groundbaits).
 * Handles CRUD operations on junction tables (trip_rods, trip_lures, trip_groundbaits).
 *
 * Security:
 * - RLS policies ensure users can only access their own trips
 * - Database triggers validate equipment ownership and soft-delete status
 * - Name snapshots are automatically populated by triggers on insert
 */
export const tripEquipmentService = {
  // ---------------------------------------------------------------------------
  // Helper: Verify trip exists and is accessible
  // ---------------------------------------------------------------------------

  /**
   * Verifies that a trip exists and is accessible by the current user.
   * Uses RLS to automatically check ownership.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - UUID of the trip to verify
   * @returns ServiceResult with trip id or not_found error
   */
  async verifyTripExists(supabase: SupabaseClient, tripId: UUID): Promise<ServiceResult<{ id: UUID }>> {
    const { data: trip, error } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .is("deleted_at", null)
      .single();

    if (error || !trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    return { data: trip, error: null };
  },

  // ---------------------------------------------------------------------------
  // Rods
  // ---------------------------------------------------------------------------

  /**
   * Lists all rods assigned to a trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - UUID of the trip
   * @returns List of TripRodDto or error
   */
  async listTripRods(supabase: SupabaseClient, tripId: UUID): Promise<ServiceResult<TripRodDto[]>> {
    // Verify trip exists first
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripRodDto[]>;
    }

    const { data, error } = await supabase
      .from("trip_rods")
      .select("id, rod_id, rod_name_snapshot, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: data ?? [], error: null };
  },

  /**
   * Replaces all rods assigned to a trip (idempotent PUT operation).
   * Uses diff-based approach to minimize database operations.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - UUID of the trip
   * @param rodIds - Array of rod UUIDs to assign
   * @returns Updated list of TripRodDto or error
   */
  async replaceTripRods(supabase: SupabaseClient, tripId: UUID, rodIds: UUID[]): Promise<ServiceResult<TripRodDto[]>> {
    // Verify trip exists first
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripRodDto[]>;
    }

    // Get current assignments
    const { data: current, error: selectError } = await supabase
      .from("trip_rods")
      .select("rod_id")
      .eq("trip_id", tripId);

    if (selectError) {
      const mapped = mapSupabaseError(selectError);
      return { data: null, error: mapped };
    }

    const currentIds = new Set(current?.map((r) => r.rod_id) ?? []);
    const newIds = new Set(rodIds);

    // Calculate diff
    const toDelete = [...currentIds].filter((id) => !newIds.has(id));
    const toInsert = rodIds.filter((id) => !currentIds.has(id));

    // Delete removed assignments
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("trip_rods")
        .delete()
        .eq("trip_id", tripId)
        .in("rod_id", toDelete);

      if (deleteError) {
        const mapped = mapSupabaseError(deleteError);
        return { data: null, error: mapped };
      }
    }

    // Insert new assignments
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("trip_rods")
        .insert(toInsert.map((rod_id) => ({ trip_id: tripId, rod_id })));

      if (insertError) {
        const mapped = mapSupabaseError(insertError);
        return { data: null, error: mapped };
      }
    }

    // Return updated list
    return this.listTripRods(supabase, tripId);
  },

  /**
   * Adds a single rod to a trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - UUID of the trip
   * @param rodId - UUID of the rod to add
   * @returns Created TripRodDto or error (conflict if already exists)
   */
  async addTripRod(supabase: SupabaseClient, tripId: UUID, rodId: UUID): Promise<ServiceResult<TripRodDto>> {
    // Verify trip exists first
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripRodDto>;
    }

    const { data, error } = await supabase
      .from("trip_rods")
      .insert({ trip_id: tripId, rod_id: rodId })
      .select("id, rod_id, rod_name_snapshot, created_at")
      .single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data, error: null };
  },

  /**
   * Removes a rod assignment from a trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param tripId - UUID of the trip
   * @param assignmentId - UUID of the trip_rods record (not rod_id)
   * @returns null on success or error
   */
  async removeTripRod(supabase: SupabaseClient, tripId: UUID, assignmentId: UUID): Promise<ServiceResult<null>> {
    // Verify trip exists first
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck;
    }

    const { data, error } = await supabase
      .from("trip_rods")
      .delete()
      .eq("id", assignmentId)
      .eq("trip_id", tripId)
      .select("id")
      .maybeSingle();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // No rows deleted = assignment not found
    if (!data) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Przypisanie nie zostało znalezione",
          httpStatus: 404,
        },
      };
    }

    return { data: null, error: null };
  },

  // ---------------------------------------------------------------------------
  // Lures
  // ---------------------------------------------------------------------------

  /**
   * Lists all lures assigned to a trip.
   */
  async listTripLures(supabase: SupabaseClient, tripId: UUID): Promise<ServiceResult<TripLureDto[]>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripLureDto[]>;
    }

    const { data, error } = await supabase
      .from("trip_lures")
      .select("id, lure_id, lure_name_snapshot, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: data ?? [], error: null };
  },

  /**
   * Replaces all lures assigned to a trip (idempotent PUT operation).
   */
  async replaceTripLures(
    supabase: SupabaseClient,
    tripId: UUID,
    lureIds: UUID[]
  ): Promise<ServiceResult<TripLureDto[]>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripLureDto[]>;
    }

    const { data: current, error: selectError } = await supabase
      .from("trip_lures")
      .select("lure_id")
      .eq("trip_id", tripId);

    if (selectError) {
      const mapped = mapSupabaseError(selectError);
      return { data: null, error: mapped };
    }

    const currentIds = new Set(current?.map((r) => r.lure_id) ?? []);
    const newIds = new Set(lureIds);

    const toDelete = [...currentIds].filter((id) => !newIds.has(id));
    const toInsert = lureIds.filter((id) => !currentIds.has(id));

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("trip_lures")
        .delete()
        .eq("trip_id", tripId)
        .in("lure_id", toDelete);

      if (deleteError) {
        const mapped = mapSupabaseError(deleteError);
        return { data: null, error: mapped };
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("trip_lures")
        .insert(toInsert.map((lure_id) => ({ trip_id: tripId, lure_id })));

      if (insertError) {
        const mapped = mapSupabaseError(insertError);
        return { data: null, error: mapped };
      }
    }

    return this.listTripLures(supabase, tripId);
  },

  /**
   * Adds a single lure to a trip.
   */
  async addTripLure(supabase: SupabaseClient, tripId: UUID, lureId: UUID): Promise<ServiceResult<TripLureDto>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripLureDto>;
    }

    const { data, error } = await supabase
      .from("trip_lures")
      .insert({ trip_id: tripId, lure_id: lureId })
      .select("id, lure_id, lure_name_snapshot, created_at")
      .single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data, error: null };
  },

  /**
   * Removes a lure assignment from a trip.
   */
  async removeTripLure(supabase: SupabaseClient, tripId: UUID, assignmentId: UUID): Promise<ServiceResult<null>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck;
    }

    const { data, error } = await supabase
      .from("trip_lures")
      .delete()
      .eq("id", assignmentId)
      .eq("trip_id", tripId)
      .select("id")
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
          message: "Przypisanie nie zostało znalezione",
          httpStatus: 404,
        },
      };
    }

    return { data: null, error: null };
  },

  // ---------------------------------------------------------------------------
  // Groundbaits
  // ---------------------------------------------------------------------------

  /**
   * Lists all groundbaits assigned to a trip.
   */
  async listTripGroundbaits(supabase: SupabaseClient, tripId: UUID): Promise<ServiceResult<TripGroundbaitDto[]>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripGroundbaitDto[]>;
    }

    const { data, error } = await supabase
      .from("trip_groundbaits")
      .select("id, groundbait_id, groundbait_name_snapshot, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: data ?? [], error: null };
  },

  /**
   * Replaces all groundbaits assigned to a trip (idempotent PUT operation).
   */
  async replaceTripGroundbaits(
    supabase: SupabaseClient,
    tripId: UUID,
    groundbaitIds: UUID[]
  ): Promise<ServiceResult<TripGroundbaitDto[]>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripGroundbaitDto[]>;
    }

    const { data: current, error: selectError } = await supabase
      .from("trip_groundbaits")
      .select("groundbait_id")
      .eq("trip_id", tripId);

    if (selectError) {
      const mapped = mapSupabaseError(selectError);
      return { data: null, error: mapped };
    }

    const currentIds = new Set(current?.map((r) => r.groundbait_id) ?? []);
    const newIds = new Set(groundbaitIds);

    const toDelete = [...currentIds].filter((id) => !newIds.has(id));
    const toInsert = groundbaitIds.filter((id) => !currentIds.has(id));

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("trip_groundbaits")
        .delete()
        .eq("trip_id", tripId)
        .in("groundbait_id", toDelete);

      if (deleteError) {
        const mapped = mapSupabaseError(deleteError);
        return { data: null, error: mapped };
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("trip_groundbaits")
        .insert(toInsert.map((groundbait_id) => ({ trip_id: tripId, groundbait_id })));

      if (insertError) {
        const mapped = mapSupabaseError(insertError);
        return { data: null, error: mapped };
      }
    }

    return this.listTripGroundbaits(supabase, tripId);
  },

  /**
   * Adds a single groundbait to a trip.
   */
  async addTripGroundbait(
    supabase: SupabaseClient,
    tripId: UUID,
    groundbaitId: UUID
  ): Promise<ServiceResult<TripGroundbaitDto>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck as ServiceResult<TripGroundbaitDto>;
    }

    const { data, error } = await supabase
      .from("trip_groundbaits")
      .insert({ trip_id: tripId, groundbait_id: groundbaitId })
      .select("id, groundbait_id, groundbait_name_snapshot, created_at")
      .single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data, error: null };
  },

  /**
   * Removes a groundbait assignment from a trip.
   */
  async removeTripGroundbait(supabase: SupabaseClient, tripId: UUID, assignmentId: UUID): Promise<ServiceResult<null>> {
    const tripCheck = await this.verifyTripExists(supabase, tripId);
    if (tripCheck.error) {
      return tripCheck;
    }

    const { data, error } = await supabase
      .from("trip_groundbaits")
      .delete()
      .eq("id", assignmentId)
      .eq("trip_id", tripId)
      .select("id")
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
          message: "Przypisanie nie zostało znalezione",
          httpStatus: 404,
        },
      };
    }

    return { data: null, error: null };
  },
};
