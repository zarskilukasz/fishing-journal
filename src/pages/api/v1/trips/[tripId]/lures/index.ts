import type { APIRoute } from "astro";
import { tripEquipmentService } from "@/lib/services/trip-equipment.service";
import { tripIdParamSchema, putTripLuresSchema, postTripLuresSchema } from "@/lib/schemas/trip-equipment.schema";
import { createErrorResponse, createSuccessResponse, createCreatedResponse } from "@/lib/api/error-response";
import type { TripLuresListResponseDto, TripLuresPutResponseDto, TripLureDto } from "@/types";

/**
 * GET /api/v1/trips/{tripId}/lures
 *
 * Lists all lures assigned to a trip.
 * Requires authentication. User must own the trip (enforced by RLS).
 *
 * @returns TripLuresListResponseDto with array of assigned lures
 */
export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // 2. Validate path params
  const parseResult = tripIdParamSchema.safeParse(params);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy tripId", 400, {
      field: "tripId",
      reason: issue?.message,
    });
  }

  const { tripId } = parseResult.data;

  // 3. Execute service
  const result = await tripEquipmentService.listTripLures(supabase, tripId);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return response
  const response: TripLuresListResponseDto = { data: result.data };
  return createSuccessResponse(response);
};

/**
 * PUT /api/v1/trips/{tripId}/lures
 *
 * Replaces all lures assigned to a trip (idempotent).
 * Requires authentication. User must own the trip.
 *
 * Request body: { lure_ids: UUID[] }
 * @returns TripLuresPutResponseDto with updated array of assigned lures
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // 2. Validate path params
  const paramParseResult = tripIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy tripId", 400, {
      field: "tripId",
      reason: issue?.message,
    });
  }

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Nieprawidłowy JSON", 400);
  }

  const bodyParseResult = putTripLuresSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;
  const { lure_ids } = bodyParseResult.data;

  // 4. Execute service
  const result = await tripEquipmentService.replaceTripLures(supabase, tripId, lure_ids);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return response
  const response: TripLuresPutResponseDto = { data: result.data };
  return createSuccessResponse(response);
};

/**
 * POST /api/v1/trips/{tripId}/lures
 *
 * Adds a single lure to a trip.
 * Requires authentication. User must own the trip.
 *
 * Request body: { lure_id: UUID }
 * @returns TripLureDto of the created assignment (201 Created)
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // 2. Validate path params
  const paramParseResult = tripIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy tripId", 400, {
      field: "tripId",
      reason: issue?.message,
    });
  }

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Nieprawidłowy JSON", 400);
  }

  const bodyParseResult = postTripLuresSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;
  const { lure_id } = bodyParseResult.data;

  // 4. Execute service
  const result = await tripEquipmentService.addTripLure(supabase, tripId, lure_id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return 201 Created response
  return createCreatedResponse<TripLureDto>(result.data);
};
