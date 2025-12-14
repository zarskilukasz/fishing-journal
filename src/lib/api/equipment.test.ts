import { describe, it, expect } from "vitest";
import { EquipmentApiError } from "./equipment";

describe("equipment API", () => {
  // ---------------------------------------------------------------------------
  // EquipmentApiError
  // ---------------------------------------------------------------------------

  describe("EquipmentApiError", () => {
    it("creates error with all properties", () => {
      const error = new EquipmentApiError("Test error", "test_code", 400, { field: "name" });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: "name" });
      expect(error.name).toBe("EquipmentApiError");
    });

    it("creates error without details", () => {
      const error = new EquipmentApiError("Test error", "test_code", 404);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(404);
      expect(error.details).toBeUndefined();
    });

    it("is instanceof Error", () => {
      const error = new EquipmentApiError("Test", "code", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EquipmentApiError);
    });

    it("has correct name property", () => {
      const error = new EquipmentApiError("Test", "code", 500);

      expect(error.name).toBe("EquipmentApiError");
    });

    it("handles various status codes", () => {
      const testCases = [
        { code: "validation_error", status: 400 },
        { code: "unauthorized", status: 401 },
        { code: "forbidden", status: 403 },
        { code: "not_found", status: 404 },
        { code: "conflict", status: 409 },
        { code: "internal_error", status: 500 },
      ];

      for (const { code, status } of testCases) {
        const error = new EquipmentApiError("message", code, status);
        expect(error.statusCode).toBe(status);
        expect(error.code).toBe(code);
      }
    });

    it("preserves details object structure", () => {
      const details = {
        field: "name",
        reason: "Name too long",
        maxLength: 255,
        provided: 300,
      };
      const error = new EquipmentApiError("Validation failed", "validation_error", 400, details);

      expect(error.details).toEqual(details);
      expect(error.details?.field).toBe("name");
      expect(error.details?.maxLength).toBe(255);
    });
  });
});

