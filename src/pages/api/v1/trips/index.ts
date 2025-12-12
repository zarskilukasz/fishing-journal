import type { APIRoute } from "astro";
import { tripListQuerySchema, createTripSchema } from "@/lib/schemas/trip.schema";
import { tripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse, createCreatedResponse } from "@/lib/api/error-response";

/**
 * GET /api/v1/trips
 *
 * Lists all trips for the authenticated user with optional filtering, pagination, and sorting.
 *
 * Query parameters:
 * - status: Filter by trip status (draft, active, closed)
 * - from: Start of date range filter (ISO datetime)
 * - to: End of date range filter (ISO datetime)
 * - include_deleted: Include soft-deleted trips (default: false)
 * - limit: Number of results (1-100, default 20)
 * - cursor: Pagination cursor
 * - sort: Sort field (started_at, created_at, updated_at)
 * - order: Sort direction (asc, desc)
 *
 * Response includes catch_count summary for each trip.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Parse and validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const parseResult = tripListQuerySchema.safeParse(queryParams);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 3. Execute service
  const result = await tripService.list(supabase, parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};

/**
 * POST /api/v1/trips
 *
 * Creates a new trip for the authenticated user.
 *
 * Request body:
 * - started_at: Trip start datetime (required, ISO format)
 * - ended_at: Trip end datetime (optional, null if ongoing)
 * - status: Trip status (draft, active, closed)
 * - location: Optional location object { lat, lng, label? }
 * - copy_equipment_from_last_trip: Copy equipment from user's last trip (default: false)
 *
 * Business rules:
 * - ended_at must be >= started_at
 * - status 'closed' requires ended_at
 */
export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  // 3. Validate body
  const parseResult = createTripSchema.safeParse(body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 4. Execute service
  const result = await tripService.create(supabase, user.id, parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.httpStatus);
  }

  // 5. Return created response
  return createCreatedResponse(result.data);
};
