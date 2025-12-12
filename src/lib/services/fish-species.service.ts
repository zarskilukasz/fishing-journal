import type { SupabaseClient } from "@/db/supabase.client";
import type { FishSpeciesDto, FishSpeciesListResponseDto } from "@/types";
import { encodeCursor, decodeCursor } from "@/lib/api/pagination";

/**
 * Parameters for listing fish species.
 */
interface ListParams {
  q?: string;
  limit: number;
  cursor?: string;
  sort: "name" | "created_at";
  order: "asc" | "desc";
}

/**
 * Result wrapper for service operations.
 */
interface ServiceResult<T> {
  data?: T;
  error?: { code: string; message: string };
}

/**
 * Service for fish species operations.
 * Provides read-only access to the global fish species dictionary.
 */
export class FishSpeciesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lists fish species with filtering, pagination, and sorting.
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of fish species or error
   */
  async list(params: ListParams): Promise<ServiceResult<FishSpeciesListResponseDto>> {
    const { q, limit, cursor, sort, order } = params;

    let query = this.supabase
      .from("fish_species")
      .select("id, name, created_at")
      .order(sort, { ascending: order === "asc" })
      .order("id", { ascending: order === "asc" })
      .limit(limit + 1); // +1 to check for next page

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
      // Log error for debugging (consider using a proper logger in production)
      return { error: { code: "internal_error", message: "Failed to fetch fish species" } };
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

    return {
      data: {
        data: items as FishSpeciesDto[],
        page: { limit, next_cursor: nextCursor },
      },
    };
  }

  /**
   * Gets a single fish species by ID.
   *
   * @param id - UUID of the fish species
   * @returns Fish species data or error
   */
  async getById(id: string): Promise<ServiceResult<FishSpeciesDto>> {
    const { data, error } = await this.supabase
      .from("fish_species")
      .select("id, name, created_at")
      .eq("id", id)
      .single();

    if (error) {
      // PGRST116 = no rows returned (not found)
      if (error.code === "PGRST116") {
        return { error: { code: "not_found", message: "Fish species not found" } };
      }
      // Log error for debugging (consider using a proper logger in production)
      return { error: { code: "internal_error", message: "Failed to fetch fish species" } };
    }

    return { data: data as FishSpeciesDto };
  }
}
