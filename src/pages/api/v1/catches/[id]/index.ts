import type { APIRoute } from "astro";
import { catchService } from "@/lib/services/catch.service";
import { catchIdParamSchema, updateCatchSchema, checkForbiddenSnapshotFields } from "@/lib/schemas/catch.schema";
import { createErrorResponse, createSuccessResponse, createNoContentResponse } from "@/lib/api/error-response";
import type { CatchDto } from "@/types";

/**
 * GET /api/v1/catches/{id}
 *
 * Gets details of a single catch.
 * Requires authentication. User must own the trip containing this catch (enforced by RLS).
 *
 * @returns CatchDto with full catch details
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
  const paramParseResult = catchIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID", 400, {
      field: "id",
      reason: issue?.message,
    });
  }

  const { id } = paramParseResult.data;

  // 3. Execute service
  const result = await catchService.getById(supabase, id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return response
  return createSuccessResponse<CatchDto>(result.data);
};

/**
 * PATCH /api/v1/catches/{id}
 *
 * Partially updates a catch.
 * Requires authentication. User must own the trip containing this catch.
 *
 * Request body (all fields optional):
 * - caught_at: ISO datetime - when the fish was caught (must be within trip date range)
 * - species_id: UUID - fish species
 * - lure_id: UUID - lure used (must belong to user, not soft-deleted; updates snapshot automatically)
 * - groundbait_id: UUID - groundbait used (must belong to user, not soft-deleted; updates snapshot automatically)
 * - weight_g: number | null - weight in grams (must be positive, or null to clear)
 * - length_mm: number | null - length in millimeters (must be positive, or null to clear)
 * - photo_path: string | null - path to photo in storage (or null to remove)
 *
 * Note: lure_name_snapshot and groundbait_name_snapshot are NOT accepted.
 * If lure_id or groundbait_id is changed, snapshots are updated automatically by DB triggers.
 *
 * @returns CatchDto with updated catch data
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // 2. Validate path params
  const paramParseResult = catchIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID", 400, {
      field: "id",
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
  const bodyParseResult = updateCatchSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  // 6. Check if body is empty (no fields to update)
  if (Object.keys(bodyParseResult.data).length === 0) {
    return createErrorResponse("validation_error", "Brak pól do aktualizacji", 400);
  }

  const { id } = paramParseResult.data;

  // 7. Execute service
  const result = await catchService.update(supabase, id, bodyParseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 8. Return response
  return createSuccessResponse<CatchDto>(result.data);
};

/**
 * DELETE /api/v1/catches/{id}
 *
 * Permanently deletes a catch (hard delete).
 * Requires authentication. User must own the trip containing this catch.
 *
 * Note: Unlike trips and equipment, catches use hard delete (no soft-delete).
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
  const paramParseResult = catchIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID", 400, {
      field: "id",
      reason: issue?.message,
    });
  }

  const { id } = paramParseResult.data;

  // 3. Execute service
  const result = await catchService.delete(supabase, id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return 204 No Content
  return createNoContentResponse();
};
