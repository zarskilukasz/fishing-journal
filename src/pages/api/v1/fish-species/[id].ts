import type { APIRoute } from "astro";
import { fishSpeciesIdSchema } from "@/lib/schemas/fish-species.schema";
import { FishSpeciesService } from "@/lib/services/fish-species.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

/**
 * GET /api/v1/fish-species/{id}
 *
 * Gets a single fish species by ID.
 * Requires authentication.
 *
 * Path parameters:
 * - id: UUID of the fish species
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
  const idParseResult = fishSpeciesIdSchema.safeParse(params.id);

  if (!idParseResult.success) {
    return createErrorResponse("validation_error", "Invalid ID format", 400, {
      field: "id",
      reason: "Must be a valid UUID",
    });
  }

  // 3. Execute service
  const service = new FishSpeciesService(supabase);
  const result = await service.getById(idParseResult.data);

  if (result.error) {
    const status = result.error.code === "not_found" ? 404 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};
