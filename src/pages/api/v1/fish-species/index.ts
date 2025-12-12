import type { APIRoute } from "astro";
import { fishSpeciesListQuerySchema } from "@/lib/schemas/fish-species.schema";
import { FishSpeciesService } from "@/lib/services/fish-species.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

/**
 * GET /api/v1/fish-species
 *
 * Lists all fish species with optional filtering, pagination, and sorting.
 * Requires authentication.
 *
 * Query parameters:
 * - q: Search substring in name (case-insensitive)
 * - limit: Number of results (1-100, default 20)
 * - cursor: Pagination cursor
 * - sort: Sort field (name, created_at)
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
  const parseResult = fishSpeciesListQuerySchema.safeParse(queryParams);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return createErrorResponse("validation_error", "Validation failed", 400, {
      field: firstIssue.path.join("."),
      reason: firstIssue.message,
    });
  }

  // 3. Execute service
  const service = new FishSpeciesService(supabase);
  const result = await service.list(parseResult.data);

  if (result.error) {
    const status = result.error.code === "validation_error" ? 400 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};
