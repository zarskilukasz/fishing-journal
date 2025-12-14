import { describe, it, expect } from "vitest";
import { lastUsedEquipmentResponseSchema } from "./last-used-equipment.schema";

describe("last-used-equipment.schema", () => {
  // ---------------------------------------------------------------------------
  // lastUsedEquipmentResponseSchema
  // ---------------------------------------------------------------------------

  describe("lastUsedEquipmentResponseSchema", () => {
    const validResponse = {
      source_trip_id: "550e8400-e29b-41d4-a716-446655440000",
      rods: [
        {
          rod_id: "550e8400-e29b-41d4-a716-446655440001",
          rod_name_snapshot: "Wędka spinningowa",
        },
      ],
      lures: [
        {
          lure_id: "550e8400-e29b-41d4-a716-446655440002",
          lure_name_snapshot: "Rapala X-Rap",
        },
      ],
      groundbaits: [
        {
          groundbait_id: "550e8400-e29b-41d4-a716-446655440003",
          groundbait_name_snapshot: "Zanęta waniliowa",
        },
      ],
    };

    it("validates complete response", () => {
      const result = lastUsedEquipmentResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it("validates response with empty equipment arrays", () => {
      const emptyResponse = {
        source_trip_id: "550e8400-e29b-41d4-a716-446655440000",
        rods: [],
        lures: [],
        groundbaits: [],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });

    it("validates response with multiple items in each array", () => {
      const multipleItemsResponse = {
        source_trip_id: "550e8400-e29b-41d4-a716-446655440000",
        rods: [
          { rod_id: "550e8400-e29b-41d4-a716-446655440001", rod_name_snapshot: "Wędka 1" },
          { rod_id: "550e8400-e29b-41d4-a716-446655440002", rod_name_snapshot: "Wędka 2" },
        ],
        lures: [
          { lure_id: "550e8400-e29b-41d4-a716-446655440003", lure_name_snapshot: "Przynęta 1" },
          { lure_id: "550e8400-e29b-41d4-a716-446655440004", lure_name_snapshot: "Przynęta 2" },
          { lure_id: "550e8400-e29b-41d4-a716-446655440005", lure_name_snapshot: "Przynęta 3" },
        ],
        groundbaits: [{ groundbait_id: "550e8400-e29b-41d4-a716-446655440006", groundbait_name_snapshot: "Zanęta 1" }],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(multipleItemsResponse);
      expect(result.success).toBe(true);
    });

    // source_trip_id validation
    it("rejects missing source_trip_id", () => {
      const { source_trip_id: _, ...rest } = validResponse;
      const result = lastUsedEquipmentResponseSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects invalid source_trip_id UUID", () => {
      const invalidResponse = { ...validResponse, source_trip_id: "not-a-uuid" };
      const result = lastUsedEquipmentResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    // rods array validation
    it("rejects missing rods array", () => {
      const { rods: _, ...rest } = validResponse;
      const result = lastUsedEquipmentResponseSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects invalid rod_id UUID in rods", () => {
      const invalidResponse = {
        ...validResponse,
        rods: [{ rod_id: "not-a-uuid", rod_name_snapshot: "Wędka" }],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("rejects missing rod_name_snapshot in rods", () => {
      const invalidResponse = {
        ...validResponse,
        rods: [{ rod_id: "550e8400-e29b-41d4-a716-446655440001" }],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    // lures array validation
    it("rejects missing lures array", () => {
      const { lures: _, ...rest } = validResponse;
      const result = lastUsedEquipmentResponseSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects invalid lure_id UUID in lures", () => {
      const invalidResponse = {
        ...validResponse,
        lures: [{ lure_id: "not-a-uuid", lure_name_snapshot: "Przynęta" }],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("rejects missing lure_name_snapshot in lures", () => {
      const invalidResponse = {
        ...validResponse,
        lures: [{ lure_id: "550e8400-e29b-41d4-a716-446655440002" }],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    // groundbaits array validation
    it("rejects missing groundbaits array", () => {
      const { groundbaits: _, ...rest } = validResponse;
      const result = lastUsedEquipmentResponseSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects invalid groundbait_id UUID in groundbaits", () => {
      const invalidResponse = {
        ...validResponse,
        groundbaits: [{ groundbait_id: "not-a-uuid", groundbait_name_snapshot: "Zanęta" }],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("rejects missing groundbait_name_snapshot in groundbaits", () => {
      const invalidResponse = {
        ...validResponse,
        groundbaits: [{ groundbait_id: "550e8400-e29b-41d4-a716-446655440003" }],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    // Polish characters in snapshots
    it("accepts Polish characters in name snapshots", () => {
      const polishResponse = {
        source_trip_id: "550e8400-e29b-41d4-a716-446655440000",
        rods: [{ rod_id: "550e8400-e29b-41d4-a716-446655440001", rod_name_snapshot: "Wędka żółta" }],
        lures: [{ lure_id: "550e8400-e29b-41d4-a716-446655440002", lure_name_snapshot: "Przynęta źródło" }],
        groundbaits: [
          { groundbait_id: "550e8400-e29b-41d4-a716-446655440003", groundbait_name_snapshot: "Zanęta ślimak" },
        ],
      };
      const result = lastUsedEquipmentResponseSchema.safeParse(polishResponse);
      expect(result.success).toBe(true);
    });
  });
});
