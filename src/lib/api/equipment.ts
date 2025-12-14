/**
 * API functions for equipment (lures, groundbaits) - client-side fetch wrappers.
 */
import type { LureListResponseDto, GroundbaitListResponseDto, ApiErrorResponse } from "@/types";

/**
 * API error class for equipment
 */
export class EquipmentApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "EquipmentApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Parameters for listing equipment
 */
export interface FetchEquipmentParams {
  q?: string;
  include_deleted?: boolean;
  limit?: number;
  cursor?: string;
  sort?: "name" | "created_at" | "updated_at";
  order?: "asc" | "desc";
}

/**
 * Fetch lures list
 */
export async function fetchLures(params: FetchEquipmentParams = {}): Promise<LureListResponseDto> {
  const { limit = 100, sort = "name", order = "asc", cursor, q, include_deleted = false } = params;

  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    sort,
    order,
    include_deleted: include_deleted.toString(),
  });

  if (cursor) searchParams.set("cursor", cursor);
  if (q) searchParams.set("q", q);

  const response = await fetch(`/api/v1/lures?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new EquipmentApiError(
      errorData.error?.message || "Nie udało się pobrać przynęt",
      errorData.error?.code || "unknown_error",
      response.status
    );
  }

  return response.json() as Promise<LureListResponseDto>;
}

/**
 * Fetch groundbaits list
 */
export async function fetchGroundbaits(params: FetchEquipmentParams = {}): Promise<GroundbaitListResponseDto> {
  const { limit = 100, sort = "name", order = "asc", cursor, q, include_deleted = false } = params;

  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    sort,
    order,
    include_deleted: include_deleted.toString(),
  });

  if (cursor) searchParams.set("cursor", cursor);
  if (q) searchParams.set("q", q);

  const response = await fetch(`/api/v1/groundbaits?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new EquipmentApiError(
      errorData.error?.message || "Nie udało się pobrać zanęt",
      errorData.error?.code || "unknown_error",
      response.status
    );
  }

  return response.json() as Promise<GroundbaitListResponseDto>;
}
