import { describe, it, expect, vi } from "vitest";
import { FishSpeciesService } from "./fish-species.service";
import type { SupabaseClient } from "@/db/supabase.client";

interface MockQueryOptions {
  data?: unknown[];
  error?: { message: string; code: string } | null;
}

// Mock Supabase client factory
function createMockSupabase(options: MockQueryOptions = {}) {
  const mockQuery = createMockQuery(options);

  return {
    from: vi.fn().mockReturnValue(mockQuery),
  } as unknown as SupabaseClient;
}

function createMockQuery(options: MockQueryOptions = {}) {
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn(),
  };

  // Make the query thenable (awaitable)
  Object.defineProperty(query, "then", {
    value: function (resolve: (value: { data: unknown; error: unknown }) => void) {
      return Promise.resolve({ data: options.data ?? [], error: options.error ?? null }).then(resolve);
    },
  });

  return query;
}

describe("FishSpeciesService", () => {
  describe("list", () => {
    it("returns list of fish species with default params", async () => {
      const mockData = [
        { id: "1", name: "Pike", created_at: "2025-01-01T00:00:00Z" },
        { id: "2", name: "Carp", created_at: "2025-01-02T00:00:00Z" },
      ];

      const supabase = createMockSupabase({ data: mockData });
      const service = new FishSpeciesService(supabase);

      const result = await service.list({
        limit: 20,
        sort: "name",
        order: "asc",
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.page.limit).toBe(20);
      expect(result.data?.page.next_cursor).toBeNull();
    });

    it("returns next_cursor when there are more results", async () => {
      // 3 items when limit is 2 means there's a next page
      const mockData = [
        { id: "1", name: "Carp", created_at: "2025-01-01T00:00:00Z" },
        { id: "2", name: "Pike", created_at: "2025-01-02T00:00:00Z" },
        { id: "3", name: "Zander", created_at: "2025-01-03T00:00:00Z" },
      ];

      const supabase = createMockSupabase({ data: mockData });
      const service = new FishSpeciesService(supabase);

      const result = await service.list({
        limit: 2,
        sort: "name",
        order: "asc",
      });

      expect(result.error).toBeUndefined();
      expect(result.data?.data).toHaveLength(2); // Only 2 items returned
      expect(result.data?.page.next_cursor).not.toBeNull();
    });

    it("applies search filter when q is provided", async () => {
      const supabase = createMockSupabase({ data: [] });
      const service = new FishSpeciesService(supabase);

      await service.list({
        q: "pike",
        limit: 20,
        sort: "name",
        order: "asc",
      });

      const mockQuery = (supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(mockQuery.ilike).toHaveBeenCalledWith("name", "%pike%");
    });

    it("returns error for invalid cursor", async () => {
      const supabase = createMockSupabase({ data: [] });
      const service = new FishSpeciesService(supabase);

      const result = await service.list({
        cursor: "invalid-cursor",
        limit: 20,
        sort: "name",
        order: "asc",
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("cursor");
    });

    it("returns internal_error when database fails", async () => {
      const supabase = createMockSupabase({
        error: { message: "Database connection failed", code: "PGRST000" },
      });
      const service = new FishSpeciesService(supabase);

      const result = await service.list({
        limit: 20,
        sort: "name",
        order: "asc",
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("internal_error");
    });
  });

  describe("getById", () => {
    it("returns fish species for valid ID", async () => {
      const mockData = { id: "uuid-1", name: "Pike", created_at: "2025-01-01T00:00:00Z" };

      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({ data: mockData, error: null });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new FishSpeciesService(supabase);

      const result = await service.getById("uuid-1");

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockData);
    });

    it("returns not_found error when species does not exist", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new FishSpeciesService(supabase);

      const result = await service.getById("non-existent-uuid");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("not_found");
    });

    it("returns internal_error for database failures", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST000", message: "Database error" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new FishSpeciesService(supabase);

      const result = await service.getById("uuid-1");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("internal_error");
    });
  });
});
