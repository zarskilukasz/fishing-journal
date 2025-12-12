import { describe, it, expect } from "vitest";
import {
  tripIdParamSchema,
  equipmentAssignmentParamsSchema,
  putTripRodsSchema,
  postTripRodsSchema,
  putTripLuresSchema,
  postTripLuresSchema,
  putTripGroundbaitsSchema,
  postTripGroundbaitsSchema,
} from "./trip-equipment.schema";

describe("trip-equipment.schema", () => {
  // Valid UUIDs (v4 format)
  const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const validUuid2 = "f1e2d3c4-b5a6-4987-8765-43210fedcba9";
  const invalidUuid = "not-a-uuid";

  describe("tripIdParamSchema", () => {
    it("accepts valid UUID tripId", () => {
      const result = tripIdParamSchema.safeParse({ tripId: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tripId).toBe(validUuid);
      }
    });

    it("rejects invalid UUID tripId", () => {
      const result = tripIdParamSchema.safeParse({ tripId: invalidUuid });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects missing tripId", () => {
      const result = tripIdParamSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("equipmentAssignmentParamsSchema", () => {
    it("accepts valid tripId and assignmentId", () => {
      const result = equipmentAssignmentParamsSchema.safeParse({
        tripId: validUuid,
        assignmentId: validUuid2,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tripId).toBe(validUuid);
        expect(result.data.assignmentId).toBe(validUuid2);
      }
    });

    it("rejects invalid tripId", () => {
      const result = equipmentAssignmentParamsSchema.safeParse({
        tripId: invalidUuid,
        assignmentId: validUuid,
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid assignmentId", () => {
      const result = equipmentAssignmentParamsSchema.safeParse({
        tripId: validUuid,
        assignmentId: invalidUuid,
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing fields", () => {
      const result = equipmentAssignmentParamsSchema.safeParse({ tripId: validUuid });

      expect(result.success).toBe(false);
    });
  });

  describe("putTripRodsSchema", () => {
    it("accepts valid array of rod UUIDs", () => {
      const result = putTripRodsSchema.safeParse({
        rod_ids: [validUuid, validUuid2],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rod_ids).toHaveLength(2);
      }
    });

    it("accepts empty array", () => {
      const result = putTripRodsSchema.safeParse({ rod_ids: [] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rod_ids).toHaveLength(0);
      }
    });

    it("rejects duplicate UUIDs", () => {
      const result = putTripRodsSchema.safeParse({
        rod_ids: [validUuid, validUuid],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Duplikaty");
      }
    });

    it("rejects invalid UUIDs in array", () => {
      const result = putTripRodsSchema.safeParse({
        rod_ids: [validUuid, invalidUuid],
      });

      expect(result.success).toBe(false);
    });

    it("rejects array exceeding 50 items", () => {
      // Generate valid UUIDs (using v4 format with proper variant bits)
      const manyUuids = Array.from(
        { length: 51 },
        (_, i) => `${i.toString(16).padStart(8, "0")}-0000-4000-a000-000000000000`
      );

      const result = putTripRodsSchema.safeParse({ rod_ids: manyUuids });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("50");
      }
    });

    it("accepts exactly 50 items", () => {
      const fiftyUuids = Array.from(
        { length: 50 },
        (_, i) => `${i.toString(16).padStart(8, "0")}-0000-4000-a000-000000000000`
      );

      const result = putTripRodsSchema.safeParse({ rod_ids: fiftyUuids });

      expect(result.success).toBe(true);
    });
  });

  describe("postTripRodsSchema", () => {
    it("accepts valid rod_id", () => {
      const result = postTripRodsSchema.safeParse({ rod_id: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rod_id).toBe(validUuid);
      }
    });

    it("rejects invalid rod_id", () => {
      const result = postTripRodsSchema.safeParse({ rod_id: invalidUuid });

      expect(result.success).toBe(false);
    });

    it("rejects missing rod_id", () => {
      const result = postTripRodsSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("putTripLuresSchema", () => {
    it("accepts valid array of lure UUIDs", () => {
      const result = putTripLuresSchema.safeParse({
        lure_ids: [validUuid, validUuid2],
      });

      expect(result.success).toBe(true);
    });

    it("rejects duplicate UUIDs", () => {
      const result = putTripLuresSchema.safeParse({
        lure_ids: [validUuid, validUuid],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Duplikaty");
      }
    });

    it("rejects array exceeding 50 items", () => {
      const manyUuids = Array.from(
        { length: 51 },
        (_, i) => `${i.toString(16).padStart(8, "0")}-0000-4000-a000-000000000000`
      );

      const result = putTripLuresSchema.safeParse({ lure_ids: manyUuids });

      expect(result.success).toBe(false);
    });
  });

  describe("postTripLuresSchema", () => {
    it("accepts valid lure_id", () => {
      const result = postTripLuresSchema.safeParse({ lure_id: validUuid });

      expect(result.success).toBe(true);
    });

    it("rejects invalid lure_id", () => {
      const result = postTripLuresSchema.safeParse({ lure_id: invalidUuid });

      expect(result.success).toBe(false);
    });
  });

  describe("putTripGroundbaitsSchema", () => {
    it("accepts valid array of groundbait UUIDs", () => {
      const result = putTripGroundbaitsSchema.safeParse({
        groundbait_ids: [validUuid, validUuid2],
      });

      expect(result.success).toBe(true);
    });

    it("rejects duplicate UUIDs", () => {
      const result = putTripGroundbaitsSchema.safeParse({
        groundbait_ids: [validUuid, validUuid],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Duplikaty");
      }
    });

    it("rejects array exceeding 50 items", () => {
      const manyUuids = Array.from(
        { length: 51 },
        (_, i) => `${i.toString(16).padStart(8, "0")}-0000-4000-a000-000000000000`
      );

      const result = putTripGroundbaitsSchema.safeParse({ groundbait_ids: manyUuids });

      expect(result.success).toBe(false);
    });
  });

  describe("postTripGroundbaitsSchema", () => {
    it("accepts valid groundbait_id", () => {
      const result = postTripGroundbaitsSchema.safeParse({ groundbait_id: validUuid });

      expect(result.success).toBe(true);
    });

    it("rejects invalid groundbait_id", () => {
      const result = postTripGroundbaitsSchema.safeParse({ groundbait_id: invalidUuid });

      expect(result.success).toBe(false);
    });
  });
});
