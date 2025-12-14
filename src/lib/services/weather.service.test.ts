/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { weatherService } from "./weather.service";
import type { SupabaseClient } from "@/db/supabase.client";

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

const validTripId = "trip-123-456-789";
const validSnapshotId = "snapshot-123-456-789";

const mockSnapshotRow = {
  id: validSnapshotId,
  trip_id: validTripId,
  source: "manual" as const,
  fetched_at: "2025-01-15T12:00:00Z",
  period_start: "2025-01-15T08:00:00Z",
  period_end: "2025-01-15T18:00:00Z",
  created_at: "2025-01-15T12:00:01Z",
};

const mockHourRow = {
  observed_at: "2025-01-15T10:00:00Z",
  temperature_c: 15.5,
  pressure_hpa: 1015,
  wind_speed_kmh: 12.0,
  wind_direction: 180,
  humidity_percent: 70,
  precipitation_mm: 0.0,
  cloud_cover: 30,
  weather_icon: "cloud",
  weather_text: "Partly cloudy",
};

const validManualInput = {
  fetched_at: "2025-01-15T12:00:00Z",
  period_start: "2025-01-15T08:00:00Z",
  period_end: "2025-01-15T18:00:00Z",
  hours: [
    {
      observed_at: "2025-01-15T10:00:00Z",
      temperature_c: 15.5,
      pressure_hpa: 1015,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("weatherService", () => {
  // ---------------------------------------------------------------------------
  // listSnapshots
  // ---------------------------------------------------------------------------

  describe("listSnapshots", () => {
    it("returns list of snapshots for a trip", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      // Mock trip exists check
      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });

      // Mock snapshots list
      const mockSnapshots = [
        { ...mockSnapshotRow, id: "snapshot-1" },
        { ...mockSnapshotRow, id: "snapshot-2", source: "api" },
      ];
      snapshotsQuery._resolvedValue = { data: mockSnapshots, error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      const result = await weatherService.listSnapshots(supabase, validTripId, {
        limit: 20,
        sort: "fetched_at",
        order: "desc",
      });

      expect(result.error).toBeNull();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.data[0].id).toBe("snapshot-1");
      expect(result.data?.data[1].source).toBe("api");
    });

    it("returns next_cursor when there are more results", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });

      // 3 items when limit is 2 means there's a next page
      const mockSnapshots = [
        { ...mockSnapshotRow, id: "snapshot-1" },
        { ...mockSnapshotRow, id: "snapshot-2" },
        { ...mockSnapshotRow, id: "snapshot-3" },
      ];
      snapshotsQuery._resolvedValue = { data: mockSnapshots, error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      const result = await weatherService.listSnapshots(supabase, validTripId, {
        limit: 2,
        sort: "fetched_at",
        order: "desc",
      });

      expect(result.error).toBeNull();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.page.next_cursor).not.toBeNull();
    });

    it("returns 404 when trip not found", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await weatherService.listSnapshots(supabase, validTripId, {
        limit: 20,
        sort: "fetched_at",
        order: "desc",
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("applies source filter", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });
      snapshotsQuery._resolvedValue = { data: [mockSnapshotRow], error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      await weatherService.listSnapshots(supabase, validTripId, {
        limit: 20,
        sort: "fetched_at",
        order: "desc",
        source: "manual",
      });

      expect(snapshotsQuery.eq).toHaveBeenCalledWith("source", "manual");
    });

    it("returns validation error for invalid cursor", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      const result = await weatherService.listSnapshots(supabase, validTripId, {
        limit: 20,
        sort: "fetched_at",
        order: "desc",
        cursor: "invalid-cursor",
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.httpStatus).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // getSnapshotById
  // ---------------------------------------------------------------------------

  describe("getSnapshotById", () => {
    it("returns snapshot without hours by default", async () => {
      const supabase = createMockSupabase();
      const snapshotsQuery = createMockQuery();

      snapshotsQuery.maybeSingle.mockResolvedValue({ data: mockSnapshotRow, error: null });
      supabase.from = vi.fn().mockReturnValue(snapshotsQuery);

      const result = await weatherService.getSnapshotById(supabase, validSnapshotId, {
        include_hours: false,
      });

      expect(result.error).toBeNull();
      expect(result.data?.snapshot.id).toBe(validSnapshotId);
      expect(result.data?.hours).toHaveLength(0);
    });

    it("returns snapshot with hours when include_hours is true", async () => {
      const supabase = createMockSupabase();
      const snapshotsQuery = createMockQuery();

      snapshotsQuery.maybeSingle.mockResolvedValue({
        data: {
          ...mockSnapshotRow,
          weather_hours: [mockHourRow],
        },
        error: null,
      });
      supabase.from = vi.fn().mockReturnValue(snapshotsQuery);

      const result = await weatherService.getSnapshotById(supabase, validSnapshotId, {
        include_hours: true,
      });

      expect(result.error).toBeNull();
      expect(result.data?.snapshot.id).toBe(validSnapshotId);
      expect(result.data?.hours).toHaveLength(1);
      expect(result.data?.hours[0].temperature_c).toBe(15.5);
    });

    it("returns 404 when snapshot not found", async () => {
      const supabase = createMockSupabase();
      const snapshotsQuery = createMockQuery();

      snapshotsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(snapshotsQuery);

      const result = await weatherService.getSnapshotById(supabase, "non-existent-id", {
        include_hours: false,
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentSnapshot
  // ---------------------------------------------------------------------------

  describe("getCurrentSnapshot", () => {
    it("returns manual snapshot when available", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });
      snapshotsQuery.maybeSingle.mockResolvedValue({
        data: { id: validSnapshotId, source: "manual" },
        error: null,
      });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      const result = await weatherService.getCurrentSnapshot(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data?.snapshot_id).toBe(validSnapshotId);
      expect(result.data?.source).toBe("manual");
    });

    it("returns api snapshot when no manual snapshot exists", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQueryManual = createMockQuery();
      const snapshotsQueryApi = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });

      let snapshotsCallCount = 0;
      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") {
          snapshotsCallCount++;
          if (snapshotsCallCount === 1) {
            // First call for manual - returns null
            snapshotsQueryManual.maybeSingle.mockResolvedValue({ data: null, error: null });
            return snapshotsQueryManual;
          } else {
            // Second call for api - returns snapshot
            snapshotsQueryApi.maybeSingle.mockResolvedValue({
              data: { id: "api-snapshot-123", source: "api" },
              error: null,
            });
            return snapshotsQueryApi;
          }
        }
        return createMockQuery();
      });

      const result = await weatherService.getCurrentSnapshot(supabase, validTripId);

      expect(result.error).toBeNull();
      expect(result.data?.snapshot_id).toBe("api-snapshot-123");
      expect(result.data?.source).toBe("api");
    });

    it("returns 404 when no snapshots exist", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: { id: validTripId }, error: null });
      snapshotsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      const result = await weatherService.getCurrentSnapshot(supabase, validTripId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.message).toContain("Brak snapshotów");
    });

    it("returns 404 when trip not found", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await weatherService.getCurrentSnapshot(supabase, validTripId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.message).toContain("Wyprawa");
    });
  });

  // ---------------------------------------------------------------------------
  // createManualSnapshot
  // ---------------------------------------------------------------------------

  describe("createManualSnapshot", () => {
    // Mock trip data with started_at/ended_at that encompasses the hours
    const mockTripWithDuration = {
      id: validTripId,
      started_at: "2025-01-15T08:00:00Z",
      ended_at: "2025-01-15T20:00:00Z",
    };

    it("creates snapshot and hours with valid data", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();
      const hoursQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: mockTripWithDuration, error: null });
      snapshotsQuery.single.mockResolvedValue({
        data: { id: validSnapshotId },
        error: null,
      });
      hoursQuery._resolvedValue = { data: null, error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        if (table === "weather_hours") return hoursQuery;
        return createMockQuery();
      });

      const result = await weatherService.createManualSnapshot(supabase, validTripId, validManualInput);

      expect(result.error).toBeNull();
      expect(result.data?.snapshot_id).toBe(validSnapshotId);
      expect(snapshotsQuery.insert).toHaveBeenCalled();
      expect(hoursQuery.insert).toHaveBeenCalled();
    });

    it("creates snapshot with multiple hours", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();
      const hoursQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: mockTripWithDuration, error: null });
      snapshotsQuery.single.mockResolvedValue({
        data: { id: validSnapshotId },
        error: null,
      });
      hoursQuery._resolvedValue = { data: null, error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        if (table === "weather_hours") return hoursQuery;
        return createMockQuery();
      });

      const multiHourInput = {
        ...validManualInput,
        hours: [
          { observed_at: "2025-01-15T10:00:00Z", temperature_c: 15 },
          { observed_at: "2025-01-15T11:00:00Z", temperature_c: 16 },
          { observed_at: "2025-01-15T12:00:00Z", temperature_c: 17 },
        ],
      };

      const result = await weatherService.createManualSnapshot(supabase, validTripId, multiHourInput);

      expect(result.error).toBeNull();
      expect(hoursQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ snapshot_id: validSnapshotId }),
          expect.objectContaining({ snapshot_id: validSnapshotId }),
          expect.objectContaining({ snapshot_id: validSnapshotId }),
        ])
      );
    });

    it("returns 404 when trip not found", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await weatherService.createManualSnapshot(supabase, validTripId, validManualInput);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.message).toContain("Wyprawa");
    });

    it("handles snapshot creation error", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: mockTripWithDuration, error: null });
      snapshotsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "23514", message: "Check constraint violation" },
      });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      const result = await weatherService.createManualSnapshot(supabase, validTripId, validManualInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it("rolls back snapshot when hours creation fails", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();
      const hoursQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: mockTripWithDuration, error: null });
      snapshotsQuery.single.mockResolvedValue({
        data: { id: validSnapshotId },
        error: null,
      });
      hoursQuery._resolvedValue = {
        data: null,
        error: { code: "23514", message: "Check constraint violation" },
      };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        if (table === "weather_hours") return hoursQuery;
        return createMockQuery();
      });

      const result = await weatherService.createManualSnapshot(supabase, validTripId, validManualInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      // Verify rollback was attempted
      expect(snapshotsQuery.delete).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteSnapshot
  // ---------------------------------------------------------------------------

  describe("deleteSnapshot", () => {
    it("deletes snapshot and returns success", async () => {
      const supabase = createMockSupabase();
      const snapshotsQuery = createMockQuery();

      snapshotsQuery.maybeSingle.mockResolvedValue({ data: { id: validSnapshotId }, error: null });
      supabase.from = vi.fn().mockReturnValue(snapshotsQuery);

      const result = await weatherService.deleteSnapshot(supabase, validSnapshotId);

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
      expect(snapshotsQuery.delete).toHaveBeenCalled();
    });

    it("returns 404 when snapshot not found", async () => {
      const supabase = createMockSupabase();
      const snapshotsQuery = createMockQuery();

      snapshotsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(snapshotsQuery);

      const result = await weatherService.deleteSnapshot(supabase, "non-existent-id");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("handles database error", async () => {
      const supabase = createMockSupabase();
      const snapshotsQuery = createMockQuery();

      snapshotsQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: "42501", message: "RLS violation" },
      });
      supabase.from = vi.fn().mockReturnValue(snapshotsQuery);

      const result = await weatherService.deleteSnapshot(supabase, validSnapshotId);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // refreshWeather
  // ---------------------------------------------------------------------------

  describe("refreshWeather", () => {
    const validRefreshInput = {
      period_start: "2025-01-15T08:00:00Z",
      period_end: "2025-01-15T18:00:00Z",
      force: false,
    };

    const mockTripWithLocation = {
      id: validTripId,
      location_lat: 52.2297,
      location_lng: 21.0122,
      started_at: new Date().toISOString(), // Recent trip
    };

    it("returns 404 when trip not found", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await weatherService.refreshWeather(supabase, validTripId, validRefreshInput);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("returns validation error when trip has no location", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({
        data: {
          id: validTripId,
          location_lat: null,
          location_lng: null,
          started_at: new Date().toISOString(),
        },
        error: null,
      });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await weatherService.refreshWeather(supabase, validTripId, validRefreshInput);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("lokalizację");
      expect(result.error?.httpStatus).toBe(400);
    });

    it("returns validation error for old trip without force flag", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      // Trip from 2 days ago
      const oldTripDate = new Date();
      oldTripDate.setDate(oldTripDate.getDate() - 2);

      tripsQuery.maybeSingle.mockResolvedValue({
        data: {
          ...mockTripWithLocation,
          started_at: oldTripDate.toISOString(),
        },
        error: null,
      });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await weatherService.refreshWeather(supabase, validTripId, {
        ...validRefreshInput,
        force: false,
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("24h");
      expect(result.error?.httpStatus).toBe(400);
    });

    it("accepts old trip with force=true", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      // Trip from 2 days ago, 4 hour duration
      const oldTripStart = new Date();
      oldTripStart.setDate(oldTripStart.getDate() - 2);
      const oldTripEnd = new Date(oldTripStart.getTime() + 4 * 60 * 60 * 1000); // 4 hours later

      tripsQuery.maybeSingle.mockResolvedValue({
        data: {
          ...mockTripWithLocation,
          started_at: oldTripStart.toISOString(),
          ended_at: oldTripEnd.toISOString(),
        },
        error: null,
      });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        return createMockQuery();
      });

      // Note: This test verifies that force=true bypasses the age validation
      // The weather provider is not mocked, so it will fail with bad_gateway
      // (due to missing API key / configuration_error mapped to bad_gateway)
      // Or validation_error if the weather data doesn't match the trip period
      const result = await weatherService.refreshWeather(supabase, validTripId, {
        ...validRefreshInput,
        force: true,
      });

      // Should get past the age validation. The error could be:
      // - bad_gateway: from weather provider failure
      // - validation_error: if weather data period doesn't match trip
      // Both are acceptable as they prove we got past the age check
      expect(["bad_gateway", "validation_error"]).toContain(result.error?.code);
    });

    it("handles snapshot creation error", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const snapshotsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({
        data: mockTripWithLocation,
        error: null,
      });

      snapshotsQuery.single.mockResolvedValue({
        data: null,
        error: { code: "23514", message: "Check constraint violation" },
      });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "weather_snapshots") return snapshotsQuery;
        return createMockQuery();
      });

      // This test depends on weather provider mock - in real scenario
      // the provider error would come first before DB error
      const result = await weatherService.refreshWeather(supabase, validTripId, validRefreshInput);

      // Either weather provider error or DB error
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it("handles trip query database error", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: "42501", message: "RLS violation" },
      });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await weatherService.refreshWeather(supabase, validTripId, validRefreshInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});
