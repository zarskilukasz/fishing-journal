/**
 * API functions for fish species - client-side fetch wrappers.
 */
import type { FishSpeciesListResponseDto, ApiErrorResponse } from "@/types";

/**
 * API error class for fish species
 */
export class FishSpeciesApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "FishSpeciesApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Parameters for listing fish species
 */
export interface FetchFishSpeciesParams {
  q?: string;
  limit?: number;
  cursor?: string;
  sort?: "name" | "created_at";
  order?: "asc" | "desc";
}

/**
 * Fetch fish species list
 */
export async function fetchFishSpecies(params: FetchFishSpeciesParams = {}): Promise<FishSpeciesListResponseDto> {
  const { limit = 100, sort = "name", order = "asc", cursor, q } = params;

  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    sort,
    order,
  });

  if (cursor) searchParams.set("cursor", cursor);
  if (q) searchParams.set("q", q);

  const response = await fetch(`/api/v1/fish-species?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new FishSpeciesApiError(
      errorData.error?.message || "Nie udało się pobrać gatunków ryb",
      errorData.error?.code || "unknown_error",
      response.status
    );
  }

  return response.json() as Promise<FishSpeciesListResponseDto>;
}
