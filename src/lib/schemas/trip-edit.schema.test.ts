import { describe, it, expect } from "vitest";
import { tripEditFormSchema, tripEditLocationSchema, tripEditFormDefaults } from "./trip-edit.schema";

describe("trip-edit.schema", () => {
  // ---------------------------------------------------------------------------
  // tripEditLocationSchema
  // ---------------------------------------------------------------------------

  describe("tripEditLocationSchema", () => {
    it("validates valid location", () => {
      const location = { lat: 52.2297, lng: 21.0122, label: "Warszawa" };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it("accepts null location", () => {
      const result = tripEditLocationSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    it("validates location without label (uses default empty string)", () => {
      const location = { lat: 52.2297, lng: 21.0122 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.label).toBe("");
      }
    });

    it("accepts empty label", () => {
      const location = { lat: 52.2297, lng: 21.0122, label: "" };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    // lat validation
    it("rejects lat below -90", () => {
      const location = { lat: -91, lng: 21.0122 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it("rejects lat above 90", () => {
      const location = { lat: 91, lng: 21.0122 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it("accepts lat at boundary -90", () => {
      const location = { lat: -90, lng: 21.0122 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it("accepts lat at boundary 90", () => {
      const location = { lat: 90, lng: 21.0122 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    // lng validation
    it("rejects lng below -180", () => {
      const location = { lat: 52.2297, lng: -181 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it("rejects lng above 180", () => {
      const location = { lat: 52.2297, lng: 181 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it("accepts lng at boundary -180", () => {
      const location = { lat: 52.2297, lng: -180 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it("accepts lng at boundary 180", () => {
      const location = { lat: 52.2297, lng: 180 };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    // label validation
    it("rejects label exceeding 255 characters", () => {
      const location = { lat: 52.2297, lng: 21.0122, label: "A".repeat(256) };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it("accepts label at exactly 255 characters", () => {
      const location = { lat: 52.2297, lng: 21.0122, label: "A".repeat(255) };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it("accepts Polish characters in label", () => {
      const location = { lat: 52.2297, lng: 21.0122, label: "Jezioro Żywieckie" };
      const result = tripEditLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // tripEditFormSchema
  // ---------------------------------------------------------------------------

  describe("tripEditFormSchema", () => {
    const validData = {
      started_at: new Date("2025-12-14T08:00:00Z"),
      ended_at: new Date("2025-12-14T18:00:00Z"),
      location: { lat: 52.2297, lng: 21.0122, label: "Jezioro" },
      selectedRodIds: ["550e8400-e29b-41d4-a716-446655440001"],
      selectedLureIds: ["550e8400-e29b-41d4-a716-446655440002"],
      selectedGroundbaitIds: ["550e8400-e29b-41d4-a716-446655440003"],
    };

    it("validates complete valid data", () => {
      const result = tripEditFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("validates minimal data with empty equipment arrays", () => {
      const minimalData = {
        started_at: new Date(),
        ended_at: null,
        location: null,
        selectedRodIds: [],
        selectedLureIds: [],
        selectedGroundbaitIds: [],
      };
      const result = tripEditFormSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    // started_at validation
    it("rejects missing started_at", () => {
      const { started_at: _, ...rest } = validData;
      const result = tripEditFormSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects invalid started_at type", () => {
      const invalidData = { ...validData, started_at: "not-a-date" };
      const result = tripEditFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // ended_at validation
    it("accepts null ended_at", () => {
      const data = { ...validData, ended_at: null };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects ended_at before started_at", () => {
      const data = {
        ...validData,
        started_at: new Date("2025-12-14T18:00:00Z"),
        ended_at: new Date("2025-12-14T08:00:00Z"),
      };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const endedAtError = result.error.issues.find((issue) => issue.path.includes("ended_at"));
        expect(endedAtError?.message).toBe("Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia");
      }
    });

    it("accepts ended_at equal to started_at", () => {
      const sameTime = new Date("2025-12-14T12:00:00Z");
      const data = { ...validData, started_at: sameTime, ended_at: sameTime };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts ended_at after started_at", () => {
      const result = tripEditFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    // Equipment IDs validation
    it("rejects invalid UUID in selectedRodIds", () => {
      const data = { ...validData, selectedRodIds: ["not-a-uuid"] };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID in selectedLureIds", () => {
      const data = { ...validData, selectedLureIds: ["not-a-uuid"] };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID in selectedGroundbaitIds", () => {
      const data = { ...validData, selectedGroundbaitIds: ["not-a-uuid"] };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts multiple valid UUIDs in equipment arrays", () => {
      const data = {
        ...validData,
        selectedRodIds: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
        selectedLureIds: [
          "550e8400-e29b-41d4-a716-446655440003",
          "550e8400-e29b-41d4-a716-446655440004",
          "550e8400-e29b-41d4-a716-446655440005",
        ],
        selectedGroundbaitIds: ["550e8400-e29b-41d4-a716-446655440006"],
      };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    // location validation (integrated)
    it("validates with null location", () => {
      const data = { ...validData, location: null };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects invalid location coordinates", () => {
      const data = { ...validData, location: { lat: 200, lng: 21.0122 } };
      const result = tripEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // tripEditFormDefaults
  // ---------------------------------------------------------------------------

  describe("tripEditFormDefaults", () => {
    it("has started_at as Date", () => {
      expect(tripEditFormDefaults.started_at).toBeInstanceOf(Date);
    });

    it("has null ended_at", () => {
      expect(tripEditFormDefaults.ended_at).toBeNull();
    });

    it("has null location", () => {
      expect(tripEditFormDefaults.location).toBeNull();
    });

    it("has empty selectedRodIds array", () => {
      expect(tripEditFormDefaults.selectedRodIds).toEqual([]);
    });

    it("has empty selectedLureIds array", () => {
      expect(tripEditFormDefaults.selectedLureIds).toEqual([]);
    });

    it("has empty selectedGroundbaitIds array", () => {
      expect(tripEditFormDefaults.selectedGroundbaitIds).toEqual([]);
    });

    it("validates against the schema", () => {
      const result = tripEditFormSchema.safeParse(tripEditFormDefaults);
      expect(result.success).toBe(true);
    });
  });
});
