import { describe, it, expect } from "vitest";
import { TripApiError, getApiErrorMessage, API_ERROR_MESSAGES } from "./trips";

describe("trips API", () => {
  // ---------------------------------------------------------------------------
  // TripApiError
  // ---------------------------------------------------------------------------

  describe("TripApiError", () => {
    it("creates error with all properties", () => {
      const error = new TripApiError("Test error", "test_code", 400, { tripId: "123" });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ tripId: "123" });
      expect(error.name).toBe("TripApiError");
    });

    it("creates error without details", () => {
      const error = new TripApiError("Test error", "test_code", 404);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(404);
      expect(error.details).toBeUndefined();
    });

    it("is instanceof Error", () => {
      const error = new TripApiError("Test", "code", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TripApiError);
    });

    it("has correct name property", () => {
      const error = new TripApiError("Test", "code", 500);

      expect(error.name).toBe("TripApiError");
    });
  });

  // ---------------------------------------------------------------------------
  // API_ERROR_MESSAGES
  // ---------------------------------------------------------------------------

  describe("API_ERROR_MESSAGES", () => {
    it("contains Polish message for unauthorized", () => {
      expect(API_ERROR_MESSAGES.unauthorized).toBe("Sesja wygasła. Zaloguj się ponownie.");
    });

    it("contains Polish message for validation_error", () => {
      expect(API_ERROR_MESSAGES.validation_error).toBe("Nieprawidłowe dane.");
    });

    it("contains Polish message for not_found", () => {
      expect(API_ERROR_MESSAGES.not_found).toBe("Zasób nie został znaleziony.");
    });

    it("contains Polish message for conflict", () => {
      expect(API_ERROR_MESSAGES.conflict).toBe("Wystąpił konflikt. Spróbuj ponownie.");
    });

    it("contains Polish message for rate_limited", () => {
      expect(API_ERROR_MESSAGES.rate_limited).toBe("Zbyt wiele prób. Poczekaj chwilę.");
    });

    it("contains Polish message for internal_error", () => {
      expect(API_ERROR_MESSAGES.internal_error).toBe("Wystąpił błąd serwera. Spróbuj ponownie.");
    });

    it("contains Polish message for unknown_error", () => {
      expect(API_ERROR_MESSAGES.unknown_error).toBe("Wystąpił nieoczekiwany błąd.");
    });
  });

  // ---------------------------------------------------------------------------
  // getApiErrorMessage
  // ---------------------------------------------------------------------------

  describe("getApiErrorMessage", () => {
    it("returns mapped message for known TripApiError code", () => {
      const error = new TripApiError("Server error", "unauthorized", 401);
      const message = getApiErrorMessage(error);

      expect(message).toBe("Sesja wygasła. Zaloguj się ponownie.");
    });

    it("returns original message for unknown TripApiError code", () => {
      const error = new TripApiError("Niestandardowy błąd", "custom_code", 400);
      const message = getApiErrorMessage(error);

      expect(message).toBe("Niestandardowy błąd");
    });

    it("returns message from regular Error", () => {
      const error = new Error("Regularny błąd");
      const message = getApiErrorMessage(error);

      expect(message).toBe("Regularny błąd");
    });

    it("returns unknown_error message for non-Error values", () => {
      const message1 = getApiErrorMessage("string error");
      const message2 = getApiErrorMessage(null);
      const message3 = getApiErrorMessage(undefined);
      const message4 = getApiErrorMessage({ custom: "object" });

      expect(message1).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message2).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message3).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message4).toBe("Wystąpił nieoczekiwany błąd.");
    });

    it("maps all known error codes correctly", () => {
      const testCases = [
        { code: "unauthorized", expected: "Sesja wygasła. Zaloguj się ponownie." },
        { code: "validation_error", expected: "Nieprawidłowe dane." },
        { code: "not_found", expected: "Zasób nie został znaleziony." },
        { code: "conflict", expected: "Wystąpił konflikt. Spróbuj ponownie." },
        { code: "rate_limited", expected: "Zbyt wiele prób. Poczekaj chwilę." },
        { code: "internal_error", expected: "Wystąpił błąd serwera. Spróbuj ponownie." },
        { code: "unknown_error", expected: "Wystąpił nieoczekiwany błąd." },
      ];

      for (const { code, expected } of testCases) {
        const error = new TripApiError("original", code, 400);
        const message = getApiErrorMessage(error);
        expect(message).toBe(expected);
      }
    });
  });
});
