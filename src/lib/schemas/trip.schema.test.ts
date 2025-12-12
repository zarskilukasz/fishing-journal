import { describe, it, expect } from "vitest";
import {
  tripStatusSchema,
  tripLocationSchema,
  tripListQuerySchema,
  tripIdParamSchema,
  tripIncludeSchema,
  tripGetQuerySchema,
  createTripSchema,
  quickStartTripSchema,
  updateTripSchema,
  closeTripSchema,
} from "./trip.schema";

describe("trip.schema", () => {
  const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const invalidUuid = "not-a-uuid";
  const validDatetime = "2025-01-15T10:00:00Z";
  const validDatetimeLater = "2025-01-15T14:00:00Z";
  const invalidDatetime = "not-a-datetime";

  // ---------------------------------------------------------------------------
  // tripStatusSchema
  // ---------------------------------------------------------------------------

  describe("tripStatusSchema", () => {
    it("accepts 'draft' status", () => {
      const result = tripStatusSchema.safeParse("draft");
      expect(result.success).toBe(true);
    });

    it("accepts 'active' status", () => {
      const result = tripStatusSchema.safeParse("active");
      expect(result.success).toBe(true);
    });

    it("accepts 'closed' status", () => {
      const result = tripStatusSchema.safeParse("closed");
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = tripStatusSchema.safeParse("pending");
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // tripLocationSchema
  // ---------------------------------------------------------------------------

  describe("tripLocationSchema", () => {
    it("accepts valid location with all fields", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: 21.0,
        label: "Lake XYZ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.lat).toBe(52.1);
        expect(result.data?.lng).toBe(21.0);
        expect(result.data?.label).toBe("Lake XYZ");
      }
    });

    it("accepts location without label", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: 21.0,
      });

      expect(result.success).toBe(true);
    });

    it("accepts null location", () => {
      const result = tripLocationSchema.safeParse(null);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("rejects lat below -90", () => {
      const result = tripLocationSchema.safeParse({
        lat: -91,
        lng: 21.0,
      });

      expect(result.success).toBe(false);
    });

    it("rejects lat above 90", () => {
      const result = tripLocationSchema.safeParse({
        lat: 91,
        lng: 21.0,
      });

      expect(result.success).toBe(false);
    });

    it("accepts lat at boundary -90", () => {
      const result = tripLocationSchema.safeParse({
        lat: -90,
        lng: 21.0,
      });

      expect(result.success).toBe(true);
    });

    it("accepts lat at boundary 90", () => {
      const result = tripLocationSchema.safeParse({
        lat: 90,
        lng: 21.0,
      });

      expect(result.success).toBe(true);
    });

    it("rejects lng below -180", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: -181,
      });

      expect(result.success).toBe(false);
    });

    it("rejects lng above 180", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: 181,
      });

      expect(result.success).toBe(false);
    });

    it("accepts lng at boundary -180", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: -180,
      });

      expect(result.success).toBe(true);
    });

    it("accepts lng at boundary 180", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: 180,
      });

      expect(result.success).toBe(true);
    });

    it("rejects label exceeding 255 characters", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: 21.0,
        label: "a".repeat(256),
      });

      expect(result.success).toBe(false);
    });

    it("accepts label with exactly 255 characters", () => {
      const result = tripLocationSchema.safeParse({
        lat: 52.1,
        lng: 21.0,
        label: "a".repeat(255),
      });

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // tripListQuerySchema
  // ---------------------------------------------------------------------------

  describe("tripListQuerySchema", () => {
    describe("defaults", () => {
      it("applies default values when not provided", () => {
        const result = tripListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(20);
          expect(result.data.sort).toBe("started_at");
          expect(result.data.order).toBe("desc");
          expect(result.data.include_deleted).toBe(false);
        }
      });
    });

    describe("status filter", () => {
      it("accepts valid status filter", () => {
        const result = tripListQuerySchema.safeParse({ status: "active" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe("active");
        }
      });

      it("rejects invalid status filter", () => {
        const result = tripListQuerySchema.safeParse({ status: "invalid" });

        expect(result.success).toBe(false);
      });
    });

    describe("date range filters", () => {
      it("accepts valid from datetime", () => {
        const result = tripListQuerySchema.safeParse({ from: validDatetime });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.from).toBe(validDatetime);
        }
      });

      it("accepts valid to datetime", () => {
        const result = tripListQuerySchema.safeParse({ to: validDatetime });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.to).toBe(validDatetime);
        }
      });

      it("rejects invalid from datetime format", () => {
        const result = tripListQuerySchema.safeParse({ from: invalidDatetime });

        expect(result.success).toBe(false);
      });

      it("rejects invalid to datetime format", () => {
        const result = tripListQuerySchema.safeParse({ to: invalidDatetime });

        expect(result.success).toBe(false);
      });
    });

    describe("include_deleted", () => {
      it("transforms 'true' string to boolean true", () => {
        const result = tripListQuerySchema.safeParse({ include_deleted: "true" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_deleted).toBe(true);
        }
      });

      it("transforms 'false' string to boolean false", () => {
        const result = tripListQuerySchema.safeParse({ include_deleted: "false" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_deleted).toBe(false);
        }
      });

      it("transforms any non-'true' string to false", () => {
        const result = tripListQuerySchema.safeParse({ include_deleted: "yes" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_deleted).toBe(false);
        }
      });
    });

    describe("sort field", () => {
      it("accepts 'started_at' sort", () => {
        const result = tripListQuerySchema.safeParse({ sort: "started_at" });
        expect(result.success).toBe(true);
      });

      it("accepts 'created_at' sort", () => {
        const result = tripListQuerySchema.safeParse({ sort: "created_at" });
        expect(result.success).toBe(true);
      });

      it("accepts 'updated_at' sort", () => {
        const result = tripListQuerySchema.safeParse({ sort: "updated_at" });
        expect(result.success).toBe(true);
      });

      it("rejects invalid sort field", () => {
        const result = tripListQuerySchema.safeParse({ sort: "name" });
        expect(result.success).toBe(false);
      });
    });

    describe("limit", () => {
      it("coerces string to number", () => {
        const result = tripListQuerySchema.safeParse({ limit: "50" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
        }
      });

      it("rejects limit below 1", () => {
        const result = tripListQuerySchema.safeParse({ limit: "0" });
        expect(result.success).toBe(false);
      });

      it("rejects limit above 100", () => {
        const result = tripListQuerySchema.safeParse({ limit: "101" });
        expect(result.success).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // tripIdParamSchema
  // ---------------------------------------------------------------------------

  describe("tripIdParamSchema", () => {
    it("accepts valid UUID", () => {
      const result = tripIdParamSchema.safeParse({ id: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validUuid);
      }
    });

    it("rejects invalid UUID", () => {
      const result = tripIdParamSchema.safeParse({ id: invalidUuid });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects missing id", () => {
      const result = tripIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // tripIncludeSchema
  // ---------------------------------------------------------------------------

  describe("tripIncludeSchema", () => {
    it("accepts 'catches'", () => {
      const result = tripIncludeSchema.safeParse("catches");
      expect(result.success).toBe(true);
    });

    it("accepts 'rods'", () => {
      const result = tripIncludeSchema.safeParse("rods");
      expect(result.success).toBe(true);
    });

    it("accepts 'lures'", () => {
      const result = tripIncludeSchema.safeParse("lures");
      expect(result.success).toBe(true);
    });

    it("accepts 'groundbaits'", () => {
      const result = tripIncludeSchema.safeParse("groundbaits");
      expect(result.success).toBe(true);
    });

    it("accepts 'weather_current'", () => {
      const result = tripIncludeSchema.safeParse("weather_current");
      expect(result.success).toBe(true);
    });

    it("rejects invalid include value", () => {
      const result = tripIncludeSchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // tripGetQuerySchema
  // ---------------------------------------------------------------------------

  describe("tripGetQuerySchema", () => {
    it("parses comma-separated include values", () => {
      const result = tripGetQuerySchema.safeParse({ include: "catches,rods,lures" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include).toEqual(["catches", "rods", "lures"]);
      }
    });

    it("trims whitespace from include values", () => {
      const result = tripGetQuerySchema.safeParse({ include: "catches, rods , lures" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include).toEqual(["catches", "rods", "lures"]);
      }
    });

    it("accepts single include value", () => {
      const result = tripGetQuerySchema.safeParse({ include: "catches" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include).toEqual(["catches"]);
      }
    });

    it("accepts empty include (optional)", () => {
      const result = tripGetQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include).toBeUndefined();
      }
    });

    it("rejects invalid include value in list", () => {
      const result = tripGetQuerySchema.safeParse({ include: "catches,invalid" });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // createTripSchema
  // ---------------------------------------------------------------------------

  describe("createTripSchema", () => {
    describe("valid inputs", () => {
      it("accepts valid trip with all fields", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          ended_at: validDatetimeLater,
          status: "closed",
          location: { lat: 52.1, lng: 21.0, label: "Lake" },
          copy_equipment_from_last_trip: true,
        });

        expect(result.success).toBe(true);
      });

      it("accepts trip without ended_at (ongoing)", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          ended_at: null,
          status: "active",
        });

        expect(result.success).toBe(true);
      });

      it("accepts trip with null location", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          status: "draft",
          location: null,
        });

        expect(result.success).toBe(true);
      });

      it("applies default values", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          status: "active",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.location).toBeNull();
          expect(result.data.copy_equipment_from_last_trip).toBe(false);
        }
      });
    });

    describe("datetime validation", () => {
      it("rejects invalid started_at format", () => {
        const result = createTripSchema.safeParse({
          started_at: invalidDatetime,
          status: "active",
        });

        expect(result.success).toBe(false);
      });

      it("rejects invalid ended_at format", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          ended_at: invalidDatetime,
          status: "active",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("business rules", () => {
      it("rejects ended_at before started_at", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetimeLater,
          ended_at: validDatetime, // earlier
          status: "closed",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("ended_at");
          expect(result.error.issues[0].path).toContain("ended_at");
        }
      });

      it("accepts ended_at equal to started_at", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          ended_at: validDatetime,
          status: "closed",
        });

        expect(result.success).toBe(true);
      });

      it("rejects status 'closed' without ended_at", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          ended_at: null,
          status: "closed",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("ended_at");
        }
      });

      it("accepts status 'closed' with ended_at", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          ended_at: validDatetimeLater,
          status: "closed",
        });

        expect(result.success).toBe(true);
      });

      it("accepts status 'active' without ended_at", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          status: "active",
        });

        expect(result.success).toBe(true);
      });

      it("accepts status 'draft' without ended_at", () => {
        const result = createTripSchema.safeParse({
          started_at: validDatetime,
          status: "draft",
        });

        expect(result.success).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // quickStartTripSchema
  // ---------------------------------------------------------------------------

  describe("quickStartTripSchema", () => {
    it("accepts valid input with both booleans true", () => {
      const result = quickStartTripSchema.safeParse({
        use_gps: true,
        copy_equipment_from_last_trip: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.use_gps).toBe(true);
        expect(result.data.copy_equipment_from_last_trip).toBe(true);
      }
    });

    it("accepts valid input with both booleans false", () => {
      const result = quickStartTripSchema.safeParse({
        use_gps: false,
        copy_equipment_from_last_trip: false,
      });

      expect(result.success).toBe(true);
    });

    it("rejects missing use_gps", () => {
      const result = quickStartTripSchema.safeParse({
        copy_equipment_from_last_trip: true,
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing copy_equipment_from_last_trip", () => {
      const result = quickStartTripSchema.safeParse({
        use_gps: true,
      });

      expect(result.success).toBe(false);
    });

    it("rejects non-boolean use_gps", () => {
      const result = quickStartTripSchema.safeParse({
        use_gps: "true",
        copy_equipment_from_last_trip: true,
      });

      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // updateTripSchema
  // ---------------------------------------------------------------------------

  describe("updateTripSchema", () => {
    it("accepts empty object (all fields optional)", () => {
      const result = updateTripSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only started_at", () => {
      const result = updateTripSchema.safeParse({
        started_at: validDatetime,
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only status", () => {
      const result = updateTripSchema.safeParse({
        status: "active",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only location", () => {
      const result = updateTripSchema.safeParse({
        location: { lat: 52.1, lng: 21.0 },
      });

      expect(result.success).toBe(true);
    });

    it("accepts setting location to null", () => {
      const result = updateTripSchema.safeParse({
        location: null,
      });

      expect(result.success).toBe(true);
    });

    it("accepts setting ended_at to null", () => {
      const result = updateTripSchema.safeParse({
        ended_at: null,
      });

      expect(result.success).toBe(true);
    });

    it("validates ended_at >= started_at when both provided", () => {
      const result = updateTripSchema.safeParse({
        started_at: validDatetimeLater,
        ended_at: validDatetime, // earlier
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("ended_at");
      }
    });

    it("does not validate ended_at >= started_at when only ended_at provided", () => {
      // This is valid at schema level; service layer validates against existing started_at
      const result = updateTripSchema.safeParse({
        ended_at: validDatetime,
      });

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // closeTripSchema
  // ---------------------------------------------------------------------------

  describe("closeTripSchema", () => {
    it("accepts valid ended_at datetime", () => {
      const result = closeTripSchema.safeParse({
        ended_at: validDatetime,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ended_at).toBe(validDatetime);
      }
    });

    it("rejects missing ended_at", () => {
      const result = closeTripSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("rejects invalid ended_at format", () => {
      const result = closeTripSchema.safeParse({
        ended_at: invalidDatetime,
      });

      expect(result.success).toBe(false);
    });

    it("rejects null ended_at", () => {
      const result = closeTripSchema.safeParse({
        ended_at: null,
      });

      expect(result.success).toBe(false);
    });
  });
});
