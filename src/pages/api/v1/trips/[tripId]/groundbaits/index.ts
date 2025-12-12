import type { APIRoute } from "astro";
import { tripEquipmentService } from "@/lib/services/trip-equipment.service";
import {
  tripIdParamSchema,
  putTripGroundbaitsSchema,
  postTripGroundbaitsSchema,
} from "@/lib/schemas/trip-equipment.schema";
import { createErrorResponse, createSuccessResponse, createCreatedResponse } from "@/lib/api/error-response";
import type { TripGroundbaitsListResponseDto, TripGroundbaitsPutResponseDto, TripGroundbaitDto } from "@/types";

/**
 * GET /api/v1/trips/{tripId}/groundbaits
 *
 * Lists all groundbaits assigned to a trip.
 * Requires authentication. User must own the trip (enforced by RLS).
 *
 * @returns TripGroundbaitsListResponseDto with array of assigned groundbaits
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
  const result = await tripEquipmentService.listTripGroundbaits(supabase, tripId);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return response
  const response: TripGroundbaitsListResponseDto = { data: result.data };
  return createSuccessResponse(response);
};

/**
 * PUT /api/v1/trips/{tripId}/groundbaits
 *
 * Replaces all groundbaits assigned to a trip (idempotent).
 * Requires authentication. User must own the trip.
 *
 * Request body: { groundbait_ids: UUID[] }
 * @returns TripGroundbaitsPutResponseDto with updated array of assigned groundbaits
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

  const bodyParseResult = putTripGroundbaitsSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;
  const { groundbait_ids } = bodyParseResult.data;

  // 4. Execute service
  const result = await tripEquipmentService.replaceTripGroundbaits(supabase, tripId, groundbait_ids);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return response
  const response: TripGroundbaitsPutResponseDto = { data: result.data };
  return createSuccessResponse(response);
};

/**
 * POST /api/v1/trips/{tripId}/groundbaits
 *
 * Adds a single groundbait to a trip.
 * Requires authentication. User must own the trip.
 *
 * Request body: { groundbait_id: UUID }
 * @returns TripGroundbaitDto of the created assignment (201 Created)
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

  const bodyParseResult = postTripGroundbaitsSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;
  const { groundbait_id } = bodyParseResult.data;

  // 4. Execute service
  const result = await tripEquipmentService.addTripGroundbait(supabase, tripId, groundbait_id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return 201 Created response
  return createCreatedResponse<TripGroundbaitDto>(result.data);
};
