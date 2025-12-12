import type { SupabaseClient } from "@/db/supabase.client";
import type { UUID, LastUsedEquipmentResponseDto } from "@/types";
import { mapSupabaseError, type MappedError } from "@/lib/errors/supabase-error-mapper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result wrapper for service operations.
 * Either contains data on success or error details on failure.
 */
type ServiceResult<T> = { data: T; error: null } | { data: null; error: MappedError };

// ---------------------------------------------------------------------------
// Last Used Equipment Service
// ---------------------------------------------------------------------------

/**
 * Service for retrieving equipment from user's last trip.
 *
 * This is a convenience endpoint that supports the "remember last set" feature
 * when creating a new trip, allowing users to quickly copy previously used equipment.
 *
 * Features:
 * - Gets the most recent non-deleted trip for the user
 * - Returns rods, lures, and groundbaits assigned to that trip
 * - Includes historical name snapshots from the time of assignment
 *
 * Security:
 * - RLS policies ensure users can only access their own trips and equipment
 * - All operations use Supabase client from context.locals with user session
 */
export const lastUsedEquipmentService = {
  /**
   * Retrieves equipment from the user's most recent non-deleted trip.
   *
   * @param supabase - Supabase client from context.locals
   * @param userId - User ID from session
   * @returns Equipment data from last trip or not_found error if no trips exist
   */
  async getLastUsedEquipment(
    supabase: SupabaseClient,
    userId: UUID
  ): Promise<ServiceResult<LastUsedEquipmentResponseDto>> {
    // 1. Fetch the user's last non-deleted trip (sorted by started_at DESC)
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tripError) {
      console.error("Error fetching last trip:", tripError);
      const mapped = mapSupabaseError(tripError);
      return { data: null, error: mapped };
    }

    // No trips found for the user
    if (!trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "No trips found for user",
          httpStatus: 404,
        },
      };
    }

    const tripId = trip.id;

    // 2. Fetch equipment from junction tables in parallel for better performance
    const [rodsResult, luresResult, groundbaitsResult] = await Promise.all([
      supabase.from("trip_rods").select("rod_id, rod_name_snapshot").eq("trip_id", tripId),
      supabase.from("trip_lures").select("lure_id, lure_name_snapshot").eq("trip_id", tripId),
      supabase.from("trip_groundbaits").select("groundbait_id, groundbait_name_snapshot").eq("trip_id", tripId),
    ]);

    // 3. Check for errors in equipment queries
    if (rodsResult.error || luresResult.error || groundbaitsResult.error) {
      console.error("Error fetching equipment:", {
        rods: rodsResult.error,
        lures: luresResult.error,
        groundbaits: groundbaitsResult.error,
      });

      // Map the first error encountered
      const firstError = rodsResult.error || luresResult.error || groundbaitsResult.error;
      const mapped = mapSupabaseError(firstError!);
      return { data: null, error: mapped };
    }

    // 4. Build and return the response
    return {
      data: {
        source_trip_id: tripId,
        rods: rodsResult.data ?? [],
        lures: luresResult.data ?? [],
        groundbaits: groundbaitsResult.data ?? [],
      },
      error: null,
    };
  },
};

