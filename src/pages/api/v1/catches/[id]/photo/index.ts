import type { APIRoute } from "astro";
import { catchPhotoService } from "@/lib/services/catch-photo.service";
import { catchIdParamSchema, isAllowedContentType, isFileSizeValid } from "@/lib/schemas/catch-photo.schema";
import { createErrorResponse, createCreatedResponse, createNoContentResponse } from "@/lib/api/error-response";
import type { CatchPhotoUploadResponseDto } from "@/types";

/**
 * POST /api/v1/catches/{id}/photo
 *
 * Uploads a photo for a catch with server-side processing:
 * - Resizes to max 2000px (maintaining aspect ratio)
 * - Converts to WebP format (quality 80%)
 * - Strips EXIF metadata for privacy
 * - Stores in Supabase Storage
 *
 * Requires authentication. User must own the trip containing this catch.
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: file (image/jpeg, image/png, image/webp - max 10MB)
 *
 * @returns CatchPhotoUploadResponseDto with path and dimensions
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

  // 4. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return createErrorResponse("validation_error", "Nieprawidłowy format żądania. Oczekiwano multipart/form-data", 400);
  }

  // 5. Get file from form data
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return createErrorResponse("validation_error", "Brak pliku w żądaniu", 400);
  }

  // 6. Validate content type
  if (!isAllowedContentType(file.type)) {
    return createErrorResponse("validation_error", "Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG, WebP", 400, {
      field: "file",
      reason: "unsupported_content_type",
    });
  }

  // 7. Validate file size
  if (!isFileSizeValid(file.size)) {
    return createErrorResponse("payload_too_large", "Plik przekracza maksymalny rozmiar 10MB", 413);
  }

  // 8. Convert file to buffer
  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return createErrorResponse("validation_error", "Błąd odczytu pliku", 400);
  }

  // 9. Process and upload photo
  const uploadResult = await catchPhotoService.uploadPhoto(supabase, user.id, catchId, buffer);

  if (uploadResult.error) {
    return createErrorResponse(uploadResult.error.code, uploadResult.error.message, uploadResult.error.httpStatus);
  }

  // 10. Return response
  return createCreatedResponse<CatchPhotoUploadResponseDto>(uploadResult.data);
};

/**
 * DELETE /api/v1/catches/{id}/photo
 *
 * Deletes the photo associated with a catch.
 * Removes the file from Storage and sets photo_path to null.
 *
 * Requires authentication. User must own the trip containing this catch.
 *
 * @returns 204 No Content on success
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

  // 3. Verify catch ownership and get current photo path
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

  // 4. Delete photo (from storage and database)
  const deleteResult = await catchPhotoService.deletePhoto(supabase, catchId, ownershipResult.data.photoPath);

  if (deleteResult.error) {
    return createErrorResponse(deleteResult.error.code, deleteResult.error.message, deleteResult.error.httpStatus);
  }

  // 5. Return 204 No Content
  return createNoContentResponse();
};
