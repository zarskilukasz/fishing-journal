import type { APIRoute } from "astro";
import { weatherService } from "@/lib/services/weather.service";
import { tripIdParamSchema } from "@/lib/schemas/weather.schema";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";
import type { TripWeatherCurrentResponseDto } from "@/types";

/**
 * GET /api/v1/trips/{tripId}/weather/current
 *
 * Gets the "current" weather snapshot for a trip.
 * Preference order:
 * 1. Most recent manual snapshot (if any)
 * 2. Most recent API snapshot (fallback)
 *
 * Returns 404 if no weather snapshots exist for the trip.
 *
 * @returns TripWeatherCurrentResponseDto with snapshot_id and source
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
  const paramParseResult = tripIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID tripId", 400, {
      field: "tripId",
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;

  // 3. Execute service
  const result = await weatherService.getCurrentSnapshot(supabase, tripId);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return response
  return createSuccessResponse<TripWeatherCurrentResponseDto>(result.data);
};
