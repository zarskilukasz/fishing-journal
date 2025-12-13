import type { APIRoute } from "astro";
import { weatherService } from "@/lib/services/weather.service";
import { tripIdParamSchema, weatherRefreshCommandSchema } from "@/lib/schemas/weather.schema";
import { createErrorResponse, createCreatedResponse } from "@/lib/api/error-response";
import type { WeatherRefreshResponseDto } from "@/types";

/**
 * POST /api/v1/trips/{tripId}/weather/refresh
 *
 * Fetches weather data from external API (AccuWeather) and creates a new snapshot.
 *
 * Business rules:
 * - Trip must exist and belong to the authenticated user
 * - Trip must have location coordinates (lat/lng)
 * - Trip must be within 24 hours old (unless force=true)
 *
 * Request body:
 * - period_start: ISO datetime - start of weather period
 * - period_end: ISO datetime - end of weather period (must be >= period_start)
 * - force: boolean (optional, default false) - force refresh for older trips
 *
 * @returns WeatherRefreshResponseDto with created snapshot_id (201 Created)
 *
 * Error codes:
 * - 400 validation_error: Invalid input, missing location, or trip too old
 * - 401 unauthorized: Not authenticated
 * - 404 not_found: Trip not found
 * - 429 rate_limited: Weather provider rate limit exceeded
 * - 502 bad_gateway: Weather provider error
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
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID tripId", 400, {
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

  // 4. Validate request body
  const bodyParseResult = weatherRefreshCommandSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;

  // 5. Execute service
  const result = await weatherService.refreshWeather(supabase, tripId, bodyParseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 6. Return 201 Created response
  return createCreatedResponse<WeatherRefreshResponseDto>(result.data);
};
