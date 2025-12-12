import type { APIRoute } from "astro";
import { tripIdParamSchema, closeTripSchema } from "@/lib/schemas/trip.schema";
import { tripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

/**
 * POST /api/v1/trips/{id}/close
 *
 * Closes a trip by setting status to 'closed' and ended_at timestamp.
 *
 * Path parameters:
 * - id: Trip UUID
 *
 * Request body:
 * - ended_at: Trip end datetime (required, ISO format, must be >= started_at)
 *
 * Returns the updated trip DTO with status='closed'.
 */
export const POST: APIRoute = async ({ params, locals, request }) => {
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

  // 3. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  // 4. Validate body
  const parseResult = closeTripSchema.safeParse(body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 5. Execute service
  const result = await tripService.close(supabase, idResult.data.id, parseResult.data.ended_at);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 6. Return success response
  return createSuccessResponse(result.data);
};
