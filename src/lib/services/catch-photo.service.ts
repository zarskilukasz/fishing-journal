import sharp from "sharp";
import type { SupabaseClient } from "@/db/supabase.client";
import type { UUID, CatchDto, CatchPhotoUploadResponseDto } from "@/types";
import { mapSupabaseError, type MappedError } from "@/lib/errors/supabase-error-mapper";
import {
  CATCH_PHOTOS_BUCKET,
  MAX_IMAGE_DIMENSION,
  WEBP_QUALITY,
  SIGNED_URL_EXPIRES_IN,
  ALLOWED_FILE_EXTENSIONS,
} from "@/lib/schemas/catch-photo.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result wrapper for service operations.
 */
type ServiceResult<T> = { data: T; error: null } | { data: null; error: MappedError };

/**
 * Result of image processing with Sharp.
 */
export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
}

/**
 * Catch ownership verification result.
 */
interface CatchOwnershipResult {
  exists: boolean;
  photoPath: string | null;
  tripId: UUID | null;
}

/**
 * Signed upload URL response structure.
 */
interface SignedUploadUrl {
  path: string;
  signedUrl: string;
  expiresIn: number;
}

/**
 * Signed download URL response structure.
 */
interface SignedDownloadUrl {
  url: string;
  expiresIn: number;
}

// ---------------------------------------------------------------------------
// Catch Photo Service
// ---------------------------------------------------------------------------

/**
 * Service for managing catch photos.
 *
 * Features:
 * - Server-side image processing with Sharp (resize, convert to WebP, strip EXIF)
 * - Upload to Supabase Storage
 * - Generate signed URLs for direct upload/download
 * - Photo path validation for security (path traversal prevention)
 *
 * Security:
 * - RLS policies ensure users can only access catches from their own trips
 * - Photo paths are validated to be within user's folder
 * - EXIF metadata is automatically stripped during processing
 */
export const catchPhotoService = {
  // ---------------------------------------------------------------------------
  // Catch Ownership Verification
  // ---------------------------------------------------------------------------

  /**
   * Verifies that a catch exists and belongs to the authenticated user.
   * Also returns the current photo_path for deletion scenarios.
   *
   * @param supabase - Supabase client from context.locals
   * @param catchId - Catch UUID to verify
   * @returns Ownership result with exists flag, photoPath, and tripId
   */
  async verifyCatchOwnership(supabase: SupabaseClient, catchId: UUID): Promise<ServiceResult<CatchOwnershipResult>> {
    const { data, error } = await supabase
      .from("catches")
      .select(
        `
        id,
        photo_path,
        trip_id,
        trips!inner ( user_id )
      `
      )
      .eq("id", catchId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          data: { exists: false, photoPath: null, tripId: null },
          error: null,
        };
      }
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return {
      data: {
        exists: true,
        photoPath: data?.photo_path ?? null,
        tripId: data?.trip_id ?? null,
      },
      error: null,
    };
  },

  // ---------------------------------------------------------------------------
  // Image Processing with Sharp
  // ---------------------------------------------------------------------------

  /**
   * Processes an image with Sharp:
   * - Resizes to fit within MAX_IMAGE_DIMENSION (maintains aspect ratio)
   * - Auto-rotates based on EXIF orientation
   * - Converts to WebP format with specified quality
   * - Strips all EXIF metadata for privacy
   *
   * @param buffer - Input image buffer
   * @returns Processed image with buffer and metadata
   */
  async processImage(buffer: Buffer): Promise<ServiceResult<ProcessedImage>> {
    try {
      const result = await sharp(buffer, {
        // Limit memory for large images (16k x 16k max pixels)
        limitInputPixels: 268402689,
        // Fail fast on invalid input
        failOnError: true,
      })
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .rotate() // Auto-rotate based on EXIF
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });

      return {
        data: {
          buffer: result.data,
          width: result.info.width,
          height: result.info.height,
          size: result.info.size,
        },
        error: null,
      };
    } catch {
      return {
        data: null,
        error: {
          code: "validation_error",
          message: "Nieprawidłowe dane obrazu",
          httpStatus: 400,
        },
      };
    }
  },

  // ---------------------------------------------------------------------------
  // Storage Operations
  // ---------------------------------------------------------------------------

  /**
   * Uploads processed image to Supabase Storage.
   * Path format: {user_id}/{catch_id}.webp
   *
   * @param supabase - Supabase client
   * @param userId - User UUID (for folder path)
   * @param catchId - Catch UUID (for filename)
   * @param buffer - Processed image buffer
   * @returns Upload result with storage path
   */
  async uploadToStorage(
    supabase: SupabaseClient,
    userId: UUID,
    catchId: UUID,
    buffer: Buffer
  ): Promise<ServiceResult<{ path: string }>> {
    const path = `${userId}/${catchId}.webp`;

    const { error } = await supabase.storage.from(CATCH_PHOTOS_BUCKET).upload(path, buffer, {
      contentType: "image/webp",
      upsert: true, // Overwrite if exists
    });

    if (error) {
      return {
        data: null,
        error: {
          code: "internal_error",
          message: "Błąd zapisu do storage",
          httpStatus: 500,
        },
      };
    }

    return {
      data: { path },
      error: null,
    };
  },

  /**
   * Creates a signed URL for direct client upload.
   * Used for the upload-url endpoint workflow.
   *
   * @param supabase - Supabase client
   * @param userId - User UUID
   * @param catchId - Catch UUID
   * @param fileExt - File extension (jpg, png, webp)
   * @returns Signed URL details
   */
  async createUploadUrl(
    supabase: SupabaseClient,
    userId: UUID,
    catchId: UUID,
    fileExt: string
  ): Promise<ServiceResult<SignedUploadUrl>> {
    const path = `${userId}/${catchId}.${fileExt}`;

    const { data, error } = await supabase.storage.from(CATCH_PHOTOS_BUCKET).createSignedUploadUrl(path);

    if (error) {
      return {
        data: null,
        error: {
          code: "internal_error",
          message: "Błąd generowania URL uploadu",
          httpStatus: 500,
        },
      };
    }

    return {
      data: {
        path,
        signedUrl: data.signedUrl,
        expiresIn: SIGNED_URL_EXPIRES_IN,
      },
      error: null,
    };
  },

  /**
   * Creates a signed URL for downloading/viewing a photo.
   *
   * @param supabase - Supabase client
   * @param photoPath - Storage path of the photo
   * @returns Signed download URL
   */
  async createDownloadUrl(supabase: SupabaseClient, photoPath: string): Promise<ServiceResult<SignedDownloadUrl>> {
    const { data, error } = await supabase.storage
      .from(CATCH_PHOTOS_BUCKET)
      .createSignedUrl(photoPath, SIGNED_URL_EXPIRES_IN);

    if (error) {
      return {
        data: null,
        error: {
          code: "internal_error",
          message: "Błąd generowania URL pobierania",
          httpStatus: 500,
        },
      };
    }

    return {
      data: {
        url: data.signedUrl,
        expiresIn: SIGNED_URL_EXPIRES_IN,
      },
      error: null,
    };
  },

  /**
   * Deletes a photo from Storage.
   *
   * @param supabase - Supabase client
   * @param photoPath - Storage path to delete
   */
  async deleteFromStorage(supabase: SupabaseClient, photoPath: string): Promise<ServiceResult<null>> {
    // Don't fail on delete errors - file might not exist or already deleted
    await supabase.storage.from(CATCH_PHOTOS_BUCKET).remove([photoPath]);
    return { data: null, error: null };
  },

  // ---------------------------------------------------------------------------
  // Database Operations
  // ---------------------------------------------------------------------------

  /**
   * Updates the photo_path field on a catch record.
   *
   * @param supabase - Supabase client
   * @param catchId - Catch UUID
   * @param photoPath - New photo path (or null to remove)
   * @returns Updated catch DTO
   */
  async updatePhotoPath(
    supabase: SupabaseClient,
    catchId: UUID,
    photoPath: string | null
  ): Promise<ServiceResult<CatchDto>> {
    const { data, error } = await supabase
      .from("catches")
      .update({ photo_path: photoPath })
      .eq("id", catchId)
      .select()
      .single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: data as CatchDto, error: null };
  },

  /**
   * Verifies that a file exists in Storage.
   * Used before committing a photo_path from direct upload.
   *
   * @param supabase - Supabase client
   * @param photoPath - Path to verify
   * @returns True if file exists
   */
  async verifyFileExists(supabase: SupabaseClient, photoPath: string): Promise<boolean> {
    // Try to get file metadata - if it exists, the file is there
    const { data, error } = await supabase.storage.from(CATCH_PHOTOS_BUCKET).list(photoPath.split("/")[0], {
      limit: 1,
      search: photoPath.split("/")[1],
    });

    if (error || !data || data.length === 0) {
      return false;
    }

    return data.some((file) => `${photoPath.split("/")[0]}/${file.name}` === photoPath);
  },

  // ---------------------------------------------------------------------------
  // Path Validation (Security)
  // ---------------------------------------------------------------------------

  /**
   * Validates that a photo path belongs to the specified user.
   * Prevents path traversal attacks and unauthorized access.
   *
   * @param photoPath - Photo path to validate
   * @param userId - User UUID who should own the path
   * @returns True if path is valid and belongs to user
   */
  validatePhotoPath(photoPath: string, userId: UUID): boolean {
    // Path must start with user's ID
    const expectedPrefix = `${userId}/`;
    if (!photoPath.startsWith(expectedPrefix)) {
      return false;
    }

    // No path traversal attempts
    if (photoPath.includes("..")) {
      return false;
    }

    // Must have valid extension
    const validExtensions = ALLOWED_FILE_EXTENSIONS.map((ext) => `.${ext}`);
    const hasValidExt = validExtensions.some((ext) => photoPath.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      return false;
    }

    // Path format should be user_id/filename.ext (exactly 2 segments)
    const segments = photoPath.split("/");
    if (segments.length !== 2) {
      return false;
    }

    return true;
  },

  // ---------------------------------------------------------------------------
  // High-Level Operations
  // ---------------------------------------------------------------------------

  /**
   * Full upload workflow with server-side processing:
   * 1. Process image with Sharp
   * 2. Upload to Storage
   * 3. Update catch.photo_path
   *
   * @param supabase - Supabase client
   * @param userId - User UUID
   * @param catchId - Catch UUID
   * @param buffer - Raw image buffer
   * @returns Upload response with path and dimensions
   */
  async uploadPhoto(
    supabase: SupabaseClient,
    userId: UUID,
    catchId: UUID,
    buffer: Buffer
  ): Promise<ServiceResult<CatchPhotoUploadResponseDto>> {
    // 1. Process image
    const processResult = await this.processImage(buffer);
    if (processResult.error) {
      return { data: null, error: processResult.error };
    }

    // 2. Upload to storage
    const uploadResult = await this.uploadToStorage(supabase, userId, catchId, processResult.data.buffer);
    if (uploadResult.error) {
      return { data: null, error: uploadResult.error };
    }

    // 3. Update catch record
    const updateResult = await this.updatePhotoPath(supabase, catchId, uploadResult.data.path);
    if (updateResult.error) {
      // Try to clean up uploaded file
      await this.deleteFromStorage(supabase, uploadResult.data.path);
      return { data: null, error: updateResult.error };
    }

    return {
      data: {
        photo_path: uploadResult.data.path,
        size_bytes: processResult.data.size,
        width: processResult.data.width,
        height: processResult.data.height,
      },
      error: null,
    };
  },

  /**
   * Delete workflow:
   * 1. Delete from Storage (if exists)
   * 2. Set photo_path to null
   *
   * @param supabase - Supabase client
   * @param catchId - Catch UUID
   * @param currentPhotoPath - Current photo path (if any)
   */
  async deletePhoto(
    supabase: SupabaseClient,
    catchId: UUID,
    currentPhotoPath: string | null
  ): Promise<ServiceResult<null>> {
    // 1. Delete from storage if path exists
    if (currentPhotoPath) {
      await this.deleteFromStorage(supabase, currentPhotoPath);
    }

    // 2. Update catch record
    const updateResult = await this.updatePhotoPath(supabase, catchId, null);
    if (updateResult.error) {
      return { data: null, error: updateResult.error };
    }

    return { data: null, error: null };
  },
};
