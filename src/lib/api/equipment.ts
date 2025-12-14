/**
 * API functions for equipment (rods, lures, groundbaits) - client-side fetch wrappers.
 */
import type {
  RodListResponseDto,
  LureListResponseDto,
  GroundbaitListResponseDto,
  ApiErrorResponse,
  CreateEquipmentCommand,
  UpdateEquipmentCommand,
  ListResponse,
} from "@/types";
import type { EquipmentType, EquipmentDto } from "@/components/equipment/types";

/**
 * API error class for equipment
 */
export class EquipmentApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "EquipmentApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
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
 * Build URL search params from FetchEquipmentParams
 */
function buildEquipmentSearchParams(params: FetchEquipmentParams): URLSearchParams {
  const { limit = 20, sort = "created_at", order = "desc", cursor, q, include_deleted = false } = params;

  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    sort,
    order,
    include_deleted: include_deleted.toString(),
  });

  if (cursor) searchParams.set("cursor", cursor);
  if (q) searchParams.set("q", q);

  return searchParams;
}

/**
 * Parse API error response
 */
async function parseApiError(response: Response, defaultMessage: string): Promise<EquipmentApiError> {
  const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
  return new EquipmentApiError(
    errorData.error?.message || defaultMessage,
    errorData.error?.code || "unknown_error",
    response.status,
    errorData.error?.details as Record<string, unknown> | undefined
  );
}

/**
 * Fetch rods list
 */
export async function fetchRods(params: FetchEquipmentParams = {}): Promise<RodListResponseDto> {
  const searchParams = buildEquipmentSearchParams(params);
  const response = await fetch(`/api/v1/rods?${searchParams.toString()}`);

  if (!response.ok) {
    throw await parseApiError(response, "Nie udało się pobrać wędek");
  }

  return response.json() as Promise<RodListResponseDto>;
}

/**
 * Fetch lures list
 */
export async function fetchLures(params: FetchEquipmentParams = {}): Promise<LureListResponseDto> {
  const searchParams = buildEquipmentSearchParams(params);
  const response = await fetch(`/api/v1/lures?${searchParams.toString()}`);

  if (!response.ok) {
    throw await parseApiError(response, "Nie udało się pobrać przynęt");
  }

  return response.json() as Promise<LureListResponseDto>;
}

/**
 * Fetch groundbaits list
 */
export async function fetchGroundbaits(params: FetchEquipmentParams = {}): Promise<GroundbaitListResponseDto> {
  const searchParams = buildEquipmentSearchParams(params);
  const response = await fetch(`/api/v1/groundbaits?${searchParams.toString()}`);

  if (!response.ok) {
    throw await parseApiError(response, "Nie udało się pobrać zanęt");
  }

  return response.json() as Promise<GroundbaitListResponseDto>;
}

/**
 * Generic fetch equipment list by type
 */
export async function fetchEquipmentList(
  type: EquipmentType,
  params: FetchEquipmentParams = {}
): Promise<ListResponse<EquipmentDto>> {
  switch (type) {
    case "rods":
      return fetchRods(params);
    case "lures":
      return fetchLures(params);
    case "groundbaits":
      return fetchGroundbaits(params);
  }
}

/**
 * Create new equipment
 */
export async function createEquipment(type: EquipmentType, data: CreateEquipmentCommand): Promise<EquipmentDto> {
  const response = await fetch(`/api/v1/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nie udało się utworzyć elementu");
  }

  return response.json() as Promise<EquipmentDto>;
}

/**
 * Update existing equipment
 */
export async function updateEquipment(
  type: EquipmentType,
  id: string,
  data: UpdateEquipmentCommand
): Promise<EquipmentDto> {
  const response = await fetch(`/api/v1/${type}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nie udało się zaktualizować elementu");
  }

  return response.json() as Promise<EquipmentDto>;
}

/**
 * Delete equipment (soft-delete)
 */
export async function deleteEquipment(type: EquipmentType, id: string): Promise<void> {
  const response = await fetch(`/api/v1/${type}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    throw await parseApiError(response, "Nie udało się usunąć elementu");
  }
}

/**
 * Fetch single equipment item by ID
 */
export async function fetchEquipmentById(type: EquipmentType, id: string): Promise<EquipmentDto> {
  const response = await fetch(`/api/v1/${type}/${id}`);

  if (!response.ok) {
    throw await parseApiError(response, "Nie znaleziono elementu");
  }

  return response.json() as Promise<EquipmentDto>;
}
