import type { APIRoute } from "astro";
import { weatherService } from "@/lib/services/weather.service";
import { tripIdParamSchema, weatherSnapshotListQuerySchema } from "@/lib/schemas/weather.schema";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";
import type { WeatherSnapshotListResponseDto } from "@/types";

/**
 * GET /api/v1/trips/{tripId}/weather/snapshots
 *
 * Lists weather snapshots for a specific trip.
 * Supports filtering by source (api/manual), pagination, and sorting.
 *
 * Query parameters:
 * - source: Filter by source (optional, "api" | "manual")
 * - limit: Results per page (optional, 1-100, default 20)
 * - cursor: Pagination cursor (optional, opaque string)
 * - sort: Sort field (optional, "fetched_at" | "created_at", default "fetched_at")
 * - order: Sort direction (optional, "asc" | "desc", default "desc")
 *
 * @returns WeatherSnapshotListResponseDto with paginated snapshots
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
  const paramParseResult = tripIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID tripId", 400, {
      field: "tripId",
      reason: issue?.message,
    });
  }

  // 3. Validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const queryParseResult = weatherSnapshotListQuerySchema.safeParse(queryParams);
  if (!queryParseResult.success) {
    const issue = queryParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe parametry zapytania", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;

  // 4. Execute service
  const result = await weatherService.listSnapshots(supabase, tripId, queryParseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return response
  return createSuccessResponse<WeatherSnapshotListResponseDto>(result.data);
};
