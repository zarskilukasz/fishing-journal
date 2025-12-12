import type { APIRoute } from "astro";
import { weatherService } from "@/lib/services/weather.service";
import { tripIdParamSchema, weatherManualCommandSchema } from "@/lib/schemas/weather.schema";
import { createErrorResponse, createCreatedResponse } from "@/lib/api/error-response";
import type { WeatherManualResponseDto } from "@/types";

/**
 * POST /api/v1/trips/{tripId}/weather/manual
 *
 * Creates a manual weather snapshot with hourly data.
 * Use this to enter weather data manually when automatic API refresh is not available.
 *
 * Request body:
 * - fetched_at: ISO datetime - when the data was fetched/entered
 * - period_start: ISO datetime - start of weather period
 * - period_end: ISO datetime - end of weather period (must be >= period_start)
 * - hours: array of hourly weather entries (min 1 entry)
 *   - observed_at: ISO datetime (required)
 *   - temperature_c: number | null (-100 to 100)
 *   - pressure_hpa: integer | null (800 to 1200)
 *   - wind_speed_kmh: number | null (>= 0)
 *   - wind_direction: integer | null (0 to 360)
 *   - humidity_percent: integer | null (0 to 100)
 *   - precipitation_mm: number | null (>= 0)
 *   - cloud_cover: integer | null (0 to 100)
 *   - weather_icon: string | null (max 50 chars)
 *   - weather_text: string | null (max 255 chars)
 *
 * @returns WeatherManualResponseDto with created snapshot_id
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
  const bodyParseResult = weatherManualCommandSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;

  // 5. Execute service
  const result = await weatherService.createManualSnapshot(supabase, tripId, bodyParseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 6. Return 201 Created response
  return createCreatedResponse<WeatherManualResponseDto>(result.data);
};
