import { describe, it, expect, vi } from "vitest";
import { EquipmentService, createRodsService, createLuresService, createGroundbaitsService } from "./equipment.service";
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
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
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

describe("EquipmentService", () => {
  describe("factory functions", () => {
    it("createRodsService creates service for rods table", () => {
      const supabase = createMockSupabase();
      const service = createRodsService(supabase);

      expect(service).toBeInstanceOf(EquipmentService);
    });

    it("createLuresService creates service for lures table", () => {
      const supabase = createMockSupabase();
      const service = createLuresService(supabase);

      expect(service).toBeInstanceOf(EquipmentService);
    });

    it("createGroundbaitsService creates service for groundbaits table", () => {
      const supabase = createMockSupabase();
      const service = createGroundbaitsService(supabase);

      expect(service).toBeInstanceOf(EquipmentService);
    });
  });

  describe("list", () => {
    it("returns list of equipment with default params", async () => {
      const mockData = [
        {
          id: "1",
          user_id: "user-1",
          name: "Shimano Rod",
          deleted_at: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "2",
          user_id: "user-1",
          name: "Daiwa Rod",
          deleted_at: null,
          created_at: "2025-01-02T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      const supabase = createMockSupabase({ data: mockData });
      const service = new EquipmentService(supabase, "rods");

      const result = await service.list({
        limit: 20,
        sort: "created_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.page.limit).toBe(20);
      expect(result.data?.page.next_cursor).toBeNull();
    });

    it("removes user_id from returned DTOs", async () => {
      const mockData = [
        {
          id: "1",
          user_id: "user-1",
          name: "Rod",
          deleted_at: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const supabase = createMockSupabase({ data: mockData });
      const service = new EquipmentService(supabase, "rods");

      const result = await service.list({
        limit: 20,
        sort: "created_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.data?.data[0]).not.toHaveProperty("user_id");
      expect(result.data?.data[0]).toHaveProperty("id");
      expect(result.data?.data[0]).toHaveProperty("name");
    });

    it("returns next_cursor when there are more results", async () => {
      const mockData = [
        {
          id: "1",
          user_id: "user-1",
          name: "Rod A",
          deleted_at: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "2",
          user_id: "user-1",
          name: "Rod B",
          deleted_at: null,
          created_at: "2025-01-02T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "3",
          user_id: "user-1",
          name: "Rod C",
          deleted_at: null,
          created_at: "2025-01-03T00:00:00Z",
          updated_at: "2025-01-03T00:00:00Z",
        },
      ];

      const supabase = createMockSupabase({ data: mockData });
      const service = new EquipmentService(supabase, "rods");

      const result = await service.list({
        limit: 2,
        sort: "created_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.page.next_cursor).not.toBeNull();
    });

    it("applies search filter when q is provided", async () => {
      const supabase = createMockSupabase({ data: [] });
      const service = new EquipmentService(supabase, "rods");

      await service.list({
        q: "shimano",
        limit: 20,
        sort: "created_at",
        order: "desc",
        include_deleted: false,
      });

      const mockQuery = (supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(mockQuery.ilike).toHaveBeenCalledWith("name", "%shimano%");
    });

    it("excludes deleted items by default", async () => {
      const supabase = createMockSupabase({ data: [] });
      const service = new EquipmentService(supabase, "rods");

      await service.list({
        limit: 20,
        sort: "created_at",
        order: "desc",
        include_deleted: false,
      });

      const mockQuery = (supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("does not filter deleted items when include_deleted is true", async () => {
      const supabase = createMockSupabase({ data: [] });
      const service = new EquipmentService(supabase, "rods");

      await service.list({
        limit: 20,
        sort: "created_at",
        order: "desc",
        include_deleted: true,
      });

      const mockQuery = (supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(mockQuery.is).not.toHaveBeenCalled();
    });

    it("returns error for invalid cursor", async () => {
      const supabase = createMockSupabase({ data: [] });
      const service = new EquipmentService(supabase, "rods");

      const result = await service.list({
        cursor: "invalid-cursor",
        limit: 20,
        sort: "created_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("cursor");
    });

    it("returns internal_error when database fails", async () => {
      const supabase = createMockSupabase({
        error: { message: "Database connection failed", code: "PGRST000" },
      });
      const service = new EquipmentService(supabase, "rods");

      const result = await service.list({
        limit: 20,
        sort: "created_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("internal_error");
    });
  });

  describe("getById", () => {
    it("returns equipment for valid ID", async () => {
      const mockData = {
        id: "uuid-1",
        user_id: "user-1",
        name: "Shimano Rod",
        deleted_at: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({ data: mockData, error: null });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.getById("uuid-1");

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data).not.toHaveProperty("user_id");
      expect(result.data?.name).toBe("Shimano Rod");
    });

    it("returns not_found error when equipment does not exist", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.getById("non-existent-uuid");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.message).toContain("Rod");
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

      const service = new EquipmentService(supabase, "rods");

      const result = await service.getById("uuid-1");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("internal_error");
    });
  });

  describe("create", () => {
    it("creates equipment and returns DTO without user_id", async () => {
      const mockData = {
        id: "new-uuid",
        user_id: "user-1",
        name: "New Rod",
        deleted_at: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({ data: mockData, error: null });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.create({ name: "New Rod" });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data).not.toHaveProperty("user_id");
      expect(result.data?.name).toBe("New Rod");
    });

    it("returns conflict error for duplicate name", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.create({ name: "Existing Rod" });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("conflict");
      expect(result.error?.message).toContain("already exists");
    });

    it("calls insert with correct data", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: { id: "1", user_id: "u1", name: "Test", deleted_at: null, created_at: "", updated_at: "" },
        error: null,
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      await service.create({ name: "Test Rod" });

      expect(mockQuery.insert).toHaveBeenCalledWith({ name: "Test Rod" });
    });
  });

  describe("update", () => {
    it("updates equipment and returns DTO without user_id", async () => {
      const mockData = {
        id: "uuid-1",
        user_id: "user-1",
        name: "Updated Name",
        deleted_at: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      };

      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({ data: mockData, error: null });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.update("uuid-1", { name: "Updated Name" });

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data).not.toHaveProperty("user_id");
      expect(result.data?.name).toBe("Updated Name");
    });

    it("returns not_found error when equipment does not exist", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.update("non-existent-uuid", { name: "New Name" });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("not_found");
    });

    it("returns conflict error for duplicate name", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.update("uuid-1", { name: "Existing Name" });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("conflict");
    });

    it("fetches current state when no fields to update", async () => {
      const mockData = {
        id: "uuid-1",
        user_id: "user-1",
        name: "Current Name",
        deleted_at: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({ data: mockData, error: null });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.update("uuid-1", {});

      expect(result.error).toBeUndefined();
      expect(result.data?.name).toBe("Current Name");
      // Should call select not update
      expect(mockQuery.update).not.toHaveBeenCalled();
    });
  });

  describe("softDelete", () => {
    it("soft-deletes equipment and returns success", async () => {
      const mockQuery = createMockQuery({ data: [{ id: "uuid-1" }] });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.softDelete("uuid-1");

      expect(result.error).toBeUndefined();
      expect(result.data).toBeUndefined();
    });

    it("returns not_found error when equipment does not exist", async () => {
      const mockQuery = createMockQuery({ data: [] });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      const result = await service.softDelete("non-existent-uuid");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("not_found");
    });

    it("calls update with deleted_at timestamp", async () => {
      const mockQuery = createMockQuery({ data: [{ id: "uuid-1" }] });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      await service.softDelete("uuid-1");

      expect(mockQuery.update).toHaveBeenCalled();
      const updateArg = mockQuery.update.mock.calls[0][0];
      expect(updateArg).toHaveProperty("deleted_at");
      expect(typeof updateArg.deleted_at).toBe("string");
    });

    it("only deletes if not already deleted", async () => {
      const mockQuery = createMockQuery({ data: [{ id: "uuid-1" }] });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");

      await service.softDelete("uuid-1");

      expect(mockQuery.is).toHaveBeenCalledWith("deleted_at", null);
    });
  });

  describe("resource names", () => {
    it("uses 'Rod' for rods table", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "rods");
      const result = await service.getById("uuid");

      expect(result.error?.message).toContain("Rod");
    });

    it("uses 'Lure' for lures table", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "lures");
      const result = await service.getById("uuid");

      expect(result.error?.message).toContain("Lure");
    });

    it("uses 'Groundbait' for groundbaits table", async () => {
      const mockQuery = createMockQuery();
      mockQuery.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockQuery),
      } as unknown as SupabaseClient;

      const service = new EquipmentService(supabase, "groundbaits");
      const result = await service.getById("uuid");

      expect(result.error?.message).toContain("Groundbait");
    });
  });
});
