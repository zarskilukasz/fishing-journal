import type { APIRoute } from "astro";
import { quickStartTripSchema } from "@/lib/schemas/trip.schema";
import { tripService } from "@/lib/services/trip.service";
import { createErrorResponse, createCreatedResponse } from "@/lib/api/error-response";

/**
 * POST /api/v1/trips/quick-start
 *
 * Creates a new trip with one click (started_at=now, status=active).
 * Optionally copies equipment from the user's last trip.
 *
 * Request body:
 * - use_gps: Whether to use GPS location (handled by frontend, backend ignores)
 * - copy_equipment_from_last_trip: Copy equipment from user's last trip
 *
 * Response includes:
 * - trip: The created trip DTO
 * - copied_equipment: Object with arrays of copied rod_ids, lure_ids, groundbait_ids
 */
export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  // 3. Validate body
  const parseResult = quickStartTripSchema.safeParse(body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 4. Execute service (use_gps is frontend concern, we only care about copy_equipment)
  const result = await tripService.quickStart(supabase, user.id, {
    copy_equipment_from_last_trip: parseResult.data.copy_equipment_from_last_trip,
  });

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return created response
  return createCreatedResponse(result.data);
};
