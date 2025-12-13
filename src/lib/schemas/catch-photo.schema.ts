import { z } from "zod";

/**
 * Zod schemas for catch photo endpoint validation.
 * Covers request bodies for photo operations:
 * - POST /catches/{id}/photo/upload-url
 * - POST /catches/{id}/photo/commit
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Allowed MIME types for photo upload */
export const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Allowed file extensions */
export const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/** Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum image dimension in pixels */
export const MAX_IMAGE_DIMENSION = 2000;

/** WebP output quality (0-100) */
export const WEBP_QUALITY = 80;

/** Signed URL expiration time in seconds (10 minutes) */
export const SIGNED_URL_EXPIRES_IN = 600;

/** Storage bucket name for catch photos */
export const CATCH_PHOTOS_BUCKET = "catch-photos" as const;

// ---------------------------------------------------------------------------
// Path Params
// ---------------------------------------------------------------------------

/**
 * Path param schema for catch ID in photo endpoints.
 */
export const catchIdParamSchema = z.object({
  id: z.string().uuid("Nieprawidłowy format UUID"),
});

// ---------------------------------------------------------------------------
// Request Body: POST /catches/{id}/photo/upload-url
// ---------------------------------------------------------------------------

/**
 * Request body schema for generating signed upload URL.
 */
export const uploadUrlSchema = z.object({
  content_type: z.enum(ALLOWED_CONTENT_TYPES, {
    error: "Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG, WebP",
  }),
  file_ext: z.enum(ALLOWED_FILE_EXTENSIONS, {
    error: "Nieobsługiwane rozszerzenie pliku. Dozwolone: jpg, jpeg, png, webp",
  }),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /catches/{id}/photo/commit
// ---------------------------------------------------------------------------

/**
 * Regex pattern for valid photo path format: user_id/catch_id.extension
 * Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321.webp"
 */
const PHOTO_PATH_REGEX = /^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;

/**
 * Request body schema for committing photo after direct upload.
 */
export const commitPhotoSchema = z.object({
  photo_path: z
    .string()
    .min(1, "photo_path jest wymagany")
    .max(255, "photo_path nie może przekraczać 255 znaków")
    .regex(PHOTO_PATH_REGEX, "Nieprawidłowy format ścieżki zdjęcia"),
});

export type CommitPhotoInput = z.infer<typeof commitPhotoSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a content type is allowed.
 *
 * @param contentType - MIME type to validate
 * @returns True if content type is allowed
 */
export function isAllowedContentType(contentType: string): contentType is (typeof ALLOWED_CONTENT_TYPES)[number] {
  return ALLOWED_CONTENT_TYPES.includes(contentType as (typeof ALLOWED_CONTENT_TYPES)[number]);
}

/**
 * Gets file extension from content type.
 *
 * @param contentType - MIME type
 * @returns File extension without dot
 */
export function getExtensionFromContentType(contentType: string): string {
  const mapping: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return mapping[contentType] ?? "jpg";
}

/**
 * Validates file size against max limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns True if size is within limit
 */
export function isFileSizeValid(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES;
}
