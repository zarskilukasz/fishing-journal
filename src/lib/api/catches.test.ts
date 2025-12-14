import { describe, it, expect } from "vitest";
import { CatchApiError, getCatchApiErrorMessage, CATCH_API_ERROR_MESSAGES } from "./catches";

describe("catches API", () => {
  // ---------------------------------------------------------------------------
  // CatchApiError
  // ---------------------------------------------------------------------------

  describe("CatchApiError", () => {
    it("creates error with all properties", () => {
      const error = new CatchApiError("Test error", "test_code", 400, { field: "species_id" });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: "species_id" });
      expect(error.name).toBe("CatchApiError");
    });

    it("creates error without details", () => {
      const error = new CatchApiError("Test error", "test_code", 404);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(404);
      expect(error.details).toBeUndefined();
    });

    it("is instanceof Error", () => {
      const error = new CatchApiError("Test", "code", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CatchApiError);
    });

    it("has correct name property", () => {
      const error = new CatchApiError("Test", "code", 500);

      expect(error.name).toBe("CatchApiError");
    });
  });

  // ---------------------------------------------------------------------------
  // CATCH_API_ERROR_MESSAGES
  // ---------------------------------------------------------------------------

  describe("CATCH_API_ERROR_MESSAGES", () => {
    it("contains Polish message for unauthorized", () => {
      expect(CATCH_API_ERROR_MESSAGES.unauthorized).toBe("Sesja wygasła. Zaloguj się ponownie.");
    });

    it("contains Polish message for validation_error", () => {
      expect(CATCH_API_ERROR_MESSAGES.validation_error).toBe("Nieprawidłowe dane połowu.");
    });

    it("contains Polish message for not_found", () => {
      expect(CATCH_API_ERROR_MESSAGES.not_found).toBe("Połów nie został znaleziony.");
    });

    it("contains Polish message for equipment_owner_mismatch", () => {
      expect(CATCH_API_ERROR_MESSAGES.equipment_owner_mismatch).toBe("Wybrany sprzęt należy do innego użytkownika.");
    });

    it("contains Polish message for equipment_soft_deleted", () => {
      expect(CATCH_API_ERROR_MESSAGES.equipment_soft_deleted).toBe("Wybrany sprzęt został usunięty.");
    });

    it("contains Polish message for payload_too_large", () => {
      expect(CATCH_API_ERROR_MESSAGES.payload_too_large).toBe("Plik jest za duży. Maksymalny rozmiar to 10MB.");
    });

    it("contains Polish message for internal_error", () => {
      expect(CATCH_API_ERROR_MESSAGES.internal_error).toBe("Wystąpił błąd serwera. Spróbuj ponownie.");
    });

    it("contains Polish message for network_error", () => {
      expect(CATCH_API_ERROR_MESSAGES.network_error).toBe("Brak połączenia z internetem.");
    });

    it("contains Polish message for unknown_error", () => {
      expect(CATCH_API_ERROR_MESSAGES.unknown_error).toBe("Wystąpił nieoczekiwany błąd.");
    });
  });

  // ---------------------------------------------------------------------------
  // getCatchApiErrorMessage
  // ---------------------------------------------------------------------------

  describe("getCatchApiErrorMessage", () => {
    it("returns mapped message for known CatchApiError code", () => {
      const error = new CatchApiError("Server error", "unauthorized", 401);
      const message = getCatchApiErrorMessage(error);

      expect(message).toBe("Sesja wygasła. Zaloguj się ponownie.");
    });

    it("returns original message for unknown CatchApiError code", () => {
      const error = new CatchApiError("Niestandardowy błąd", "custom_code", 400);
      const message = getCatchApiErrorMessage(error);

      expect(message).toBe("Niestandardowy błąd");
    });

    it("returns message from regular Error", () => {
      const error = new Error("Regularny błąd");
      const message = getCatchApiErrorMessage(error);

      expect(message).toBe("Regularny błąd");
    });

    it("returns unknown_error message for non-Error values", () => {
      const message1 = getCatchApiErrorMessage("string error");
      const message2 = getCatchApiErrorMessage(null);
      const message3 = getCatchApiErrorMessage(undefined);
      const message4 = getCatchApiErrorMessage({ custom: "object" });

      expect(message1).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message2).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message3).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message4).toBe("Wystąpił nieoczekiwany błąd.");
    });

    it("maps all known error codes correctly", () => {
      const testCases = [
        { code: "unauthorized", expected: "Sesja wygasła. Zaloguj się ponownie." },
        { code: "validation_error", expected: "Nieprawidłowe dane połowu." },
        { code: "not_found", expected: "Połów nie został znaleziony." },
        { code: "equipment_owner_mismatch", expected: "Wybrany sprzęt należy do innego użytkownika." },
        { code: "equipment_soft_deleted", expected: "Wybrany sprzęt został usunięty." },
        { code: "payload_too_large", expected: "Plik jest za duży. Maksymalny rozmiar to 10MB." },
        { code: "internal_error", expected: "Wystąpił błąd serwera. Spróbuj ponownie." },
        { code: "network_error", expected: "Brak połączenia z internetem." },
        { code: "unknown_error", expected: "Wystąpił nieoczekiwany błąd." },
      ];

      for (const { code, expected } of testCases) {
        const error = new CatchApiError("original", code, 400);
        const message = getCatchApiErrorMessage(error);
        expect(message).toBe(expected);
      }
    });
  });
});

