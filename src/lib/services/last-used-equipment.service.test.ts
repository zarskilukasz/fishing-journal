import { describe, it, expect, vi } from "vitest";
import { lastUsedEquipmentService } from "./last-used-equipment.service";
import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Mock query builder that simulates Supabase query chain
 */
function createMockQueryBuilder(options: { data?: unknown; error?: { message: string; code: string } | null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.data ?? null,
      error: options.error ?? null,
    }),
    // Make the builder thenable for direct await (equipment queries)
    then: vi.fn(),
  };

  // Make the query thenable (awaitable) for equipment queries
  Object.defineProperty(builder, "then", {
    value: function (resolve: (value: { data: unknown; error: unknown }) => void) {
      return Promise.resolve({
        data: options.data ?? null,
        error: options.error ?? null,
      }).then(resolve);
    },
  });

  return builder;
}

describe("lastUsedEquipmentService", () => {
  describe("getLastUsedEquipment", () => {
    it("returns not_found error when user has no trips", async () => {
      const mockTripQuery = createMockQueryBuilder({ data: null, error: null });

      const supabase = {
        from: vi.fn().mockReturnValue(mockTripQuery),
      } as unknown as SupabaseClient;

      const result = await lastUsedEquipmentService.getLastUsedEquipment(supabase, "user-123");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.message).toBe("No trips found for user");
      expect(result.error?.httpStatus).toBe(404);
      expect(result.data).toBeNull();
    });

    it("returns equipment from the last trip successfully", async () => {
      const tripId = "trip-uuid-123";
      const mockRods = [
        { rod_id: "rod-1", rod_name_snapshot: "Spinning Rod" },
        { rod_id: "rod-2", rod_name_snapshot: "Casting Rod" },
      ];
      const mockLures = [{ lure_id: "lure-1", lure_name_snapshot: "Wobbler" }];
      const mockGroundbaits = [{ groundbait_id: "gb-1", groundbait_name_snapshot: "Method Mix" }];

      // Track which table is being queried
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "trips") {
          return createMockQueryBuilder({ data: { id: tripId } });
        }
        if (table === "trip_rods") {
          const builder = createMockQueryBuilder({ data: mockRods });
          return builder;
        }
        if (table === "trip_lures") {
          const builder = createMockQueryBuilder({ data: mockLures });
          return builder;
        }
        if (table === "trip_groundbaits") {
          const builder = createMockQueryBuilder({ data: mockGroundbaits });
          return builder;
        }
        return createMockQueryBuilder({ data: null });
      });

      const supabase = {
        from: fromMock,
      } as unknown as SupabaseClient;

      const result = await lastUsedEquipmentService.getLastUsedEquipment(supabase, "user-123");

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.source_trip_id).toBe(tripId);
      expect(result.data?.rods).toEqual(mockRods);
      expect(result.data?.lures).toEqual(mockLures);
      expect(result.data?.groundbaits).toEqual(mockGroundbaits);
    });

    it("returns empty arrays when trip has no equipment assigned", async () => {
      const tripId = "trip-uuid-empty";

      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "trips") {
          return createMockQueryBuilder({ data: { id: tripId } });
        }
        // Return empty arrays for all equipment tables
        return createMockQueryBuilder({ data: [] });
      });

      const supabase = {
        from: fromMock,
      } as unknown as SupabaseClient;

      const result = await lastUsedEquipmentService.getLastUsedEquipment(supabase, "user-123");

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.source_trip_id).toBe(tripId);
      expect(result.data?.rods).toEqual([]);
      expect(result.data?.lures).toEqual([]);
      expect(result.data?.groundbaits).toEqual([]);
    });

    it("returns internal_error when trip query fails", async () => {
      const mockTripQuery = createMockQueryBuilder({
        data: null,
        error: { code: "PGRST000", message: "Database connection failed" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue(mockTripQuery),
      } as unknown as SupabaseClient;

      const result = await lastUsedEquipmentService.getLastUsedEquipment(supabase, "user-123");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("internal_error");
      expect(result.data).toBeNull();
    });

    it("returns internal_error when equipment query fails", async () => {
      const tripId = "trip-uuid-123";

      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "trips") {
          return createMockQueryBuilder({ data: { id: tripId } });
        }
        if (table === "trip_rods") {
          return createMockQueryBuilder({
            data: null,
            error: { code: "PGRST000", message: "Database error" },
          });
        }
        return createMockQueryBuilder({ data: [] });
      });

      const supabase = {
        from: fromMock,
      } as unknown as SupabaseClient;

      const result = await lastUsedEquipmentService.getLastUsedEquipment(supabase, "user-123");

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("internal_error");
      expect(result.data).toBeNull();
    });

    it("queries trips with correct filters and sorting", async () => {
      const mockTripQuery = createMockQueryBuilder({ data: null });

      const supabase = {
        from: vi.fn().mockReturnValue(mockTripQuery),
      } as unknown as SupabaseClient;

      await lastUsedEquipmentService.getLastUsedEquipment(supabase, "user-123");

      // Verify trips table was queried
      expect(supabase.from).toHaveBeenCalledWith("trips");

      // Verify query chain
      expect(mockTripQuery.select).toHaveBeenCalledWith("id");
      expect(mockTripQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockTripQuery.is).toHaveBeenCalledWith("deleted_at", null);
      expect(mockTripQuery.order).toHaveBeenCalledWith("started_at", { ascending: false });
      expect(mockTripQuery.limit).toHaveBeenCalledWith(1);
      expect(mockTripQuery.maybeSingle).toHaveBeenCalled();
    });

    it("queries equipment tables with correct trip_id filter", async () => {
      const tripId = "trip-uuid-123";
      const eqCalls: { table: string; args: unknown[] }[] = [];

      const fromMock = vi.fn().mockImplementation((table: string) => {
        const builder = createMockQueryBuilder({
          data: table === "trips" ? { id: tripId } : [],
        });

        // Track eq calls for equipment tables
        if (table !== "trips") {
          const originalEq = builder.eq;
          builder.eq = vi.fn().mockImplementation((...args: unknown[]) => {
            eqCalls.push({ table, args });
            return originalEq.apply(builder, args as [string, unknown]);
          });
        }

        return builder;
      });

      const supabase = {
        from: fromMock,
      } as unknown as SupabaseClient;

      await lastUsedEquipmentService.getLastUsedEquipment(supabase, "user-123");

      // Verify all equipment tables were queried with correct trip_id
      expect(supabase.from).toHaveBeenCalledWith("trip_rods");
      expect(supabase.from).toHaveBeenCalledWith("trip_lures");
      expect(supabase.from).toHaveBeenCalledWith("trip_groundbaits");

      // Each should have eq("trip_id", tripId)
      const tripIdCalls = eqCalls.filter((call) => call.args[0] === "trip_id" && call.args[1] === tripId);
      expect(tripIdCalls.length).toBe(3);
    });
  });
});
