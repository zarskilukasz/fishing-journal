import { describe, it, expect, vi } from "vitest";
import { tripService } from "./trip.service";
import type { SupabaseClient } from "@/db/supabase.client";
import type { TripStatus } from "@/types";

// ---------------------------------------------------------------------------
// Mock Helpers
// ---------------------------------------------------------------------------

/**
 * Mock Supabase query builder factory
 */
function createMockQuery() {
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Store resolved value for async iteration
    _resolvedValue: { data: [], error: null } as { data: unknown; error: unknown },
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

type MockQuery = ReturnType<typeof createMockQuery>;

/**
 * Mock Supabase client factory
 */
function createMockSupabase() {
  const mockQueries: Record<string, MockQuery> = {};

  const supabase = {
    from: vi.fn((table: string) => {
      if (!mockQueries[table]) {
        mockQueries[table] = createMockQuery();
      }
      return mockQueries[table];
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
    },
    _mockQueries: mockQueries,
  } as unknown as SupabaseClient & { _mockQueries: Record<string, MockQuery> };

  return supabase;
}

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const validTripId = "123e4567-e89b-12d3-a456-426614174000";
const validUserId = "user-123-456-789";

const mockTripRow = {
  id: validTripId,
  user_id: validUserId,
  started_at: "2025-01-15T10:00:00Z",
  ended_at: null,
  status: "active" as TripStatus,
  location_lat: 52.1,
  location_lng: 21.0,
  location_label: "Lake XYZ",
  deleted_at: null,
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2025-01-15T10:00:00Z",
};

const mockTripRowWithCatches = {
  ...mockTripRow,
  catches: [{ count: 5 }],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tripService", () => {
  describe("list", () => {
    it("returns list of trips with catch_count", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;

      const mockTrips = [
        { ...mockTripRowWithCatches, id: "trip-1" },
        { ...mockTripRowWithCatches, id: "trip-2", catches: [{ count: 3 }] },
      ];
      tripsQuery._resolvedValue = { data: mockTrips, error: null };

      const result = await tripService.list(supabase, {
        limit: 20,
        sort: "started_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.data[0].summary.catch_count).toBe(5);
      expect(result.data?.data[1].summary.catch_count).toBe(3);
    });

    it("returns next_cursor when there are more results", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;

      // 3 items when limit is 2 means there's a next page
      const mockTrips = [
        { ...mockTripRowWithCatches, id: "trip-1" },
        { ...mockTripRowWithCatches, id: "trip-2" },
        { ...mockTripRowWithCatches, id: "trip-3" },
      ];
      tripsQuery._resolvedValue = { data: mockTrips, error: null };

      const result = await tripService.list(supabase, {
        limit: 2,
        sort: "started_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.page.next_cursor).not.toBeNull();
    });

    it("applies status filter", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;
      tripsQuery._resolvedValue = { data: [], error: null };

      await tripService.list(supabase, {
        status: "active",
        limit: 20,
        sort: "started_at",
        order: "desc",
        include_deleted: false,
      });

      expect(tripsQuery.eq).toHaveBeenCalledWith("status", "active");
    });

    it("applies date range filters", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;
      tripsQuery._resolvedValue = { data: [], error: null };

      await tripService.list(supabase, {
        from: "2025-01-01T00:00:00Z",
        to: "2025-12-31T23:59:59Z",
        limit: 20,
        sort: "started_at",
        order: "desc",
        include_deleted: false,
      });

      expect(tripsQuery.gte).toHaveBeenCalledWith("started_at", "2025-01-01T00:00:00Z");
      expect(tripsQuery.lte).toHaveBeenCalledWith("started_at", "2025-12-31T23:59:59Z");
    });

    it("returns error for invalid cursor", async () => {
      const supabase = createMockSupabase();

      const result = await tripService.list(supabase, {
        cursor: "invalid-cursor",
        limit: 20,
        sort: "started_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("cursor");
    });

    it("transforms location fields to location object", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;

      tripsQuery._resolvedValue = { data: [mockTripRowWithCatches], error: null };

      const result = await tripService.list(supabase, {
        limit: 20,
        sort: "started_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.data[0].location).toEqual({
        lat: 52.1,
        lng: 21.0,
        label: "Lake XYZ",
      });
    });

    it("returns null location when lat/lng are null", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = supabase._mockQueries["trips"] || createMockQuery();
      supabase._mockQueries["trips"] = tripsQuery;

      const tripWithoutLocation = {
        ...mockTripRowWithCatches,
        location_lat: null,
        location_lng: null,
        location_label: null,
      };
      tripsQuery._resolvedValue = { data: [tripWithoutLocation], error: null };

      const result = await tripService.list(supabase, {
        limit: 20,
        sort: "started_at",
        order: "desc",
        include_deleted: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.data[0].location).toBeNull();
    });
  });

  describe("getById", () => {
    it("returns trip data for valid ID", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({ data: mockTripRow, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.getById(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe(validTripId);
      expect(result.data?.location).toEqual({
        lat: 52.1,
        lng: 21.0,
        label: "Lake XYZ",
      });
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.getById(supabase, "non-existent-id");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("includes equipment when requested", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      const tripWithEquipment = {
        ...mockTripRow,
        trip_rods: [{ id: "r1", rod_id: "rod-1", rod_name_snapshot: "Wędka A" }],
        trip_lures: [{ id: "l1", lure_id: "lure-1", lure_name_snapshot: "Przynęta A" }],
        trip_groundbaits: [],
      };
      tripsQuery.single.mockResolvedValue({ data: tripWithEquipment, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.getById(supabase, validTripId, ["rods", "lures", "groundbaits"]);

      expect(result.error).toBeNull();
      expect(result.data?.equipment).toBeDefined();
      expect(result.data?.equipment?.rods).toHaveLength(1);
      expect(result.data?.equipment?.rods[0].name_snapshot).toBe("Wędka A");
      expect(result.data?.equipment?.lures).toHaveLength(1);
      expect(result.data?.equipment?.groundbaits).toHaveLength(0);
    });

    it("includes catches when requested", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      const tripWithCatches = {
        ...mockTripRow,
        catches: [
          {
            id: "catch-1",
            caught_at: "2025-01-15T12:00:00Z",
            weight_g: 1500,
            length_mm: 450,
            photo_path: "photos/catch-1.jpg",
            lure_id: "lure-1",
            groundbait_id: "gb-1",
            lure_name_snapshot: "Spinner",
            groundbait_name_snapshot: "Mix",
            fish_species: { id: "species-1", name: "Pike" },
          },
        ],
      };
      tripsQuery.single.mockResolvedValue({ data: tripWithCatches, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.getById(supabase, validTripId, ["catches"]);

      expect(result.error).toBeNull();
      expect(result.data?.catches).toHaveLength(1);
      expect(result.data?.catches?.[0].species.name).toBe("Pike");
      expect(result.data?.catches?.[0].weight_g).toBe(1500);
    });

    it("includes weather_current when requested", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      const tripWithWeather = {
        ...mockTripRow,
        weather_snapshots: [{ id: "ws-1", source: "api" }],
      };
      tripsQuery.single.mockResolvedValue({ data: tripWithWeather, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.getById(supabase, validTripId, ["weather_current"]);

      expect(result.error).toBeNull();
      expect(result.data?.weather_current).toEqual({
        snapshot_id: "ws-1",
        source: "api",
      });
    });
  });

  describe("create", () => {
    it("creates trip with valid data", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      const createdTrip = { ...mockTripRow };
      tripsQuery.single.mockResolvedValue({ data: createdTrip, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.create(supabase, validUserId, {
        started_at: "2025-01-15T10:00:00Z",
        ended_at: null,
        status: "active",
        location: { lat: 52.1, lng: 21.0, label: "Lake XYZ" },
        copy_equipment_from_last_trip: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe(validTripId);
      expect(tripsQuery.insert).toHaveBeenCalled();
    });

    it("creates trip with null location", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      const createdTrip = {
        ...mockTripRow,
        location_lat: null,
        location_lng: null,
        location_label: null,
      };
      tripsQuery.single.mockResolvedValue({ data: createdTrip, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.create(supabase, validUserId, {
        started_at: "2025-01-15T10:00:00Z",
        ended_at: null,
        status: "draft",
        location: null,
        copy_equipment_from_last_trip: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.location).toBeNull();
    });

    it("copies equipment from last trip when requested", async () => {
      const supabase = createMockSupabase();

      // Mock trips query for create
      const tripsQuery = createMockQuery();
      const createdTrip = { ...mockTripRow, id: "new-trip-id" };
      tripsQuery.single.mockResolvedValue({ data: createdTrip, error: null });

      // Mock trips query for finding last trip
      const lastTripQuery = createMockQuery();
      lastTripQuery.maybeSingle.mockResolvedValue({ data: { id: "last-trip-id" }, error: null });

      // Mock equipment queries
      const rodsQuery = createMockQuery();
      rodsQuery._resolvedValue = { data: [{ rod_id: "rod-1", rod_name_snapshot: "Wędka" }], error: null };

      const luresQuery = createMockQuery();
      luresQuery._resolvedValue = { data: [], error: null };

      const groundbaitsQuery = createMockQuery();
      groundbaitsQuery._resolvedValue = { data: [], error: null };

      let tripQueryCount = 0;
      supabase.from = vi.fn((table: string) => {
        if (table === "trips") {
          tripQueryCount++;
          // First call is for create (insert), second is for finding last trip
          if (tripQueryCount === 1) return tripsQuery;
          return lastTripQuery;
        }
        if (table === "trip_rods") return rodsQuery;
        if (table === "trip_lures") return luresQuery;
        if (table === "trip_groundbaits") return groundbaitsQuery;
        return createMockQuery();
      });

      const result = await tripService.create(supabase, validUserId, {
        started_at: "2025-01-15T10:00:00Z",
        ended_at: null,
        status: "active",
        location: null,
        copy_equipment_from_last_trip: true,
      });

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe("new-trip-id");
    });

    it("handles database error", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "23514", message: "Check constraint violation" },
      });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.create(supabase, validUserId, {
        started_at: "2025-01-15T10:00:00Z",
        ended_at: null,
        status: "active",
        location: null,
        copy_equipment_from_last_trip: false,
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe("quickStart", () => {
    it("creates trip with now() timestamp and active status", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      const createdTrip = {
        ...mockTripRow,
        status: "active",
        location_lat: null,
        location_lng: null,
        location_label: null,
      };
      tripsQuery.single.mockResolvedValue({ data: createdTrip, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.quickStart(supabase, validUserId, {
        copy_equipment_from_last_trip: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.trip.status).toBe("active");
      expect(result.data?.copied_equipment).toEqual({
        rod_ids: [],
        lure_ids: [],
        groundbait_ids: [],
      });
    });

    it("returns copied equipment IDs when copy_equipment is true", async () => {
      const supabase = createMockSupabase();

      // Mock trips query for create
      const tripsQuery = createMockQuery();
      const createdTrip = { ...mockTripRow, id: "new-trip-id" };
      tripsQuery.single.mockResolvedValue({ data: createdTrip, error: null });

      // Mock finding last trip
      const lastTripQuery = createMockQuery();
      lastTripQuery.maybeSingle.mockResolvedValue({ data: { id: "last-trip-id" }, error: null });

      // Mock equipment queries with data
      const rodsQuery = createMockQuery();
      rodsQuery._resolvedValue = {
        data: [
          { rod_id: "rod-1", rod_name_snapshot: "Wędka A" },
          { rod_id: "rod-2", rod_name_snapshot: "Wędka B" },
        ],
        error: null,
      };

      const luresQuery = createMockQuery();
      luresQuery._resolvedValue = { data: [{ lure_id: "lure-1", lure_name_snapshot: "Przynęta" }], error: null };

      const groundbaitsQuery = createMockQuery();
      groundbaitsQuery._resolvedValue = { data: [], error: null };

      let tripQueryCount = 0;
      supabase.from = vi.fn((table: string) => {
        if (table === "trips") {
          tripQueryCount++;
          if (tripQueryCount === 1) return tripsQuery;
          return lastTripQuery;
        }
        if (table === "trip_rods") return rodsQuery;
        if (table === "trip_lures") return luresQuery;
        if (table === "trip_groundbaits") return groundbaitsQuery;
        return createMockQuery();
      });

      const result = await tripService.quickStart(supabase, validUserId, {
        copy_equipment_from_last_trip: true,
      });

      expect(result.error).toBeNull();
      expect(result.data?.copied_equipment.rod_ids).toEqual(["rod-1", "rod-2"]);
      expect(result.data?.copied_equipment.lure_ids).toEqual(["lure-1"]);
      expect(result.data?.copied_equipment.groundbait_ids).toEqual([]);
    });
  });

  describe("update", () => {
    it("updates trip with valid data", async () => {
      const supabase = createMockSupabase();

      // First query - fetch existing trip
      const fetchQuery = createMockQuery();
      fetchQuery.single.mockResolvedValue({ data: mockTripRow, error: null });

      // Second query - update
      const updateQuery = createMockQuery();
      const updatedTrip = { ...mockTripRow, location_label: "Updated Lake" };
      updateQuery.single.mockResolvedValue({ data: updatedTrip, error: null });

      let callCount = 0;
      supabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return fetchQuery;
        return updateQuery;
      });

      const result = await tripService.update(supabase, validTripId, {
        location: { lat: 52.1, lng: 21.0, label: "Updated Lake" },
      });

      expect(result.error).toBeNull();
      expect(result.data?.location?.label).toBe("Updated Lake");
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.update(supabase, "non-existent-id", {
        status: "closed",
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });

    it("validates ended_at >= started_at with existing data", async () => {
      const supabase = createMockSupabase();
      const fetchQuery = createMockQuery();
      fetchQuery.single.mockResolvedValue({ data: mockTripRow, error: null });

      supabase.from = vi.fn().mockReturnValue(fetchQuery);

      const result = await tripService.update(supabase, validTripId, {
        ended_at: "2025-01-15T09:00:00Z", // Before started_at
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("ended_at");
    });

    it("validates status closed requires ended_at", async () => {
      const supabase = createMockSupabase();
      const fetchQuery = createMockQuery();
      // Trip without ended_at
      fetchQuery.single.mockResolvedValue({
        data: { ...mockTripRow, ended_at: null },
        error: null,
      });

      supabase.from = vi.fn().mockReturnValue(fetchQuery);

      const result = await tripService.update(supabase, validTripId, {
        status: "closed",
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("ended_at");
    });
  });

  describe("close", () => {
    it("closes trip with valid ended_at", async () => {
      const supabase = createMockSupabase();

      // Fetch query
      const fetchQuery = createMockQuery();
      fetchQuery.single.mockResolvedValue({
        data: { started_at: "2025-01-15T10:00:00Z" },
        error: null,
      });

      // Update query
      const updateQuery = createMockQuery();
      const closedTrip = {
        ...mockTripRow,
        status: "closed",
        ended_at: "2025-01-15T14:00:00Z",
      };
      updateQuery.single.mockResolvedValue({ data: closedTrip, error: null });

      let callCount = 0;
      supabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return fetchQuery;
        return updateQuery;
      });

      const result = await tripService.close(supabase, validTripId, "2025-01-15T14:00:00Z");

      expect(result.error).toBeNull();
      expect(result.data?.status).toBe("closed");
      expect(result.data?.ended_at).toBe("2025-01-15T14:00:00Z");
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.close(supabase, "non-existent-id", "2025-01-15T14:00:00Z");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });

    it("validates ended_at >= started_at", async () => {
      const supabase = createMockSupabase();
      const fetchQuery = createMockQuery();
      fetchQuery.single.mockResolvedValue({
        data: { started_at: "2025-01-15T10:00:00Z" },
        error: null,
      });

      supabase.from = vi.fn().mockReturnValue(fetchQuery);

      const result = await tripService.close(supabase, validTripId, "2025-01-15T09:00:00Z"); // Before started_at

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("ended_at");
    });
  });

  describe("softDelete", () => {
    it("soft deletes trip successfully", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.softDelete(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(tripsQuery.update).toHaveBeenCalled();
    });

    it("returns not_found when trip does not exist", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.softDelete(supabase, "non-existent-id");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("returns not_found when trip already deleted", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      // No rows updated because deleted_at filter didn't match
      tripsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.softDelete(supabase, validTripId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });
  });

  describe("copyEquipmentFromLastTrip", () => {
    it("returns empty arrays when no previous trip exists", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      tripsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await tripService.copyEquipmentFromLastTrip(supabase, validUserId, "new-trip-id");

      expect(result).toEqual({
        rod_ids: [],
        lure_ids: [],
        groundbait_ids: [],
      });
    });

    it("copies all equipment types from last trip", async () => {
      const supabase = createMockSupabase();

      const tripsQuery = createMockQuery();
      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: "last-trip-id" }, error: null });

      const rodsQuery = createMockQuery();
      rodsQuery._resolvedValue = {
        data: [{ rod_id: "rod-1", rod_name_snapshot: "Wędka A" }],
        error: null,
      };

      const luresQuery = createMockQuery();
      luresQuery._resolvedValue = {
        data: [
          { lure_id: "lure-1", lure_name_snapshot: "Przynęta A" },
          { lure_id: "lure-2", lure_name_snapshot: "Przynęta B" },
        ],
        error: null,
      };

      const groundbaitsQuery = createMockQuery();
      groundbaitsQuery._resolvedValue = {
        data: [{ groundbait_id: "gb-1", groundbait_name_snapshot: "Zanęta" }],
        error: null,
      };

      supabase.from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "trip_rods") return rodsQuery;
        if (table === "trip_lures") return luresQuery;
        if (table === "trip_groundbaits") return groundbaitsQuery;
        return createMockQuery();
      });

      const result = await tripService.copyEquipmentFromLastTrip(supabase, validUserId, "new-trip-id");

      expect(result.rod_ids).toEqual(["rod-1"]);
      expect(result.lure_ids).toEqual(["lure-1", "lure-2"]);
      expect(result.groundbait_ids).toEqual(["gb-1"]);
    });
  });

  describe("mapRowToDto", () => {
    it("transforms row to DTO with location object", () => {
      const result = tripService.mapRowToDto(mockTripRow);

      expect(result.id).toBe(validTripId);
      expect(result.location).toEqual({
        lat: 52.1,
        lng: 21.0,
        label: "Lake XYZ",
      });
      // user_id should be omitted
      expect("user_id" in result).toBe(false);
      // location_* fields should be omitted
      expect("location_lat" in result).toBe(false);
      expect("location_lng" in result).toBe(false);
      expect("location_label" in result).toBe(false);
    });

    it("returns null location when lat/lng are null", () => {
      const rowWithoutLocation = {
        ...mockTripRow,
        location_lat: null,
        location_lng: null,
        location_label: null,
      };

      const result = tripService.mapRowToDto(rowWithoutLocation);

      expect(result.location).toBeNull();
    });
  });
});
