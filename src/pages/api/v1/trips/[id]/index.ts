import type { APIRoute } from "astro";
import { tripIdParamSchema, tripGetQuerySchema, updateTripSchema } from "@/lib/schemas/trip.schema";
import { tripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse, createNoContentResponse } from "@/lib/api/error-response";

/**
 * GET /api/v1/trips/{id}
 *
 * Gets trip details with optional related data.
 *
 * Path parameters:
 * - id: Trip UUID
 *
 * Query parameters:
 * - include: Comma-separated list of relations to include
 *   (catches, rods, lures, groundbaits, weather_current)
 *
 * Response includes equipment grouped in an object, catches as array,
 * and weather_current as the latest weather snapshot.
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
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

  // 3. Validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const queryResult = tripGetQuerySchema.safeParse(queryParams);
  if (!queryResult.success) {
    const firstIssue = queryResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 4. Execute service
  const result = await tripService.getById(supabase, idResult.data.id, queryResult.data.include);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return success response
  return createSuccessResponse(result.data);
};

/**
 * PATCH /api/v1/trips/{id}
 *
 * Partially updates a trip.
 *
 * Path parameters:
 * - id: Trip UUID
 *
 * Request body (all fields optional):
 * - started_at: Trip start datetime
 * - ended_at: Trip end datetime (null to clear)
 * - status: Trip status (draft, active, closed)
 * - location: Location object or null
 *
 * Business rules (validated with existing data):
 * - ended_at must be >= started_at
 * - status 'closed' requires ended_at
 */
export const PATCH: APIRoute = async ({ params, locals, request }) => {
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
  const parseResult = updateTripSchema.safeParse(body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 5. Execute service
  const result = await tripService.update(supabase, idResult.data.id, parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 6. Return success response
  return createSuccessResponse(result.data);
};

/**
 * DELETE /api/v1/trips/{id}
 *
 * Soft-deletes a trip by setting deleted_at timestamp.
 *
 * Path parameters:
 * - id: Trip UUID
 *
 * Returns 204 No Content on success.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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
  const result = await tripService.softDelete(supabase, idResult.data.id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return no content response
  return createNoContentResponse();
};
