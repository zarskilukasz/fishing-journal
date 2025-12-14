/**
 * Custom hook for handling catch photo upload with client-side resize.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { uploadCatchPhoto, getCatchPhotoDownloadUrl, deleteCatchPhoto, CatchApiError } from "@/lib/api/catches";
import { resizeImage } from "@/lib/image-utils";
import type { PhotoUploadState } from "@/components/catches/types";
import { PHOTO_UPLOAD_INITIAL_STATE } from "@/components/catches/types";
import type { CatchPhotoUploadResponseDto } from "@/types";

/**
 * Maximum file size before resize (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed MIME types
 */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Signed URL refresh threshold (refresh 1 min before expiration)
 */
const URL_REFRESH_THRESHOLD_MS = 60 * 1000;

/**
 * Return type for usePhotoUpload hook
 */
export interface UsePhotoUploadReturn {
  /** Current upload state */
  state: PhotoUploadState;

  /** Handle file selection (from input or drop) */
  handleFileSelect: (file: File | null) => void;

  /** Upload photo to server (requires catchId) */
  uploadPhoto: (catchId: string) => Promise<CatchPhotoUploadResponseDto | null>;

  /** Delete photo from server */
  deletePhoto: (catchId: string) => Promise<boolean>;

  /** Fetch signed URL for existing photo */
  fetchDownloadUrl: (catchId: string) => Promise<string | null>;

  /** Clear local state (preview, errors) */
  clearState: () => void;

  /** The selected file (for form submission) */
  selectedFile: File | null;
}

/**
 * Hook for managing photo upload with client-side resize and server processing.
 */
export function usePhotoUpload(_existingPhotoPath?: string | null): UsePhotoUploadReturn {
  const [state, setState] = useState<PhotoUploadState>(PHOTO_UPLOAD_INITIAL_STATE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (state.previewUrl && !state.downloadUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [state.previewUrl, state.downloadUrl]);

  /**
   * Validate file before processing
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG, WebP";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Plik jest za duży. Maksymalny rozmiar to 10MB";
    }
    return null;
  }, []);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<PhotoUploadState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File | null) => {
      // Clear previous state
      if (state.previewUrl && !state.downloadUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }

      if (!file) {
        setSelectedFile(null);
        updateState({
          status: "idle",
          progress: 0,
          previewUrl: null,
          error: null,
          uploadResult: null,
        });
        return;
      }

      // Validate
      const validationError = validateFile(file);
      if (validationError) {
        updateState({
          status: "error",
          error: validationError,
          previewUrl: null,
        });
        return;
      }

      // Start resizing
      updateState({ status: "resizing", progress: 0, error: null });

      try {
        const resizedBlob = await resizeImage(file, 2000);
        const resizedFile = new File([resizedBlob], file.name, {
          type: resizedBlob.type,
        });

        // Create preview URL
        const previewUrl = URL.createObjectURL(resizedFile);

        setSelectedFile(resizedFile);
        updateState({
          status: "idle",
          progress: 0,
          previewUrl,
          error: null,
        });
      } catch {
        updateState({
          status: "error",
          error: "Nie udało się przetworzyć obrazu",
          previewUrl: null,
        });
      }
    },
    [state.previewUrl, state.downloadUrl, validateFile, updateState]
  );

  /**
   * Upload photo to server
   */
  const uploadPhoto = useCallback(
    async (catchId: string): Promise<CatchPhotoUploadResponseDto | null> => {
      if (!selectedFile) {
        return null;
      }

      updateState({ status: "uploading", progress: 0, error: null });

      try {
        const result = await uploadCatchPhoto(catchId, selectedFile, (progress) => {
          updateState({ progress });
        });

        updateState({
          status: "success",
          progress: 100,
          uploadedPath: result.photo_path,
          uploadResult: result,
        });

        return result;
      } catch (error) {
        const message = error instanceof CatchApiError ? error.message : "Nie udało się przesłać zdjęcia";

        updateState({
          status: "error",
          error: message,
          progress: 0,
        });

        return null;
      }
    },
    [selectedFile, updateState]
  );

  /**
   * Delete photo from server
   */
  const deletePhoto = useCallback(
    async (catchId: string): Promise<boolean> => {
      updateState({ status: "deleting", error: null });

      try {
        await deleteCatchPhoto(catchId);

        // Clear all state
        if (state.previewUrl) {
          URL.revokeObjectURL(state.previewUrl);
        }

        setState(PHOTO_UPLOAD_INITIAL_STATE);
        setSelectedFile(null);

        return true;
      } catch (error) {
        const message = error instanceof CatchApiError ? error.message : "Nie udało się usunąć zdjęcia";

        updateState({
          status: "error",
          error: message,
        });

        return false;
      }
    },
    [state.previewUrl, updateState]
  );

  /**
   * Fetch signed URL for existing photo
   */
  const fetchDownloadUrl = useCallback(
    async (catchId: string): Promise<string | null> => {
      try {
        const response = await getCatchPhotoDownloadUrl(catchId);

        const expiresAt = new Date(Date.now() + response.expires_in * 1000);

        updateState({
          downloadUrl: response.url,
          downloadUrlExpiresAt: expiresAt,
          previewUrl: response.url,
        });

        // Schedule refresh before expiration
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }

        const refreshIn = response.expires_in * 1000 - URL_REFRESH_THRESHOLD_MS;
        if (refreshIn > 0) {
          refreshTimeoutRef.current = setTimeout(() => {
            fetchDownloadUrl(catchId);
          }, refreshIn);
        }

        return response.url;
      } catch (error) {
        // 404 means no photo exists - this is OK
        if (error instanceof CatchApiError && error.statusCode === 404) {
          return null;
        }

        // Silently fail for other errors
        return null;
      }
    },
    [updateState]
  );

  /**
   * Clear local state
   */
  const clearState = useCallback(() => {
    if (state.previewUrl && !state.downloadUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    setState(PHOTO_UPLOAD_INITIAL_STATE);
    setSelectedFile(null);
  }, [state.previewUrl, state.downloadUrl]);

  return {
    state,
    handleFileSelect,
    uploadPhoto,
    deletePhoto,
    fetchDownloadUrl,
    clearState,
    selectedFile,
  };
}
