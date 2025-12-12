import type { APIRoute } from "astro";
import { tripEquipmentService } from "@/lib/services/trip-equipment.service";
import { equipmentAssignmentParamsSchema } from "@/lib/schemas/trip-equipment.schema";
import { createErrorResponse, createNoContentResponse } from "@/lib/api/error-response";

/**
 * DELETE /api/v1/trips/{tripId}/lures/{assignmentId}
 *
 * Removes a lure assignment from a trip.
 * Requires authentication. User must own the trip (enforced by RLS).
 *
 * @returns 204 No Content on success
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // 2. Validate path params
  const parseResult = equipmentAssignmentParamsSchema.safeParse(params);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowe parametry", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId, assignmentId } = parseResult.data;

  // 3. Execute service
  const result = await tripEquipmentService.removeTripLure(supabase, tripId, assignmentId);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return 204 No Content
  return createNoContentResponse();
};
