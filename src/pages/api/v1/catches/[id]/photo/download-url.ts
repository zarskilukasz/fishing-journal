import type { APIRoute } from "astro";
import { catchPhotoService } from "@/lib/services/catch-photo.service";
import { catchIdParamSchema } from "@/lib/schemas/catch-photo.schema";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";
import type { CatchPhotoDownloadUrlResponseDto } from "@/types";

/**
 * GET /api/v1/catches/{id}/photo/download-url
 *
 * Generates a signed URL for viewing/downloading the catch photo.
 * The URL is valid for 10 minutes.
 *
 * Requires authentication. User must own the trip containing this catch.
 *
 * @returns CatchPhotoDownloadUrlResponseDto with signed URL and expiration
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
  const paramParseResult = catchIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID", 400, {
      field: "id",
      reason: issue?.message,
    });
  }

  const { id: catchId } = paramParseResult.data;

  // 3. Verify catch ownership and get photo path
  const ownershipResult = await catchPhotoService.verifyCatchOwnership(supabase, catchId);
  if (ownershipResult.error) {
    return createErrorResponse(
      ownershipResult.error.code,
      ownershipResult.error.message,
      ownershipResult.error.httpStatus
    );
  }

  if (!ownershipResult.data.exists) {
    return createErrorResponse("not_found", "Połów nie został znaleziony", 404);
  }

  // 4. Check if catch has a photo
  if (!ownershipResult.data.photoPath) {
    return createErrorResponse("not_found", "Połów nie posiada zdjęcia", 404);
  }

  // 5. Generate signed download URL
  const urlResult = await catchPhotoService.createDownloadUrl(supabase, ownershipResult.data.photoPath);

  if (urlResult.error) {
    return createErrorResponse(urlResult.error.code, urlResult.error.message, urlResult.error.httpStatus);
  }

  // 6. Build response
  const response: CatchPhotoDownloadUrlResponseDto = {
    url: urlResult.data.url,
    expires_in: urlResult.data.expiresIn,
  };

  return createSuccessResponse(response);
};
