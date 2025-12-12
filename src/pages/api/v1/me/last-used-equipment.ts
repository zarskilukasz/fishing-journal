import type { APIRoute } from "astro";
import { lastUsedEquipmentService } from "@/lib/services/last-used-equipment.service";
import { createErrorResponse } from "@/lib/api/error-response";

export const prerender = false;

/**
 * GET /api/v1/me/last-used-equipment
 *
 * Convenience endpoint that returns the equipment selection from the user's
 * most recent non-deleted trip. Supports the "remember last set" feature
 * when creating a new trip.
 *
 * Authentication:
 * - Requires valid JWT token in Authorization header
 *
 * Response (200 OK):
 * - source_trip_id: UUID of the last trip
 * - rods: Array of { rod_id, rod_name_snapshot }
 * - lures: Array of { lure_id, lure_name_snapshot }
 * - groundbaits: Array of { groundbait_id, groundbait_name_snapshot }
 *
 * Errors:
 * - 401: Authentication required
 * - 404: No trips found for user
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Execute service to get last used equipment
  const result = await lastUsedEquipmentService.getLastUsedEquipment(supabase, user.id);

  // 3. Handle errors
  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return success response with cache headers
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=300", // 5 min cache
    },
  });
};
