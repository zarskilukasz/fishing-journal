import type { APIRoute } from "astro";
import { equipmentIdSchema, updateEquipmentSchema } from "@/lib/schemas/equipment.schema";
import { createRodsService } from "@/lib/services/equipment.service";
import { createErrorResponse, createSuccessResponse, createNoContentResponse } from "@/lib/api/error-response";

/**
 * GET /api/v1/rods/{id}
 *
 * Gets a single rod by ID.
 * Requires authentication. Returns 404 if the rod doesn't exist or belongs to another user.
 *
 * Path parameters:
 * - id: UUID of the rod
 */
export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Validate path param
  const idParseResult = equipmentIdSchema.safeParse(params.id);

  if (!idParseResult.success) {
    return createErrorResponse("validation_error", "Invalid ID format", 400, {
      field: "id",
      reason: "Must be a valid UUID",
    });
  }

  // 3. Execute service
  const service = createRodsService(supabase);
  const result = await service.getById(idParseResult.data);

  if (result.error) {
    const status = result.error.code === "not_found" ? 404 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};

/**
 * PATCH /api/v1/rods/{id}
 *
 * Updates an existing rod (partial update).
 * Requires authentication. Returns 404 if the rod doesn't exist or belongs to another user.
 *
 * Path parameters:
 * - id: UUID of the rod
 *
 * Request body:
 * - name: string (optional, 1-255 characters)
 */
export const PATCH: APIRoute = async ({ params, locals, request }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Validate path param
  const idParseResult = equipmentIdSchema.safeParse(params.id);

  if (!idParseResult.success) {
    return createErrorResponse("validation_error", "Invalid ID format", 400, {
      field: "id",
      reason: "Must be a valid UUID",
    });
  }

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  const bodyParseResult = updateEquipmentSchema.safeParse(body);

  if (!bodyParseResult.success) {
    const firstIssue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", firstIssue.message, 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 4. Execute service
  const service = createRodsService(supabase);
  const result = await service.update(idParseResult.data, bodyParseResult.data);

  if (result.error) {
    const status =
      result.error.code === "not_found"
        ? 404
        : result.error.code === "conflict"
          ? 409
          : result.error.code === "validation_error"
            ? 400
            : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 5. Return success response
  return createSuccessResponse(result.data);
};

/**
 * DELETE /api/v1/rods/{id}
 *
 * Soft-deletes a rod by setting deleted_at.
 * Requires authentication. Returns 404 if the rod doesn't exist or belongs to another user.
 *
 * Path parameters:
 * - id: UUID of the rod
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Validate path param
  const idParseResult = equipmentIdSchema.safeParse(params.id);

  if (!idParseResult.success) {
    return createErrorResponse("validation_error", "Invalid ID format", 400, {
      field: "id",
      reason: "Must be a valid UUID",
    });
  }

  // 3. Execute service
  const service = createRodsService(supabase);
  const result = await service.softDelete(idParseResult.data);

  if (result.error) {
    const status = result.error.code === "not_found" ? 404 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return no content response
  return createNoContentResponse();
};
