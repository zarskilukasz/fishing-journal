import { describe, it, expect } from "vitest";
import { FishSpeciesApiError } from "./fish-species";

describe("fish-species API", () => {
  // ---------------------------------------------------------------------------
  // FishSpeciesApiError
  // ---------------------------------------------------------------------------

  describe("FishSpeciesApiError", () => {
    it("creates error with all properties", () => {
      const error = new FishSpeciesApiError("Test error", "test_code", 400);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("FishSpeciesApiError");
    });

    it("is instanceof Error", () => {
      const error = new FishSpeciesApiError("Test", "code", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FishSpeciesApiError);
    });

    it("has correct name property", () => {
      const error = new FishSpeciesApiError("Test", "code", 500);

      expect(error.name).toBe("FishSpeciesApiError");
    });

    it("handles various error scenarios", () => {
      const testCases = [
        { message: "Not authorized", code: "unauthorized", status: 401 },
        { message: "Species not found", code: "not_found", status: 404 },
        { message: "Server error", code: "internal_error", status: 500 },
        { message: "Unknown", code: "unknown_error", status: 500 },
      ];

      for (const { message, code, status } of testCases) {
        const error = new FishSpeciesApiError(message, code, status);
        expect(error.message).toBe(message);
        expect(error.code).toBe(code);
        expect(error.statusCode).toBe(status);
      }
    });

    it("can be caught as Error", () => {
      const error = new FishSpeciesApiError("Test", "test_code", 404);

      let caught = false;
      try {
        throw error;
      } catch (e) {
        caught = true;
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(FishSpeciesApiError);
      }
      expect(caught).toBe(true);
    });
  });
});
