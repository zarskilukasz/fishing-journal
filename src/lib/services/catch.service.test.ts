/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { catchService } from "./catch.service";
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

const validCatchId = "catch-123-456-789";
const validTripId = "trip-123-456-789";
const validSpeciesId = "species-123-456";
const validLureId = "lure-123-456";
const validGroundbaitId = "groundbait-123-456";

const mockCatchRow = {
  id: validCatchId,
  trip_id: validTripId,
  caught_at: "2025-01-15T11:00:00Z",
  species_id: validSpeciesId,
  lure_id: validLureId,
  groundbait_id: validGroundbaitId,
  lure_name_snapshot: "Wobler 5cm",
  groundbait_name_snapshot: "Zanęta waniliowa",
  weight_g: 1200,
  length_mm: 450,
  photo_path: null,
  created_at: "2025-01-15T11:01:00Z",
  updated_at: "2025-01-15T11:01:00Z",
};

const mockTripRow = {
  id: validTripId,
  started_at: "2025-01-15T08:00:00Z",
  ended_at: "2025-01-15T18:00:00Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("catchService", () => {
  describe("listByTripId", () => {
    it("returns list of catches for a trip", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      // Mock trip exists check
      tripsQuery.single.mockResolvedValue({ data: { id: validTripId }, error: null });

      // Mock catches list
      const mockCatches = [
        { ...mockCatchRow, id: "catch-1" },
        { ...mockCatchRow, id: "catch-2", weight_g: 800 },
      ];
      catchesQuery._resolvedValue = { data: mockCatches, error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const result = await catchService.listByTripId(supabase, validTripId, {
        limit: 20,
        sort: "caught_at",
        order: "desc",
      });

      expect(result.error).toBeNull();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.data[0].id).toBe("catch-1");
      expect(result.data?.data[1].weight_g).toBe(800);
    });

    it("returns next_cursor when there are more results", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: { id: validTripId }, error: null });

      // 3 items when limit is 2 means there's a next page
      const mockCatches = [
        { ...mockCatchRow, id: "catch-1" },
        { ...mockCatchRow, id: "catch-2" },
        { ...mockCatchRow, id: "catch-3" },
      ];
      catchesQuery._resolvedValue = { data: mockCatches, error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const result = await catchService.listByTripId(supabase, validTripId, {
        limit: 2,
        sort: "caught_at",
        order: "desc",
      });

      expect(result.error).toBeNull();
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.page.next_cursor).not.toBeNull();
    });

    it("returns 404 when trip not found", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await catchService.listByTripId(supabase, validTripId, {
        limit: 20,
        sort: "caught_at",
        order: "desc",
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("applies species_id filter", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: { id: validTripId }, error: null });
      catchesQuery._resolvedValue = { data: [mockCatchRow], error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      await catchService.listByTripId(supabase, validTripId, {
        limit: 20,
        sort: "caught_at",
        order: "desc",
        species_id: validSpeciesId,
      });

      expect(catchesQuery.eq).toHaveBeenCalledWith("species_id", validSpeciesId);
    });

    it("applies date range filters", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: { id: validTripId }, error: null });
      catchesQuery._resolvedValue = { data: [], error: null };

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const fromDate = "2025-01-15T10:00:00Z";
      const toDate = "2025-01-15T12:00:00Z";

      await catchService.listByTripId(supabase, validTripId, {
        limit: 20,
        sort: "caught_at",
        order: "desc",
        from: fromDate,
        to: toDate,
      });

      expect(catchesQuery.gte).toHaveBeenCalledWith("caught_at", fromDate);
      expect(catchesQuery.lte).toHaveBeenCalledWith("caught_at", toDate);
    });
  });

  describe("getById", () => {
    it("returns catch when found", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.single.mockResolvedValue({ data: mockCatchRow, error: null });
      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.getById(supabase, validCatchId);

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe(validCatchId);
      expect(result.data?.lure_name_snapshot).toBe("Wobler 5cm");
    });

    it("returns 404 when catch not found", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.getById(supabase, "non-existent-id");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("returns 404 when data is null without error", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.single.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.getById(supabase, validCatchId);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });
  });

  describe("create", () => {
    const validCreateInput = {
      caught_at: "2025-01-15T11:00:00Z",
      species_id: validSpeciesId,
      lure_id: validLureId,
      groundbait_id: validGroundbaitId,
    };

    it("creates catch with valid data", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      // Mock trip date range
      tripsQuery.single.mockResolvedValue({
        data: mockTripRow,
        error: null,
      });

      // Mock catch creation
      catchesQuery.single.mockResolvedValue({
        data: mockCatchRow,
        error: null,
      });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const result = await catchService.create(supabase, validTripId, validCreateInput);

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe(validCatchId);
      expect(catchesQuery.insert).toHaveBeenCalled();
    });

    it("creates catch with optional weight and length", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: mockTripRow, error: null });
      catchesQuery.single.mockResolvedValue({
        data: { ...mockCatchRow, weight_g: 1500, length_mm: 500 },
        error: null,
      });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const result = await catchService.create(supabase, validTripId, {
        ...validCreateInput,
        weight_g: 1500,
        length_mm: 500,
      });

      expect(result.error).toBeNull();
      expect(result.data?.weight_g).toBe(1500);
      expect(result.data?.length_mm).toBe(500);
    });

    it("returns 404 when trip not found", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await catchService.create(supabase, validTripId, validCreateInput);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.message).toContain("Wyprawa");
    });

    it("returns validation error when caught_at is before trip started_at", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: mockTripRow, error: null });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await catchService.create(supabase, validTripId, {
        ...validCreateInput,
        caught_at: "2025-01-15T07:00:00Z", // Before trip started_at (08:00)
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("started_at");
    });

    it("returns validation error when caught_at is after trip ended_at", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: mockTripRow, error: null });
      supabase.from = vi.fn().mockReturnValue(tripsQuery);

      const result = await catchService.create(supabase, validTripId, {
        ...validCreateInput,
        caught_at: "2025-01-15T19:00:00Z", // After trip ended_at (18:00)
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("ended_at");
    });

    it("allows caught_at equal to trip started_at", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: mockTripRow, error: null });
      catchesQuery.single.mockResolvedValue({ data: mockCatchRow, error: null });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const result = await catchService.create(supabase, validTripId, {
        ...validCreateInput,
        caught_at: "2025-01-15T08:00:00Z", // Equal to started_at
      });

      expect(result.error).toBeNull();
    });

    it("allows caught_at when trip has no ended_at", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      // Trip without ended_at (ongoing)
      tripsQuery.single.mockResolvedValue({
        data: { ...mockTripRow, ended_at: null },
        error: null,
      });
      catchesQuery.single.mockResolvedValue({ data: mockCatchRow, error: null });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const result = await catchService.create(supabase, validTripId, {
        ...validCreateInput,
        caught_at: "2025-01-20T12:00:00Z", // Much later, but trip has no end
      });

      expect(result.error).toBeNull();
    });

    it("handles database error from insert", async () => {
      const supabase = createMockSupabase();
      const tripsQuery = createMockQuery();
      const catchesQuery = createMockQuery();

      tripsQuery.single.mockResolvedValue({ data: mockTripRow, error: null });
      catchesQuery.single.mockResolvedValue({
        data: null,
        error: { code: "23503", message: "Foreign key violation on species_id" },
      });

      (supabase as any).from = vi.fn((table: string) => {
        if (table === "trips") return tripsQuery;
        if (table === "catches") return catchesQuery;
        return createMockQuery();
      });

      const result = await catchService.create(supabase, validTripId, validCreateInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe("update", () => {
    it("updates catch with valid data", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      // First call: get existing catch with trip
      catchesQuery.single
        .mockResolvedValueOnce({
          data: { ...mockCatchRow, trips: mockTripRow },
          error: null,
        })
        // Second call: update result
        .mockResolvedValueOnce({
          data: { ...mockCatchRow, weight_g: 1500 },
          error: null,
        });

      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.update(supabase, validCatchId, {
        weight_g: 1500,
      });

      expect(result.error).toBeNull();
      expect(result.data?.weight_g).toBe(1500);
      expect(catchesQuery.update).toHaveBeenCalled();
    });

    it("updates multiple fields at once", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.single
        .mockResolvedValueOnce({
          data: { ...mockCatchRow, trips: mockTripRow },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockCatchRow, weight_g: null, length_mm: null, photo_path: "user/photo.jpg" },
          error: null,
        });

      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.update(supabase, validCatchId, {
        weight_g: null,
        length_mm: null,
        photo_path: "user/photo.jpg",
      });

      expect(result.error).toBeNull();
      expect(result.data?.weight_g).toBeNull();
      expect(result.data?.length_mm).toBeNull();
      expect(result.data?.photo_path).toBe("user/photo.jpg");
    });

    it("returns 404 when catch not found", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.update(supabase, "non-existent-id", {
        weight_g: 1500,
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
    });

    it("validates caught_at when being updated", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.single.mockResolvedValue({
        data: { ...mockCatchRow, trips: mockTripRow },
        error: null,
      });

      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.update(supabase, validCatchId, {
        caught_at: "2025-01-15T07:00:00Z", // Before trip started_at
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("validation_error");
      expect(result.error?.message).toContain("started_at");
    });

    it("skips caught_at validation when not being updated", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.single
        .mockResolvedValueOnce({
          data: { ...mockCatchRow, trips: mockTripRow },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockCatchRow,
          error: null,
        });

      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      // Only update weight, not caught_at
      const result = await catchService.update(supabase, validCatchId, {
        weight_g: 1000,
      });

      expect(result.error).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes catch and returns success", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.maybeSingle.mockResolvedValue({ data: { id: validCatchId }, error: null });
      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.delete(supabase, validCatchId);

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
      expect(catchesQuery.delete).toHaveBeenCalled();
    });

    it("returns 404 when catch not found", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.delete(supabase, "non-existent-id");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("not_found");
      expect(result.error?.httpStatus).toBe(404);
    });

    it("handles database error", async () => {
      const supabase = createMockSupabase();
      const catchesQuery = createMockQuery();

      catchesQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: "42501", message: "RLS violation" },
      });
      supabase.from = vi.fn().mockReturnValue(catchesQuery);

      const result = await catchService.delete(supabase, validCatchId);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe("validateCaughtAtInTripRange", () => {
    it("returns valid for caught_at within range", () => {
      const result = catchService.validateCaughtAtInTripRange(
        "2025-01-15T12:00:00Z",
        "2025-01-15T08:00:00Z",
        "2025-01-15T18:00:00Z"
      );

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns invalid for caught_at before started_at", () => {
      const result = catchService.validateCaughtAtInTripRange(
        "2025-01-15T07:00:00Z",
        "2025-01-15T08:00:00Z",
        "2025-01-15T18:00:00Z"
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("started_at");
    });

    it("returns invalid for caught_at after ended_at", () => {
      const result = catchService.validateCaughtAtInTripRange(
        "2025-01-15T19:00:00Z",
        "2025-01-15T08:00:00Z",
        "2025-01-15T18:00:00Z"
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("ended_at");
    });

    it("returns valid for caught_at equal to started_at", () => {
      const result = catchService.validateCaughtAtInTripRange(
        "2025-01-15T08:00:00Z",
        "2025-01-15T08:00:00Z",
        "2025-01-15T18:00:00Z"
      );

      expect(result.valid).toBe(true);
    });

    it("returns valid for caught_at equal to ended_at", () => {
      const result = catchService.validateCaughtAtInTripRange(
        "2025-01-15T18:00:00Z",
        "2025-01-15T08:00:00Z",
        "2025-01-15T18:00:00Z"
      );

      expect(result.valid).toBe(true);
    });

    it("allows any future caught_at when ended_at is null", () => {
      const result = catchService.validateCaughtAtInTripRange(
        "2025-12-31T23:59:59Z",
        "2025-01-15T08:00:00Z",
        null // No end time
      );

      expect(result.valid).toBe(true);
    });
  });
});
