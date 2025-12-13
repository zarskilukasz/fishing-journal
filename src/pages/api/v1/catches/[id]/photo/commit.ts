import type { APIRoute } from "astro";
import { catchPhotoService } from "@/lib/services/catch-photo.service";
import { catchIdParamSchema, commitPhotoSchema } from "@/lib/schemas/catch-photo.schema";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";
import type { CatchDto } from "@/types";

/**
 * POST /api/v1/catches/{id}/photo/commit
 *
 * Commits a photo_path after direct upload via signed URL.
 * This is the final step in the direct upload workflow.
 *
 * Workflow:
 * 1. Client called POST /catches/{id}/photo/upload-url to get signed URL
 * 2. Client uploaded file directly to Storage using the signed URL
 * 3. Client calls this endpoint to confirm and save the photo_path
 *
 * Security:
 * - Validates that photo_path is in the user's folder
 * - Verifies the file exists in Storage before committing
 * - Prevents path traversal attacks
 *
 * Requires authentication. User must own the trip containing this catch.
 *
 * Request body:
 * - photo_path: Storage path (format: user_id/catch_id.ext)
 *
 * @returns Updated CatchDto
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
  const bodyParseResult = commitPhotoSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return createErrorResponse("validation_error", issue?.message ?? "Nieprawidłowe dane wejściowe", 400, {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { photo_path } = bodyParseResult.data;

  // 6. Validate photo_path belongs to user (security check)
  if (!catchPhotoService.validatePhotoPath(photo_path, user.id)) {
    return createErrorResponse("conflict", "Ścieżka zdjęcia musi znajdować się w folderze użytkownika", 409, {
      field: "photo_path",
    });
  }

  // 7. Verify file exists in Storage
  const fileExists = await catchPhotoService.verifyFileExists(supabase, photo_path);
  if (!fileExists) {
    return createErrorResponse("not_found", "Plik nie został znaleziony w storage", 404, {
      field: "photo_path",
    });
  }

  // 8. Update catch with new photo_path
  const updateResult = await catchPhotoService.updatePhotoPath(supabase, catchId, photo_path);

  if (updateResult.error) {
    return createErrorResponse(updateResult.error.code, updateResult.error.message, updateResult.error.httpStatus);
  }

  // 9. Return updated catch
  return createSuccessResponse<CatchDto>(updateResult.data);
};
