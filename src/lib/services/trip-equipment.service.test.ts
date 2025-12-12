import { describe, it, expect, vi } from "vitest";
import { tripEquipmentService } from "./trip-equipment.service";
import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Mock Supabase query builder factory
 */
function createMockQuery() {
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // For awaiting the query directly
    then: vi.fn(),
    // Store resolved value for async iteration
    _resolvedValue: { data: [], error: null },
  };

  // Make query thenable
  Object.defineProperty(query, "then", {
    value: function (resolve: (value: { data: unknown; error: unknown }) => void) {
      return Promise.resolve(this._resolvedValue).then(resolve);
    },
    writable: true,
  });

  return query;
}

/**
 * Mock Supabase client factory
 */
function createMockSupabase() {
  const mockQueries: Record<string, ReturnType<typeof createMockQuery>> = {};

  const supabase = {
    from: vi.fn((table: string) => {
      if (!mockQueries[table]) {
        mockQueries[table] = createMockQuery();
      }
      return mockQueries[table];
    }),
    _mockQueries: mockQueries,
  } as unknown as SupabaseClient & { _mockQueries: Record<string, ReturnType<typeof createMockQuery>> };

  return supabase;
}

describe("tripEquipmentService", () => {
  const validTripId = "123e4567-e89b-12d3-a456-426614174000";
  const validRodId = "987fcdeb-51a2-3bc4-d567-890123456789";
  const validAssignmentId = "abcdef12-3456-7890-abcd-ef1234567890";

  describe("verifyTripExists", () => {
    it("returns trip data when trip exists", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;

      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const result = await tripEquipmentService.verifyTripExists(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ id: validTripId });
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;

      tripsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      const result = await tripEquipmentService.verifyTripExists(supabase, validTripId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });
  });

  describe("listTripRods", () => {
    it("returns list of rods for valid trip", async () => {
      const supabase = createMockSupabase();

      // Mock trips query (for verifyTripExists)
      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      // Mock trip_rods query
      const rodsQuery = createMockQuery();
      const mockRods = [
        { id: "1", rod_id: validRodId, rod_name_snapshot: "Wędka A", created_at: "2025-01-01T00:00:00Z" },
        { id: "2", rod_id: "rod-2", rod_name_snapshot: "Wędka B", created_at: "2025-01-02T00:00:00Z" },
      ];
      rodsQuery._resolvedValue = { data: mockRods, error: null };

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.listTripRods(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].rod_name_snapshot).toBe("Wędka A");
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: null,
        error: null,
      });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripEquipmentService.listTripRods(supabase, validTripId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });

    it("returns empty array when no rods assigned", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      rodsQuery._resolvedValue = { data: [], error: null };

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.listTripRods(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });

  describe("addTripRod", () => {
    it("adds rod and returns created assignment", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      const createdRod = {
        id: validAssignmentId,
        rod_id: validRodId,
        rod_name_snapshot: "Nowa wędka",
        created_at: "2025-01-01T00:00:00Z",
      };
      rodsQuery.single.mockResolvedValue({
        data: createdRod,
        error: null,
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.addTripRod(supabase, validTripId, validRodId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(createdRod);
    });

    it("returns conflict when rod already assigned", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      rodsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: 'violates unique constraint "trip_rods_unique"' },
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.addTripRod(supabase, validTripId, validRodId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("conflict");
      expect(result.error?.httpStatus).toBe(409);
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: null,
        error: null,
      });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripEquipmentService.addTripRod(supabase, validTripId, validRodId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });
  });

  describe("removeTripRod", () => {
    it("removes rod assignment successfully", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      rodsQuery.maybeSingle.mockResolvedValue({
        data: { id: validAssignmentId },
        error: null,
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.removeTripRod(supabase, validTripId, validAssignmentId);

      expect(result.error).toBeNull();
    });

    it("returns not_found when assignment does not exist", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      rodsQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.removeTripRod(supabase, validTripId, validAssignmentId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: null,
        error: null,
      });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripEquipmentService.removeTripRod(supabase, validTripId, validAssignmentId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });
  });

  describe("replaceTripRods", () => {
    it("replaces all rods with new set", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      // First call to trip_rods - get current
      // Second call - delete
      // Third call - insert
      // Fourth call - list (final)
      let callCount = 0;
      const rodsQuery = createMockQuery();

      // Current assignments
      const currentRods = [{ rod_id: "old-rod-1" }, { rod_id: "old-rod-2" }];

      // New assignments after replace
      const newRods = [
        { id: "new-1", rod_id: validRodId, rod_name_snapshot: "Wędka nowa", created_at: "2025-01-01T00:00:00Z" },
      ];

      rodsQuery._resolvedValue = { data: currentRods, error: null };

      // After operations, return new list
      const finalRodsQuery = createMockQuery();
      finalRodsQuery._resolvedValue = { data: newRods, error: null };

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") {
          callCount++;
          if (callCount >= 4) {
            return finalRodsQuery;
          }
          return rodsQuery;
        }
        return createMockQuery();
      });

      const result = await tripEquipmentService.replaceTripRods(supabase, validTripId, [validRodId]);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
    });

    it("handles empty rod_ids array (removes all)", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      rodsQuery._resolvedValue = { data: [{ rod_id: "old-rod-1" }], error: null };

      const finalRodsQuery = createMockQuery();
      finalRodsQuery._resolvedValue = { data: [], error: null };

      let callCount = 0;
      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") {
          callCount++;
          if (callCount >= 3) {
            return finalRodsQuery;
          }
          return rodsQuery;
        }
        return createMockQuery();
      });

      const result = await tripEquipmentService.replaceTripRods(supabase, validTripId, []);

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });

  // Lures tests - similar pattern
  describe("listTripLures", () => {
    it("returns list of lures for valid trip", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const luresQuery = createMockQuery();
      const mockLures = [
        { id: "1", lure_id: "lure-1", lure_name_snapshot: "Przynęta A", created_at: "2025-01-01T00:00:00Z" },
      ];
      luresQuery._resolvedValue = { data: mockLures, error: null };

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_lures") return luresQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.listTripLures(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
    });
  });

  describe("addTripLure", () => {
    it("adds lure and returns created assignment", async () => {
      const supabase = createMockSupabase();
      const validLureId = "lure-123";

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const luresQuery = createMockQuery();
      const createdLure = {
        id: validAssignmentId,
        lure_id: validLureId,
        lure_name_snapshot: "Nowa przynęta",
        created_at: "2025-01-01T00:00:00Z",
      };
      luresQuery.single.mockResolvedValue({
        data: createdLure,
        error: null,
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_lures") return luresQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.addTripLure(supabase, validTripId, validLureId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(createdLure);
    });
  });

  // Groundbaits tests - similar pattern
  describe("listTripGroundbaits", () => {
    it("returns list of groundbaits for valid trip", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const groundbaitsQuery = createMockQuery();
      const mockGroundbaits = [
        {
          id: "1",
          groundbait_id: "gb-1",
          groundbait_name_snapshot: "Zanęta A",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      groundbaitsQuery._resolvedValue = { data: mockGroundbaits, error: null };

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_groundbaits") return groundbaitsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.listTripGroundbaits(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
    });
  });

  describe("addTripGroundbait", () => {
    it("adds groundbait and returns created assignment", async () => {
      const supabase = createMockSupabase();
      const validGroundbaitId = "gb-123";

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const groundbaitsQuery = createMockQuery();
      const createdGroundbait = {
        id: validAssignmentId,
        groundbait_id: validGroundbaitId,
        groundbait_name_snapshot: "Nowa zanęta",
        created_at: "2025-01-01T00:00:00Z",
      };
      groundbaitsQuery.single.mockResolvedValue({
        data: createdGroundbait,
        error: null,
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_groundbaits") return groundbaitsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.addTripGroundbait(supabase, validTripId, validGroundbaitId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(createdGroundbait);
    });
  });

  describe("error handling", () => {
    it("maps equipment owner mismatch error correctly", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      rodsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "Sprzęt należy do innego użytkownika" },
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.addTripRod(supabase, validTripId, validRodId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("equipment_owner_mismatch");
      expect(result.error?.httpStatus).toBe(409);
    });

    it("maps soft-deleted equipment error correctly", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: { id: validTripId },
        error: null,
      });

      const rodsQuery = createMockQuery();
      rodsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "Wędka została usunięta (soft-deleted)" },
      });

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        return createMockQuery();
      });

      const result = await tripEquipmentService.addTripRod(supabase, validTripId, validRodId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("equipment_soft_deleted");
      expect(result.error?.httpStatus).toBe(409);
    });
  });
});
