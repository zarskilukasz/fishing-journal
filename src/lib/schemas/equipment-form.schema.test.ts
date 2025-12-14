import { describe, it, expect } from "vitest";
import { equipmentFormSchema } from "./equipment-form.schema";

describe("equipment-form.schema", () => {
  // ---------------------------------------------------------------------------
  // equipmentFormSchema
  // ---------------------------------------------------------------------------

  describe("equipmentFormSchema", () => {
    it("validates valid equipment name", () => {
      const result = equipmentFormSchema.safeParse({ name: "Wędka spinningowa" });
      expect(result.success).toBe(true);
    });

    it("validates name with minimum length of 1", () => {
      const result = equipmentFormSchema.safeParse({ name: "A" });
      expect(result.success).toBe(true);
    });

    it("validates name with maximum length of 255", () => {
      const longName = "A".repeat(255);
      const result = equipmentFormSchema.safeParse({ name: longName });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = equipmentFormSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Nazwa jest wymagana");
      }
    });

    it("rejects missing name", () => {
      const result = equipmentFormSchema.safeParse({});
      expect(result.success).toBe(false);
      // Zod returns type error when field is undefined instead of custom required_error
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it("rejects name exceeding 255 characters", () => {
      const tooLongName = "A".repeat(256);
      const result = equipmentFormSchema.safeParse({ name: tooLongName });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Nazwa może mieć maksymalnie 255 znaków");
      }
    });

    it("accepts Polish characters in name", () => {
      const result = equipmentFormSchema.safeParse({ name: "Wędka z żółtą rączką" });
      expect(result.success).toBe(true);
    });

    it("accepts numbers in name", () => {
      const result = equipmentFormSchema.safeParse({ name: "Rapala X-Rap 10" });
      expect(result.success).toBe(true);
    });

    it("accepts special characters in name", () => {
      const result = equipmentFormSchema.safeParse({ name: "Przynęta #1 (złota)" });
      expect(result.success).toBe(true);
    });

    it("rejects non-string name", () => {
      const result = equipmentFormSchema.safeParse({ name: 123 });
      expect(result.success).toBe(false);
    });

    it("rejects null name", () => {
      const result = equipmentFormSchema.safeParse({ name: null });
      expect(result.success).toBe(false);
    });

    it("accepts name with leading/trailing spaces (not trimmed)", () => {
      const result = equipmentFormSchema.safeParse({ name: "  Wędka  " });
      expect(result.success).toBe(true);
      if (result.success) {
        // Note: schema doesn't trim, so spaces are preserved
        expect(result.data.name).toBe("  Wędka  ");
      }
    });

    it("accepts emoji in name", () => {
      const result = equipmentFormSchema.safeParse({ name: "Wędka 🎣 Premium" });
      expect(result.success).toBe(true);
    });
  });
});
