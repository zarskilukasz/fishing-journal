import type { APIRoute } from "astro";
import { quickStartTripSchema } from "@/lib/schemas/trip.schema";
import { tripService } from "@/lib/services/trip.service";
import { createErrorResponse, createCreatedResponse } from "@/lib/api/error-response";

/**
 * POST /api/v1/trips/quick-start
 *
 * Creates a new trip with one click (started_at=now, status=active).
 * Optionally saves GPS location and copies equipment from the user's last trip.
 *
 * Request body:
 * - location: Optional GPS coordinates (frontend obtains via Geolocation API)
 *   - lat: number (-90 to 90)
 *   - lng: number (-180 to 180)
 *   - label: string | null (optional place name)
 * - copy_equipment_from_last_trip: boolean - Copy equipment from user's last trip
 *
 * Response includes:
 * - trip: The created trip DTO (with location if provided)
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

  // 4. Execute service with location and copy_equipment options
  const result = await tripService.quickStart(supabase, user.id, {
    location: parseResult.data.location ?? null,
    copy_equipment_from_last_trip: parseResult.data.copy_equipment_from_last_trip,
  });

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return created response
  return createCreatedResponse(result.data);
};
