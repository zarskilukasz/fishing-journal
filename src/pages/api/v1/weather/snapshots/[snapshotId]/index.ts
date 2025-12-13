import type { APIRoute } from "astro";
import { weatherService } from "@/lib/services/weather.service";
import { snapshotIdParamSchema, weatherSnapshotGetQuerySchema } from "@/lib/schemas/weather.schema";
import { createErrorResponse, createSuccessResponse, createNoContentResponse } from "@/lib/api/error-response";
import type { WeatherSnapshotGetResponseDto } from "@/types";

/**
 * GET /api/v1/weather/snapshots/{snapshotId}
 *
 * Gets details of a specific weather snapshot.
 * RLS ensures only the trip owner can access their snapshots.
 *
 * Query params:
 * - include_hours: boolean (default false) - include hourly weather data
 *
 * @returns WeatherSnapshotGetResponseDto with snapshot details and optional hours
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // 2. Validate path params
  const paramParseResult = snapshotIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID snapshotId", 400, {
      field: "snapshotId",
      reason: issue?.message,
    });
  }

  // 3. Validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const queryParseResult = weatherSnapshotGetQuerySchema.safeParse(queryParams);
  if (!queryParseResult.success) {
    const issue = queryParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe parametry zapytania", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { snapshotId } = paramParseResult.data;

  // 4. Execute service
  const result = await weatherService.getSnapshotById(supabase, snapshotId, queryParseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return response
  return createSuccessResponse<WeatherSnapshotGetResponseDto>(result.data);
};

/**
 * DELETE /api/v1/weather/snapshots/{snapshotId}
 *
 * Permanently deletes a weather snapshot.
 * Cascade deletes associated weather_hours entries.
 * RLS ensures only the trip owner can delete their snapshots.
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
  const paramParseResult = snapshotIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID snapshotId", 400, {
      field: "snapshotId",
      reason: issue?.message,
    });
  }

  const { snapshotId } = paramParseResult.data;

  // 3. Execute service
  const result = await weatherService.deleteSnapshot(supabase, snapshotId);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return 204 No Content
  return createNoContentResponse();
};
