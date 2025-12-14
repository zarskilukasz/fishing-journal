/**
 * API functions for catches - client-side fetch wrappers.
 */
import type {
  CatchDto,
  CatchListResponseDto,
  CreateCatchCommand,
  UpdateCatchCommand,
  CatchPhotoUploadResponseDto,
  CatchPhotoDownloadUrlResponseDto,
  ApiErrorResponse,
} from "@/types";

/**
 * API error class for catches
 */
export class CatchApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "CatchApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Parameters for listing catches
 */
export interface FetchCatchesParams {
  tripId: string;
  from?: string;
  to?: string;
  species_id?: string;
  limit?: number;
  cursor?: string;
  sort?: "caught_at" | "created_at";
  order?: "asc" | "desc";
}

/**
 * Fetch catches for a trip
 */
export async function fetchCatches(params: FetchCatchesParams): Promise<CatchListResponseDto> {
  const { tripId, limit = 20, sort = "caught_at", order = "desc", cursor, from, to, species_id } = params;

  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    sort,
    order,
  });

  if (cursor) searchParams.set("cursor", cursor);
  if (from) searchParams.set("from", from);
  if (to) searchParams.set("to", to);
  if (species_id) searchParams.set("species_id", species_id);

  const response = await fetch(`/api/v1/trips/${tripId}/catches?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new CatchApiError(
      errorData.error?.message || "Nie udało się pobrać połowów",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<CatchListResponseDto>;
}

/**
 * Create a new catch
 */
export async function createCatch(tripId: string, command: CreateCatchCommand): Promise<CatchDto> {
  const response = await fetch(`/api/v1/trips/${tripId}/catches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new CatchApiError(
      errorData.error?.message || "Nie udało się utworzyć połowu",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<CatchDto>;
}

/**
 * Get a single catch by ID
 */
export async function getCatch(catchId: string): Promise<CatchDto> {
  const response = await fetch(`/api/v1/catches/${catchId}`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new CatchApiError(
      errorData.error?.message || "Nie udało się pobrać połowu",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<CatchDto>;
}

/**
 * Update a catch
 */
export async function updateCatch(catchId: string, command: UpdateCatchCommand): Promise<CatchDto> {
  const response = await fetch(`/api/v1/catches/${catchId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new CatchApiError(
      errorData.error?.message || "Nie udało się zaktualizować połowu",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<CatchDto>;
}

/**
 * Delete a catch
 */
export async function deleteCatch(catchId: string): Promise<void> {
  const response = await fetch(`/api/v1/catches/${catchId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new CatchApiError(
      errorData.error?.message || "Nie udało się usunąć połowu",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }
}

// ---------------------------------------------------------------------------
// Photo Operations
// ---------------------------------------------------------------------------

/**
 * Upload a photo for a catch (with server-side processing via Sharp)
 */
export async function uploadCatchPhoto(
  catchId: string,
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<CatchPhotoUploadResponseDto> {
  const formData = new FormData();
  formData.append("file", file);

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as CatchPhotoUploadResponseDto;
          resolve(data);
        } catch {
          reject(new CatchApiError("Nieprawidłowa odpowiedź serwera", "parse_error", xhr.status));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText) as Partial<ApiErrorResponse>;
          reject(
            new CatchApiError(
              errorData.error?.message || "Nie udało się przesłać zdjęcia",
              errorData.error?.code || "unknown_error",
              xhr.status,
              errorData.error?.details as Record<string, unknown> | undefined
            )
          );
        } catch {
          reject(new CatchApiError("Nie udało się przesłać zdjęcia", "unknown_error", xhr.status));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new CatchApiError("Błąd połączenia", "network_error", 0));
    });

    xhr.addEventListener("abort", () => {
      reject(new CatchApiError("Upload anulowany", "aborted", 0));
    });

    xhr.open("POST", `/api/v1/catches/${catchId}/photo`);
    xhr.send(formData);
  });
}

/**
 * Get signed URL for downloading catch photo
 */
export async function getCatchPhotoDownloadUrl(catchId: string): Promise<CatchPhotoDownloadUrlResponseDto> {
  const response = await fetch(`/api/v1/catches/${catchId}/photo/download-url`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new CatchApiError(
      errorData.error?.message || "Nie udało się pobrać URL zdjęcia",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }

  return response.json() as Promise<CatchPhotoDownloadUrlResponseDto>;
}

/**
 * Delete catch photo
 */
export async function deleteCatchPhoto(catchId: string): Promise<void> {
  const response = await fetch(`/api/v1/catches/${catchId}/photo`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new CatchApiError(
      errorData.error?.message || "Nie udało się usunąć zdjęcia",
      errorData.error?.code || "unknown_error",
      response.status,
      errorData.error?.details as Record<string, unknown> | undefined
    );
  }
}

// ---------------------------------------------------------------------------
// Error Messages
// ---------------------------------------------------------------------------

/**
 * Polish error messages for catch API errors
 */
export const CATCH_API_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sesja wygasła. Zaloguj się ponownie.",
  validation_error: "Nieprawidłowe dane połowu.",
  not_found: "Połów nie został znaleziony.",
  equipment_owner_mismatch: "Wybrany sprzęt należy do innego użytkownika.",
  equipment_soft_deleted: "Wybrany sprzęt został usunięty.",
  payload_too_large: "Plik jest za duży. Maksymalny rozmiar to 10MB.",
  internal_error: "Wystąpił błąd serwera. Spróbuj ponownie.",
  network_error: "Brak połączenia z internetem.",
  unknown_error: "Wystąpił nieoczekiwany błąd.",
};

/**
 * Get user-friendly error message
 */
export function getCatchApiErrorMessage(error: unknown): string {
  if (error instanceof CatchApiError) {
    return CATCH_API_ERROR_MESSAGES[error.code] || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return CATCH_API_ERROR_MESSAGES.unknown_error;
}
