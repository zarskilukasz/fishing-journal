import type { SupabaseClient } from "@/db/supabase.client";
import type { RodDto, LureDto, GroundbaitDto, ListResponse } from "@/types";
import type { EquipmentListQuery, CreateEquipmentInput, UpdateEquipmentInput } from "@/lib/schemas/equipment.schema";
import { encodeCursor, decodeCursor } from "@/lib/api/pagination";
import { mapSupabaseError } from "@/lib/errors/supabase-error-mapper";

/**
 * Supported equipment table names.
 */
export type EquipmentTable = "rods" | "lures" | "groundbaits";

/**
 * Generic equipment DTO type (all three share the same shape).
 */
export type EquipmentDto = RodDto | LureDto | GroundbaitDto;

/**
 * Result wrapper for service operations.
 */
interface ServiceResult<T> {
  data?: T;
  error?: { code: string; message: string };
}

/**
 * Transforms a database row to a DTO by removing user_id.
 */
function toDto<T extends { user_id: string }>(row: T): Omit<T, "user_id"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...rest } = row;
  return rest;
}

/**
 * Service for equipment (rods/lures/groundbaits) CRUD operations.
 * Provides a unified interface for all three equipment types.
 */
export class EquipmentService {
  constructor(
    private supabase: SupabaseClient,
    private tableName: EquipmentTable
  ) {}

  /**
   * Lists equipment with filtering, pagination, and sorting.
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of equipment or error
   */
  async list(params: EquipmentListQuery): Promise<ServiceResult<ListResponse<EquipmentDto>>> {
    const { q, include_deleted, limit, cursor, sort, order } = params;

    let query = this.supabase
      .from(this.tableName)
      .select("id, user_id, name, deleted_at, created_at, updated_at")
      .order(sort, { ascending: order === "asc" })
      .order("id", { ascending: order === "asc" })
      .limit(limit + 1); // +1 to check for next page

    // Soft-delete filter (default: exclude deleted)
    if (!include_deleted) {
      query = query.is("deleted_at", null);
    }

    // Search filter (case-insensitive substring match)
    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    // Cursor-based pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return { error: { code: "validation_error", message: "Invalid cursor format" } };
      }

      // Build keyset pagination condition
      // For ascending: (sort_field, id) > (cursor_sort_value, cursor_id)
      // For descending: (sort_field, id) < (cursor_sort_value, cursor_id)
      const operator = order === "asc" ? "gt" : "lt";
      query = query.or(
        `${sort}.${operator}.${cursorData.sortValue},and(${sort}.eq.${cursorData.sortValue},id.${operator}.${cursorData.id})`
      );
    }

    const { data, error } = await query;

    if (error) {
      return { error: { code: "internal_error", message: `Failed to fetch ${this.tableName}` } };
    }

    // Check if there are more results
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    // Generate next cursor if there are more results
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({
        sortValue: String(lastItem[sort]),
        id: lastItem.id,
      });
    }

    // Transform rows to DTOs (remove user_id)
    const dtos = items.map(toDto) as EquipmentDto[];

    return {
      data: {
        data: dtos,
        page: { limit, next_cursor: nextCursor },
      },
    };
  }

  /**
   * Gets a single equipment item by ID.
   *
   * @param id - UUID of the equipment
   * @returns Equipment data or error
   */
  async getById(id: string): Promise<ServiceResult<EquipmentDto>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("id, user_id, name, deleted_at, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error) {
      // PGRST116 = no rows returned (not found or RLS filtered)
      if (error.code === "PGRST116") {
        return { error: { code: "not_found", message: `${this.getResourceName()} not found` } };
      }
      return { error: { code: "internal_error", message: `Failed to fetch ${this.getResourceName()}` } };
    }

    return { data: toDto(data) as EquipmentDto };
  }

  /**
   * Creates a new equipment item.
   *
   * @param input - Equipment data (name)
   * @returns Created equipment or error
   */
  async create(input: CreateEquipmentInput): Promise<ServiceResult<EquipmentDto>> {
    // Get current user ID for RLS
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      return { error: { code: "unauthorized", message: "Authentication required" } };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({ name: input.name, user_id: user.id })
      .select("id, user_id, name, deleted_at, created_at, updated_at")
      .single();

    if (error) {
      // Handle unique constraint violation (duplicate name per user)
      if (error.code === "23505") {
        return {
          error: {
            code: "conflict",
            message: `${this.getResourceName()} with this name already exists`,
          },
        };
      }

      const mapped = mapSupabaseError(error);
      return { error: { code: mapped.code, message: mapped.message } };
    }

    return { data: toDto(data) as EquipmentDto };
  }

  /**
   * Updates an existing equipment item (partial update).
   *
   * @param id - UUID of the equipment to update
   * @param input - Fields to update
   * @returns Updated equipment or error
   */
  async update(id: string, input: UpdateEquipmentInput): Promise<ServiceResult<EquipmentDto>> {
    // If no fields to update, fetch and return current state
    if (Object.keys(input).length === 0) {
      return this.getById(id);
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(input)
      .eq("id", id)
      .select("id, user_id, name, deleted_at, created_at, updated_at")
      .single();

    if (error) {
      // PGRST116 = no rows returned (not found or RLS filtered)
      if (error.code === "PGRST116") {
        return { error: { code: "not_found", message: `${this.getResourceName()} not found` } };
      }

      // Handle unique constraint violation (duplicate name per user)
      if (error.code === "23505") {
        return {
          error: {
            code: "conflict",
            message: `${this.getResourceName()} with this name already exists`,
          },
        };
      }

      const mapped = mapSupabaseError(error);
      return { error: { code: mapped.code, message: mapped.message } };
    }

    return { data: toDto(data) as EquipmentDto };
  }

  /**
   * Soft-deletes an equipment item by setting deleted_at.
   *
   * @param id - UUID of the equipment to delete
   * @returns Success (void) or error
   */
  async softDelete(id: string): Promise<ServiceResult<void>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null) // Only delete if not already deleted
      .select("id");

    if (error) {
      const mapped = mapSupabaseError(error);
      return { error: { code: mapped.code, message: mapped.message } };
    }

    // If no rows were affected, the item doesn't exist or is already deleted
    if (!data || data.length === 0) {
      return { error: { code: "not_found", message: `${this.getResourceName()} not found` } };
    }

    return { data: undefined };
  }

  /**
   * Gets a human-readable resource name for error messages.
   */
  private getResourceName(): string {
    switch (this.tableName) {
      case "rods":
        return "Rod";
      case "lures":
        return "Lure";
      case "groundbaits":
        return "Groundbait";
    }
  }
}

// Pre-configured service factory functions for convenience
export const createRodsService = (supabase: SupabaseClient) => new EquipmentService(supabase, "rods");
export const createLuresService = (supabase: SupabaseClient) => new EquipmentService(supabase, "lures");
export const createGroundbaitsService = (supabase: SupabaseClient) => new EquipmentService(supabase, "groundbaits");
