import type { APIRoute } from "astro";
import { catchService } from "@/lib/services/catch.service";
import {
  tripIdParamSchema,
  catchListQuerySchema,
  createCatchSchema,
  checkForbiddenSnapshotFields,
} from "@/lib/schemas/catch.schema";
import { createErrorResponse, createSuccessResponse, createCreatedResponse } from "@/lib/api/error-response";
import type { CatchListResponseDto, CatchDto } from "@/types";

/**
 * GET /api/v1/trips/{tripId}/catches
 *
 * Lists all catches for a specific trip with filtering, pagination, and sorting.
 * Requires authentication. User must own the trip (enforced by RLS).
 *
 * Query params:
 * - from: ISO datetime - filter catches caught on or after this time
 * - to: ISO datetime - filter catches caught on or before this time
 * - species_id: UUID - filter by fish species
 * - limit: number (1-100, default 20) - results per page
 * - cursor: string - pagination cursor
 * - sort: "caught_at" | "created_at" (default "caught_at")
 * - order: "asc" | "desc" (default "desc")
 *
 * @returns CatchListResponseDto with paginated array of catches
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
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

  // 3. Parse and validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const queryParseResult = catchListQuerySchema.safeParse(queryParams);
  if (!queryParseResult.success) {
    const issue = queryParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe parametry", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;

  // 4. Execute service
  const result = await catchService.listByTripId(supabase, tripId, queryParseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return response
  return createSuccessResponse<CatchListResponseDto>(result.data);
};

/**
 * POST /api/v1/trips/{tripId}/catches
 *
 * Creates a new catch for a trip.
 * Requires authentication. User must own the trip.
 *
 * Request body:
 * - caught_at: ISO datetime (required) - when the fish was caught (must be within trip date range)
 * - species_id: UUID (required) - fish species
 * - lure_id: UUID (required) - lure used (must belong to user, not soft-deleted)
 * - groundbait_id: UUID (required) - groundbait used (must belong to user, not soft-deleted)
 * - weight_g: number (optional) - weight in grams (must be positive)
 * - length_mm: number (optional) - length in millimeters (must be positive)
 *
 * Note: lure_name_snapshot and groundbait_name_snapshot are NOT accepted.
 * These are automatically populated by database triggers.
 *
 * @returns CatchDto of the created catch (201 Created)
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

  // 3. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Nieprawidłowy JSON", 400);
  }

  // 4. Check for forbidden snapshot fields
  const forbiddenField = checkForbiddenSnapshotFields(body);
  if (forbiddenField) {
    return createErrorResponse(
      "validation_error",
      `Pole ${forbiddenField} nie może być ustawione ręcznie - jest automatycznie wypełniane przez bazę danych`,
      400,
      { field: forbiddenField }
    );
  }

  // 5. Validate request body
  const bodyParseResult = createCatchSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;

  // 6. Execute service
  const result = await catchService.create(supabase, tripId, bodyParseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 7. Return 201 Created response
  return createCreatedResponse<CatchDto>(result.data);
};
