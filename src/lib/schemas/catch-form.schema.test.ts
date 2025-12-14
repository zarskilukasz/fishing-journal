import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  catchFormSchema,
  createCatchFormSchemaWithTripDates,
  validateCaughtAtInTripRange,
  kgToGrams,
  gramsToKg,
  cmToMm,
  mmToCm,
} from "./catch-form.schema";

describe("catch-form.schema", () => {
  // ---------------------------------------------------------------------------
  // catchFormSchema
  // ---------------------------------------------------------------------------

  describe("catchFormSchema", () => {
    const validData = {
      species_id: "550e8400-e29b-41d4-a716-446655440000",
      caught_at: new Date("2025-12-14T10:00:00Z"),
    };

    it("validates minimal valid data", () => {
      const result = catchFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("validates complete data with all optional fields", () => {
      const completeData = {
        ...validData,
        lure_id: "550e8400-e29b-41d4-a716-446655440001",
        groundbait_id: "550e8400-e29b-41d4-a716-446655440002",
        weight_g: 2500,
        length_mm: 450,
      };
      const result = catchFormSchema.safeParse(completeData);
      expect(result.success).toBe(true);
    });

    // species_id validation
    it("rejects missing species_id", () => {
      const data = { caught_at: new Date() };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid species_id UUID", () => {
      const data = { ...validData, species_id: "not-a-uuid" };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    // caught_at validation
    it("rejects missing caught_at", () => {
      const data = { species_id: validData.species_id };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid caught_at type", () => {
      const data = { ...validData, caught_at: "not-a-date" };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    // lure_id validation
    it("accepts undefined lure_id (optional field)", () => {
      const data = { ...validData };
      // lure_id is optional, so not providing it should pass
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("transforms empty string lure_id to null", () => {
      const data = { ...validData, lure_id: "" };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lure_id).toBeNull();
      }
    });

    it("rejects invalid lure_id UUID", () => {
      const data = { ...validData, lure_id: "invalid-uuid" };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    // groundbait_id validation
    it("accepts undefined groundbait_id (optional field)", () => {
      const data = { ...validData };
      // groundbait_id is optional, so not providing it should pass
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("transforms empty string groundbait_id to null", () => {
      const data = { ...validData, groundbait_id: "" };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.groundbait_id).toBeNull();
      }
    });

    // weight_g validation
    it("accepts valid weight_g", () => {
      const data = { ...validData, weight_g: 1500 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts null weight_g", () => {
      const data = { ...validData, weight_g: null };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects negative weight_g", () => {
      const data = { ...validData, weight_g: -100 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects zero weight_g", () => {
      const data = { ...validData, weight_g: 0 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects weight_g exceeding 100kg (100000g)", () => {
      const data = { ...validData, weight_g: 100001 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts weight_g at exactly 100kg", () => {
      const data = { ...validData, weight_g: 100000 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects non-integer weight_g", () => {
      const data = { ...validData, weight_g: 1500.5 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    // length_mm validation
    it("accepts valid length_mm", () => {
      const data = { ...validData, length_mm: 450 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts null length_mm", () => {
      const data = { ...validData, length_mm: null };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects negative length_mm", () => {
      const data = { ...validData, length_mm: -10 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects zero length_mm", () => {
      const data = { ...validData, length_mm: 0 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects length_mm exceeding 300cm (3000mm)", () => {
      const data = { ...validData, length_mm: 3001 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts length_mm at exactly 300cm", () => {
      const data = { ...validData, length_mm: 3000 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects non-integer length_mm", () => {
      const data = { ...validData, length_mm: 450.5 };
      const result = catchFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // createCatchFormSchemaWithTripDates
  // ---------------------------------------------------------------------------

  describe("createCatchFormSchemaWithTripDates", () => {
    const tripStartedAt = "2025-12-14T08:00:00Z";
    const tripEndedAt = "2025-12-14T18:00:00Z";

    beforeEach(() => {
      // Mock Date.now to return a fixed time after trip end
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-12-14T20:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("validates catch within trip date range", () => {
      const schema = createCatchFormSchemaWithTripDates(tripStartedAt, tripEndedAt);
      const data = {
        species_id: "550e8400-e29b-41d4-a716-446655440000",
        caught_at: new Date("2025-12-14T12:00:00Z"),
      };
      const result = schema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects catch before trip start", () => {
      const schema = createCatchFormSchemaWithTripDates(tripStartedAt, tripEndedAt);
      const data = {
        species_id: "550e8400-e29b-41d4-a716-446655440000",
        caught_at: new Date("2025-12-14T06:00:00Z"),
      };
      const result = schema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects catch after trip end", () => {
      const schema = createCatchFormSchemaWithTripDates(tripStartedAt, tripEndedAt);
      const data = {
        species_id: "550e8400-e29b-41d4-a716-446655440000",
        caught_at: new Date("2025-12-14T19:00:00Z"),
      };
      const result = schema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("allows catch for active trip (no end date)", () => {
      const schema = createCatchFormSchemaWithTripDates(tripStartedAt, null);
      const data = {
        species_id: "550e8400-e29b-41d4-a716-446655440000",
        caught_at: new Date("2025-12-14T19:00:00Z"),
      };
      const result = schema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects catch in the future", () => {
      const schema = createCatchFormSchemaWithTripDates(tripStartedAt, null);
      const data = {
        species_id: "550e8400-e29b-41d4-a716-446655440000",
        caught_at: new Date("2025-12-14T22:00:00Z"), // After mocked "now"
      };
      const result = schema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // validateCaughtAtInTripRange
  // ---------------------------------------------------------------------------

  describe("validateCaughtAtInTripRange", () => {
    const tripStartedAt = "2025-12-14T08:00:00Z";
    const tripEndedAt = "2025-12-14T18:00:00Z";

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-12-14T20:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns undefined for valid caught_at within trip range", () => {
      const result = validateCaughtAtInTripRange(
        new Date("2025-12-14T12:00:00Z"),
        tripStartedAt,
        tripEndedAt
      );
      expect(result).toBeUndefined();
    });

    it("returns error for caught_at before trip start", () => {
      const result = validateCaughtAtInTripRange(
        new Date("2025-12-14T06:00:00Z"),
        tripStartedAt,
        tripEndedAt
      );
      expect(result).toBe("Data połowu nie może być przed rozpoczęciem wyprawy");
    });

    it("returns error for caught_at after trip end", () => {
      const result = validateCaughtAtInTripRange(
        new Date("2025-12-14T19:00:00Z"),
        tripStartedAt,
        tripEndedAt
      );
      expect(result).toBe("Data połowu nie może być po zakończeniu wyprawy");
    });

    it("allows caught_at after trip start when no end date", () => {
      const result = validateCaughtAtInTripRange(
        new Date("2025-12-14T19:00:00Z"),
        tripStartedAt,
        null
      );
      expect(result).toBeUndefined();
    });

    it("returns error for caught_at in the future", () => {
      const result = validateCaughtAtInTripRange(
        new Date("2025-12-14T22:00:00Z"),
        tripStartedAt,
        null
      );
      expect(result).toBe("Data połowu nie może być w przyszłości");
    });
  });

  // ---------------------------------------------------------------------------
  // Unit conversion functions
  // ---------------------------------------------------------------------------

  describe("kgToGrams", () => {
    it("converts kilograms to grams", () => {
      expect(kgToGrams(1)).toBe(1000);
      expect(kgToGrams(2.5)).toBe(2500);
      expect(kgToGrams(0.5)).toBe(500);
    });

    it("rounds to nearest gram", () => {
      expect(kgToGrams(1.5555)).toBe(1556);
      expect(kgToGrams(1.5554)).toBe(1555);
    });

    it("returns null for null input", () => {
      expect(kgToGrams(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(kgToGrams(undefined)).toBeNull();
    });

    it("handles zero", () => {
      expect(kgToGrams(0)).toBe(0);
    });
  });

  describe("gramsToKg", () => {
    it("converts grams to kilograms", () => {
      expect(gramsToKg(1000)).toBe(1);
      expect(gramsToKg(2500)).toBe(2.5);
      expect(gramsToKg(500)).toBe(0.5);
    });

    it("returns null for null input", () => {
      expect(gramsToKg(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(gramsToKg(undefined)).toBeNull();
    });

    it("handles zero", () => {
      expect(gramsToKg(0)).toBe(0);
    });

    it("handles decimal results", () => {
      expect(gramsToKg(1234)).toBe(1.234);
    });
  });

  describe("cmToMm", () => {
    it("converts centimeters to millimeters", () => {
      expect(cmToMm(10)).toBe(100);
      expect(cmToMm(65.5)).toBe(655);
      expect(cmToMm(0.5)).toBe(5);
    });

    it("rounds to nearest millimeter", () => {
      expect(cmToMm(10.55)).toBe(106);
      expect(cmToMm(10.54)).toBe(105);
    });

    it("returns null for null input", () => {
      expect(cmToMm(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(cmToMm(undefined)).toBeNull();
    });

    it("handles zero", () => {
      expect(cmToMm(0)).toBe(0);
    });
  });

  describe("mmToCm", () => {
    it("converts millimeters to centimeters", () => {
      expect(mmToCm(100)).toBe(10);
      expect(mmToCm(655)).toBe(65.5);
      expect(mmToCm(5)).toBe(0.5);
    });

    it("returns null for null input", () => {
      expect(mmToCm(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(mmToCm(undefined)).toBeNull();
    });

    it("handles zero", () => {
      expect(mmToCm(0)).toBe(0);
    });

    it("handles decimal results", () => {
      expect(mmToCm(123)).toBe(12.3);
    });
  });

  // ---------------------------------------------------------------------------
  // Conversion round-trip tests
  // ---------------------------------------------------------------------------

  describe("conversion round-trips", () => {
    it("kgToGrams -> gramsToKg preserves value (with integer kg)", () => {
      const original = 5;
      const converted = gramsToKg(kgToGrams(original));
      expect(converted).toBe(original);
    });

    it("cmToMm -> mmToCm preserves value (with integer cm)", () => {
      const original = 45;
      const converted = mmToCm(cmToMm(original));
      expect(converted).toBe(original);
    });

    it("gramsToKg -> kgToGrams preserves value", () => {
      const original = 2500;
      const converted = kgToGrams(gramsToKg(original));
      expect(converted).toBe(original);
    });

    it("mmToCm -> cmToMm preserves value", () => {
      const original = 655;
      const converted = cmToMm(mmToCm(original));
      expect(converted).toBe(original);
    });
  });
});

