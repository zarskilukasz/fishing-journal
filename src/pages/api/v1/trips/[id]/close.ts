import type { APIRoute } from "astro";
import { tripIdParamSchema } from "@/lib/schemas/trip.schema";
import { tripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

/**
 * POST /api/v1/trips/{id}/close
 *
 * Closes a trip by setting status to 'closed'.
 * Note: ended_at is NOT modified here - it can only be set through the trip edit page.
 *
 * Path parameters:
 * - id: Trip UUID
 *
 * Returns the updated trip DTO with status='closed'.
 */
export const POST: APIRoute = async ({ params, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Validate path param
  const idResult = tripIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid UUID format", 400, {
      field: "id",
      reason: "Must be a valid UUID",
    });
  }

  // 3. Execute service
  const result = await tripService.close(supabase, idResult.data.id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};
