import type { APIRoute } from "astro";
import { equipmentListQuerySchema, createEquipmentSchema } from "@/lib/schemas/equipment.schema";
import { createRodsService } from "@/lib/services/equipment.service";
import { createErrorResponse, createSuccessResponse, createCreatedResponse } from "@/lib/api/error-response";

/**
 * GET /api/v1/rods
 *
 * Lists all rods with optional filtering, pagination, and sorting.
 * Requires authentication. Returns only rods belonging to the authenticated user.
 *
 * Query parameters:
 * - q: Search substring in name (case-insensitive)
 * - include_deleted: Whether to include soft-deleted items (default: false)
 * - limit: Number of results (1-100, default 20)
 * - cursor: Pagination cursor
 * - sort: Sort field (name, created_at, updated_at)
 * - order: Sort direction (asc, desc)
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
  const parseResult = equipmentListQuerySchema.safeParse(queryParams);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", "Validation failed", 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 3. Execute service
  const service = createRodsService(supabase);
  const result = await service.list(parseResult.data);

  if (result.error) {
    const status = result.error.code === "validation_error" ? 400 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};

/**
 * POST /api/v1/rods
 *
 * Creates a new rod.
 * Requires authentication. The rod is automatically associated with the authenticated user.
 *
 * Request body:
 * - name: string (required, 1-255 characters)
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

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  const parseResult = createEquipmentSchema.safeParse(body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 3. Execute service
  const service = createRodsService(supabase);
  const result = await service.create(parseResult.data);

  if (result.error) {
    const status = result.error.code === "conflict" ? 409 : result.error.code === "validation_error" ? 400 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return created response
  return createCreatedResponse(result.data);
};
