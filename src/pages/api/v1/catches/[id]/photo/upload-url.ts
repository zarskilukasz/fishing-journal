import type { APIRoute } from "astro";
import { catchPhotoService } from "@/lib/services/catch-photo.service";
import { catchIdParamSchema, uploadUrlSchema, CATCH_PHOTOS_BUCKET } from "@/lib/schemas/catch-photo.schema";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";
import type { CatchPhotoUploadUrlResponseDto } from "@/types";

/**
 * POST /api/v1/catches/{id}/photo/upload-url
 *
 * Generates a signed URL for direct client-side upload to Supabase Storage.
 * Use this for uploading photos without server-side processing.
 *
 * Workflow:
 * 1. Client calls this endpoint to get signed URL
 * 2. Client uploads file directly to Storage using the signed URL (PUT request)
 * 3. Client calls POST /catches/{id}/photo/commit to confirm the upload
 *
 * Note: This workflow does NOT include server-side image processing.
 * For automatic resize/compression, use POST /catches/{id}/photo instead.
 *
 * Requires authentication. User must own the trip containing this catch.
 *
 * Request body:
 * - content_type: MIME type (image/jpeg, image/png, image/webp)
 * - file_ext: File extension (jpg, jpeg, png, webp)
 *
 * @returns CatchPhotoUploadUrlResponseDto with signed URL
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
  const paramParseResult = catchIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    const issue = paramParseResult.error.issues[0];
    return createErrorResponse("validation_error", "Nieprawidłowy format UUID", 400, {
      field: "id",
      reason: issue?.message,
    });
  }

  const { id: catchId } = paramParseResult.data;

  // 3. Verify catch ownership
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

  // 4. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Nieprawidłowy JSON", 400);
  }

  // 5. Validate request body
  const bodyParseResult = uploadUrlSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { file_ext } = bodyParseResult.data;

  // 6. Generate signed upload URL
  const urlResult = await catchPhotoService.createUploadUrl(supabase, user.id, catchId, file_ext);

  if (urlResult.error) {
    return createErrorResponse(urlResult.error.code, urlResult.error.message, urlResult.error.httpStatus);
  }

  // 7. Build response
  const response: CatchPhotoUploadUrlResponseDto = {
    object: {
      bucket: CATCH_PHOTOS_BUCKET,
      path: urlResult.data.path,
    },
    upload: {
      url: urlResult.data.signedUrl,
      expires_in: urlResult.data.expiresIn,
      method: "PUT",
    },
  };

  return createSuccessResponse(response);
};
