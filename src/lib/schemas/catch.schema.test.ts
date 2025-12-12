import { describe, it, expect } from "vitest";
import {
  tripIdParamSchema,
  catchIdParamSchema,
  catchListQuerySchema,
  createCatchSchema,
  updateCatchSchema,
  checkForbiddenSnapshotFields,
  FORBIDDEN_SNAPSHOT_FIELDS,
} from "./catch.schema";

describe("catch.schema", () => {
  const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const invalidUuid = "not-a-uuid";
  const validDatetime = "2025-01-15T10:00:00Z";
  const invalidDatetime = "not-a-datetime";

  // ---------------------------------------------------------------------------
  // tripIdParamSchema
  // ---------------------------------------------------------------------------

  describe("tripIdParamSchema", () => {
    it("accepts valid UUID for tripId", () => {
      const result = tripIdParamSchema.safeParse({ tripId: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tripId).toBe(validUuid);
      }
    });

    it("rejects invalid UUID for tripId", () => {
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

  // ---------------------------------------------------------------------------
  // catchIdParamSchema
  // ---------------------------------------------------------------------------

  describe("catchIdParamSchema", () => {
    it("accepts valid UUID for id", () => {
      const result = catchIdParamSchema.safeParse({ id: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validUuid);
      }
    });

    it("rejects invalid UUID for id", () => {
      const result = catchIdParamSchema.safeParse({ id: invalidUuid });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects missing id", () => {
      const result = catchIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // catchListQuerySchema
  // ---------------------------------------------------------------------------

  describe("catchListQuerySchema", () => {
    describe("defaults", () => {
      it("applies default values when not provided", () => {
        const result = catchListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(20);
          expect(result.data.sort).toBe("caught_at");
          expect(result.data.order).toBe("desc");
        }
      });
    });

    describe("date range filters", () => {
      it("accepts valid from datetime", () => {
        const result = catchListQuerySchema.safeParse({ from: validDatetime });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.from).toBe(validDatetime);
        }
      });

      it("accepts valid to datetime", () => {
        const result = catchListQuerySchema.safeParse({ to: validDatetime });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.to).toBe(validDatetime);
        }
      });

      it("rejects invalid from datetime format", () => {
        const result = catchListQuerySchema.safeParse({ from: invalidDatetime });
        expect(result.success).toBe(false);
      });

      it("rejects invalid to datetime format", () => {
        const result = catchListQuerySchema.safeParse({ to: invalidDatetime });
        expect(result.success).toBe(false);
      });
    });

    describe("species_id filter", () => {
      it("accepts valid species_id UUID", () => {
        const result = catchListQuerySchema.safeParse({ species_id: validUuid });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.species_id).toBe(validUuid);
        }
      });

      it("rejects invalid species_id UUID", () => {
        const result = catchListQuerySchema.safeParse({ species_id: invalidUuid });
        expect(result.success).toBe(false);
      });
    });

    describe("sort field", () => {
      it("accepts 'caught_at' sort", () => {
        const result = catchListQuerySchema.safeParse({ sort: "caught_at" });
        expect(result.success).toBe(true);
      });

      it("accepts 'created_at' sort", () => {
        const result = catchListQuerySchema.safeParse({ sort: "created_at" });
        expect(result.success).toBe(true);
      });

      it("rejects invalid sort field", () => {
        const result = catchListQuerySchema.safeParse({ sort: "updated_at" });
        expect(result.success).toBe(false);
      });
    });

    describe("order", () => {
      it("accepts 'asc' order", () => {
        const result = catchListQuerySchema.safeParse({ order: "asc" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("asc");
        }
      });

      it("accepts 'desc' order", () => {
        const result = catchListQuerySchema.safeParse({ order: "desc" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("desc");
        }
      });

      it("rejects invalid order", () => {
        const result = catchListQuerySchema.safeParse({ order: "random" });
        expect(result.success).toBe(false);
      });
    });

    describe("limit", () => {
      it("coerces string to number", () => {
        const result = catchListQuerySchema.safeParse({ limit: "50" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
        }
      });

      it("rejects limit below 1", () => {
        const result = catchListQuerySchema.safeParse({ limit: "0" });
        expect(result.success).toBe(false);
      });

      it("rejects limit above 100", () => {
        const result = catchListQuerySchema.safeParse({ limit: "101" });
        expect(result.success).toBe(false);
      });

      it("accepts limit at boundary 1", () => {
        const result = catchListQuerySchema.safeParse({ limit: "1" });
        expect(result.success).toBe(true);
      });

      it("accepts limit at boundary 100", () => {
        const result = catchListQuerySchema.safeParse({ limit: "100" });
        expect(result.success).toBe(true);
      });
    });

    describe("cursor", () => {
      it("accepts cursor string", () => {
        const result = catchListQuerySchema.safeParse({ cursor: "eyJzb3J0VmFsdWUiOiIuLi4iLCJpZCI6Ii4uLiJ9" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBe("eyJzb3J0VmFsdWUiOiIuLi4iLCJpZCI6Ii4uLiJ9");
        }
      });
    });
  });

  // ---------------------------------------------------------------------------
  // createCatchSchema
  // ---------------------------------------------------------------------------

  describe("createCatchSchema", () => {
    const validCreateInput = {
      caught_at: validDatetime,
      species_id: validUuid,
      lure_id: validUuid,
      groundbait_id: validUuid,
    };

    describe("valid inputs", () => {
      it("accepts valid catch with required fields only", () => {
        const result = createCatchSchema.safeParse(validCreateInput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.caught_at).toBe(validDatetime);
          expect(result.data.species_id).toBe(validUuid);
          expect(result.data.lure_id).toBe(validUuid);
          expect(result.data.groundbait_id).toBe(validUuid);
        }
      });

      it("accepts valid catch with all optional fields", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          weight_g: 1200,
          length_mm: 650,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.weight_g).toBe(1200);
          expect(result.data.length_mm).toBe(650);
        }
      });

      it("accepts null for weight_g", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          weight_g: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.weight_g).toBeNull();
        }
      });

      it("accepts null for length_mm", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          length_mm: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length_mm).toBeNull();
        }
      });
    });

    describe("required fields", () => {
      it("rejects missing caught_at", () => {
        const { caught_at: _, ...input } = validCreateInput;
        void _;
        const result = createCatchSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("rejects missing species_id", () => {
        const { species_id: _, ...input } = validCreateInput;
        void _;
        const result = createCatchSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("rejects missing lure_id", () => {
        const { lure_id: _, ...input } = validCreateInput;
        void _;
        const result = createCatchSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("rejects missing groundbait_id", () => {
        const { groundbait_id: _, ...input } = validCreateInput;
        void _;
        const result = createCatchSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe("datetime validation", () => {
      it("rejects invalid caught_at format", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          caught_at: invalidDatetime,
        });

        expect(result.success).toBe(false);
      });
    });

    describe("UUID validation", () => {
      it("rejects invalid species_id UUID", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          species_id: invalidUuid,
        });

        expect(result.success).toBe(false);
      });

      it("rejects invalid lure_id UUID", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          lure_id: invalidUuid,
        });

        expect(result.success).toBe(false);
      });

      it("rejects invalid groundbait_id UUID", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          groundbait_id: invalidUuid,
        });

        expect(result.success).toBe(false);
      });
    });

    describe("weight_g validation", () => {
      it("rejects weight_g of 0", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          weight_g: 0,
        });

        expect(result.success).toBe(false);
      });

      it("rejects negative weight_g", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          weight_g: -100,
        });

        expect(result.success).toBe(false);
      });

      it("rejects non-integer weight_g", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          weight_g: 1200.5,
        });

        expect(result.success).toBe(false);
      });

      it("accepts weight_g of 1", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          weight_g: 1,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("length_mm validation", () => {
      it("rejects length_mm of 0", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          length_mm: 0,
        });

        expect(result.success).toBe(false);
      });

      it("rejects negative length_mm", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          length_mm: -50,
        });

        expect(result.success).toBe(false);
      });

      it("rejects non-integer length_mm", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          length_mm: 650.5,
        });

        expect(result.success).toBe(false);
      });

      it("accepts length_mm of 1", () => {
        const result = createCatchSchema.safeParse({
          ...validCreateInput,
          length_mm: 1,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // updateCatchSchema
  // ---------------------------------------------------------------------------

  describe("updateCatchSchema", () => {
    it("accepts empty object (all fields optional)", () => {
      const result = updateCatchSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only caught_at", () => {
      const result = updateCatchSchema.safeParse({
        caught_at: validDatetime,
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only species_id", () => {
      const result = updateCatchSchema.safeParse({
        species_id: validUuid,
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only lure_id", () => {
      const result = updateCatchSchema.safeParse({
        lure_id: validUuid,
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only groundbait_id", () => {
      const result = updateCatchSchema.safeParse({
        groundbait_id: validUuid,
      });

      expect(result.success).toBe(true);
    });

    it("accepts setting weight_g to null", () => {
      const result = updateCatchSchema.safeParse({
        weight_g: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weight_g).toBeNull();
      }
    });

    it("accepts setting length_mm to null", () => {
      const result = updateCatchSchema.safeParse({
        length_mm: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length_mm).toBeNull();
      }
    });

    it("accepts setting photo_path", () => {
      const result = updateCatchSchema.safeParse({
        photo_path: "user_id/catch_id.jpg",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.photo_path).toBe("user_id/catch_id.jpg");
      }
    });

    it("accepts setting photo_path to null", () => {
      const result = updateCatchSchema.safeParse({
        photo_path: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.photo_path).toBeNull();
      }
    });

    it("rejects photo_path exceeding 255 characters", () => {
      const result = updateCatchSchema.safeParse({
        photo_path: "a".repeat(256),
      });

      expect(result.success).toBe(false);
    });

    it("accepts photo_path with exactly 255 characters", () => {
      const result = updateCatchSchema.safeParse({
        photo_path: "a".repeat(255),
      });

      expect(result.success).toBe(true);
    });

    describe("strict mode (rejects unknown fields)", () => {
      it("rejects lure_name_snapshot field", () => {
        const result = updateCatchSchema.safeParse({
          lure_id: validUuid,
          lure_name_snapshot: "Some lure name",
        });

        expect(result.success).toBe(false);
      });

      it("rejects groundbait_name_snapshot field", () => {
        const result = updateCatchSchema.safeParse({
          groundbait_id: validUuid,
          groundbait_name_snapshot: "Some groundbait name",
        });

        expect(result.success).toBe(false);
      });

      it("rejects any unknown field", () => {
        const result = updateCatchSchema.safeParse({
          unknown_field: "value",
        });

        expect(result.success).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // checkForbiddenSnapshotFields
  // ---------------------------------------------------------------------------

  describe("checkForbiddenSnapshotFields", () => {
    it("returns null for valid body without snapshot fields", () => {
      const body = {
        caught_at: validDatetime,
        species_id: validUuid,
      };

      const result = checkForbiddenSnapshotFields(body);
      expect(result).toBeNull();
    });

    it("returns field name when lure_name_snapshot is present", () => {
      const body = {
        lure_id: validUuid,
        lure_name_snapshot: "Wobler",
      };

      const result = checkForbiddenSnapshotFields(body);
      expect(result).toBe("lure_name_snapshot");
    });

    it("returns field name when groundbait_name_snapshot is present", () => {
      const body = {
        groundbait_id: validUuid,
        groundbait_name_snapshot: "Zanęta waniliowa",
      };

      const result = checkForbiddenSnapshotFields(body);
      expect(result).toBe("groundbait_name_snapshot");
    });

    it("returns first forbidden field when both are present", () => {
      const body = {
        lure_name_snapshot: "Wobler",
        groundbait_name_snapshot: "Zanęta",
      };

      const result = checkForbiddenSnapshotFields(body);
      expect(FORBIDDEN_SNAPSHOT_FIELDS).toContain(result);
    });

    it("returns null for null body", () => {
      const result = checkForbiddenSnapshotFields(null);
      expect(result).toBeNull();
    });

    it("returns null for non-object body", () => {
      const result = checkForbiddenSnapshotFields("string");
      expect(result).toBeNull();
    });

    it("returns null for empty object", () => {
      const result = checkForbiddenSnapshotFields({});
      expect(result).toBeNull();
    });
  });
});
