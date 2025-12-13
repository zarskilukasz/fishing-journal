import { describe, it, expect } from "vitest";
import {
  equipmentListQuerySchema,
  equipmentIdSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
} from "./equipment.schema";

describe("equipment.schema", () => {
  const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const invalidUuid = "not-a-uuid";

  describe("equipmentListQuerySchema", () => {
    describe("q (search query)", () => {
      it("accepts valid search string", () => {
        const result = equipmentListQuerySchema.safeParse({ q: "shimano" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe("shimano");
        }
      });

      it("accepts empty search (optional)", () => {
        const result = equipmentListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBeUndefined();
        }
      });

      it("rejects search string exceeding 100 characters", () => {
        const longString = "a".repeat(101);
        const result = equipmentListQuerySchema.safeParse({ q: longString });

        expect(result.success).toBe(false);
      });

      it("accepts search string with exactly 100 characters", () => {
        const maxString = "a".repeat(100);
        const result = equipmentListQuerySchema.safeParse({ q: maxString });

        expect(result.success).toBe(true);
      });
    });

    describe("include_deleted", () => {
      it("defaults to false when not provided", () => {
        const result = equipmentListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_deleted).toBe(false);
        }
      });

      it("transforms 'true' string to boolean true", () => {
        const result = equipmentListQuerySchema.safeParse({ include_deleted: "true" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_deleted).toBe(true);
        }
      });

      it("transforms 'false' string to boolean false", () => {
        const result = equipmentListQuerySchema.safeParse({ include_deleted: "false" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_deleted).toBe(false);
        }
      });

      it("treats any non-'true' string as false", () => {
        const result = equipmentListQuerySchema.safeParse({ include_deleted: "yes" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_deleted).toBe(false);
        }
      });
    });

    describe("limit", () => {
      it("uses default value of 20 when not provided", () => {
        const result = equipmentListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(20);
        }
      });

      it("accepts valid limit within range", () => {
        const result = equipmentListQuerySchema.safeParse({ limit: "50" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
        }
      });

      it("coerces string to number", () => {
        const result = equipmentListQuerySchema.safeParse({ limit: "25" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(25);
        }
      });

      it("rejects limit below 1", () => {
        const result = equipmentListQuerySchema.safeParse({ limit: "0" });

        expect(result.success).toBe(false);
      });

      it("rejects limit above 100", () => {
        const result = equipmentListQuerySchema.safeParse({ limit: "101" });

        expect(result.success).toBe(false);
      });

      it("accepts minimum limit of 1", () => {
        const result = equipmentListQuerySchema.safeParse({ limit: "1" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(1);
        }
      });

      it("accepts maximum limit of 100", () => {
        const result = equipmentListQuerySchema.safeParse({ limit: "100" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(100);
        }
      });

      it("rejects non-integer values", () => {
        const result = equipmentListQuerySchema.safeParse({ limit: "10.5" });

        expect(result.success).toBe(false);
      });
    });

    describe("cursor", () => {
      it("accepts valid cursor string", () => {
        const result = equipmentListQuerySchema.safeParse({ cursor: "eyJpZCI6IjEyMyJ9" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBe("eyJpZCI6IjEyMyJ9");
        }
      });

      it("accepts missing cursor (optional)", () => {
        const result = equipmentListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBeUndefined();
        }
      });
    });

    describe("sort", () => {
      it("uses default value of 'created_at' when not provided", () => {
        const result = equipmentListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("created_at");
        }
      });

      it("accepts 'name' as sort field", () => {
        const result = equipmentListQuerySchema.safeParse({ sort: "name" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("name");
        }
      });

      it("accepts 'created_at' as sort field", () => {
        const result = equipmentListQuerySchema.safeParse({ sort: "created_at" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("created_at");
        }
      });

      it("accepts 'updated_at' as sort field", () => {
        const result = equipmentListQuerySchema.safeParse({ sort: "updated_at" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("updated_at");
        }
      });

      it("rejects invalid sort field", () => {
        const result = equipmentListQuerySchema.safeParse({ sort: "invalid_field" });

        expect(result.success).toBe(false);
      });
    });

    describe("order", () => {
      it("uses default value of 'desc' when not provided", () => {
        const result = equipmentListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("desc");
        }
      });

      it("accepts 'asc' order", () => {
        const result = equipmentListQuerySchema.safeParse({ order: "asc" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("asc");
        }
      });

      it("accepts 'desc' order", () => {
        const result = equipmentListQuerySchema.safeParse({ order: "desc" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("desc");
        }
      });

      it("rejects invalid order value", () => {
        const result = equipmentListQuerySchema.safeParse({ order: "ascending" });

        expect(result.success).toBe(false);
      });
    });

    describe("combined parameters", () => {
      it("accepts all valid parameters together", () => {
        const result = equipmentListQuerySchema.safeParse({
          q: "shimano",
          include_deleted: "true",
          limit: "10",
          cursor: "abc123",
          sort: "updated_at",
          order: "asc",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            q: "shimano",
            include_deleted: true,
            limit: 10,
            cursor: "abc123",
            sort: "updated_at",
            order: "asc",
          });
        }
      });
    });
  });

  describe("equipmentIdSchema", () => {
    it("accepts valid UUID", () => {
      const result = equipmentIdSchema.safeParse(validUuid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validUuid);
      }
    });

    it("rejects invalid UUID format", () => {
      const result = equipmentIdSchema.safeParse(invalidUuid);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects empty string", () => {
      const result = equipmentIdSchema.safeParse("");

      expect(result.success).toBe(false);
    });

    it("rejects partial UUID", () => {
      const result = equipmentIdSchema.safeParse("a1b2c3d4-e5f6-4a7b");

      expect(result.success).toBe(false);
    });
  });

  describe("createEquipmentSchema", () => {
    it("accepts valid name", () => {
      const result = createEquipmentSchema.safeParse({ name: "Shimano Rod" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Shimano Rod");
      }
    });

    it("trims whitespace from name", () => {
      const result = createEquipmentSchema.safeParse({ name: "  Shimano Rod  " });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Shimano Rod");
      }
    });

    it("rejects empty name", () => {
      const result = createEquipmentSchema.safeParse({ name: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("rejects whitespace-only name", () => {
      const result = createEquipmentSchema.safeParse({ name: "   " });

      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 255 characters", () => {
      const longName = "a".repeat(256);
      const result = createEquipmentSchema.safeParse({ name: longName });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("255");
      }
    });

    it("accepts name with exactly 255 characters", () => {
      const maxName = "a".repeat(255);
      const result = createEquipmentSchema.safeParse({ name: maxName });

      expect(result.success).toBe(true);
    });

    it("rejects missing name field", () => {
      const result = createEquipmentSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("updateEquipmentSchema", () => {
    it("accepts valid name", () => {
      const result = updateEquipmentSchema.safeParse({ name: "Updated Name" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
      }
    });

    it("accepts empty object (no update)", () => {
      const result = updateEquipmentSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
      }
    });

    it("trims whitespace from name", () => {
      const result = updateEquipmentSchema.safeParse({ name: "  Updated Name  " });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
      }
    });

    it("rejects empty name when provided", () => {
      const result = updateEquipmentSchema.safeParse({ name: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("empty");
      }
    });

    it("rejects name exceeding 255 characters", () => {
      const longName = "a".repeat(256);
      const result = updateEquipmentSchema.safeParse({ name: longName });

      expect(result.success).toBe(false);
    });
  });
});
