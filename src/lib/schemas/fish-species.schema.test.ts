import { describe, it, expect } from "vitest";
import { fishSpeciesListQuerySchema, fishSpeciesIdSchema } from "./fish-species.schema";

describe("fish-species.schema", () => {
  const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const invalidUuid = "not-a-uuid";

  describe("fishSpeciesListQuerySchema", () => {
    describe("q (search query)", () => {
      it("accepts valid search string", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ q: "pike" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe("pike");
        }
      });

      it("accepts empty search (optional)", () => {
        const result = fishSpeciesListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBeUndefined();
        }
      });

      it("rejects search string exceeding 100 characters", () => {
        const longString = "a".repeat(101);
        const result = fishSpeciesListQuerySchema.safeParse({ q: longString });

        expect(result.success).toBe(false);
      });

      it("accepts search string with exactly 100 characters", () => {
        const maxString = "a".repeat(100);
        const result = fishSpeciesListQuerySchema.safeParse({ q: maxString });

        expect(result.success).toBe(true);
      });
    });

    describe("limit", () => {
      it("uses default value of 20 when not provided", () => {
        const result = fishSpeciesListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(20);
        }
      });

      it("accepts valid limit within range", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ limit: "50" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
        }
      });

      it("coerces string to number", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ limit: "25" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(25);
        }
      });

      it("rejects limit below 1", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ limit: "0" });

        expect(result.success).toBe(false);
      });

      it("rejects limit above 100", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ limit: "101" });

        expect(result.success).toBe(false);
      });

      it("accepts minimum limit of 1", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ limit: "1" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(1);
        }
      });

      it("accepts maximum limit of 100", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ limit: "100" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(100);
        }
      });

      it("rejects non-integer values", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ limit: "10.5" });

        expect(result.success).toBe(false);
      });
    });

    describe("cursor", () => {
      it("accepts valid cursor string", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ cursor: "eyJpZCI6IjEyMyJ9" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBe("eyJpZCI6IjEyMyJ9");
        }
      });

      it("accepts missing cursor (optional)", () => {
        const result = fishSpeciesListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBeUndefined();
        }
      });
    });

    describe("sort", () => {
      it("uses default value of 'name' when not provided", () => {
        const result = fishSpeciesListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("name");
        }
      });

      it("accepts 'name' as sort field", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ sort: "name" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("name");
        }
      });

      it("accepts 'created_at' as sort field", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ sort: "created_at" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("created_at");
        }
      });

      it("rejects invalid sort field", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ sort: "invalid_field" });

        expect(result.success).toBe(false);
      });
    });

    describe("order", () => {
      it("uses default value of 'asc' when not provided", () => {
        const result = fishSpeciesListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("asc");
        }
      });

      it("accepts 'asc' order", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ order: "asc" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("asc");
        }
      });

      it("accepts 'desc' order", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ order: "desc" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("desc");
        }
      });

      it("rejects invalid order value", () => {
        const result = fishSpeciesListQuerySchema.safeParse({ order: "ascending" });

        expect(result.success).toBe(false);
      });
    });

    describe("combined parameters", () => {
      it("accepts all valid parameters together", () => {
        const result = fishSpeciesListQuerySchema.safeParse({
          q: "pike",
          limit: "10",
          cursor: "abc123",
          sort: "created_at",
          order: "desc",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            q: "pike",
            limit: 10,
            cursor: "abc123",
            sort: "created_at",
            order: "desc",
          });
        }
      });
    });
  });

  describe("fishSpeciesIdSchema", () => {
    it("accepts valid UUID", () => {
      const result = fishSpeciesIdSchema.safeParse(validUuid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validUuid);
      }
    });

    it("rejects invalid UUID format", () => {
      const result = fishSpeciesIdSchema.safeParse(invalidUuid);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects empty string", () => {
      const result = fishSpeciesIdSchema.safeParse("");

      expect(result.success).toBe(false);
    });

    it("rejects partial UUID", () => {
      const result = fishSpeciesIdSchema.safeParse("a1b2c3d4-e5f6-4a7b");

      expect(result.success).toBe(false);
    });
  });
});
