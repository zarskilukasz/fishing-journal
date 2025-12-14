import { describe, it, expect } from "vitest";
import { WeatherApiError, getWeatherErrorMessage, WEATHER_ERROR_MESSAGES } from "./weather";

describe("weather API", () => {
  // ---------------------------------------------------------------------------
  // WeatherApiError
  // ---------------------------------------------------------------------------

  describe("WeatherApiError", () => {
    it("creates error with all properties", () => {
      const error = new WeatherApiError("Test error", "test_code", 400, { tripId: "123" });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ tripId: "123" });
      expect(error.name).toBe("WeatherApiError");
    });

    it("creates error without details", () => {
      const error = new WeatherApiError("Test error", "test_code", 404);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("test_code");
      expect(error.statusCode).toBe(404);
      expect(error.details).toBeUndefined();
    });

    it("is instanceof Error", () => {
      const error = new WeatherApiError("Test", "code", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WeatherApiError);
    });

    it("has correct name property", () => {
      const error = new WeatherApiError("Test", "code", 500);

      expect(error.name).toBe("WeatherApiError");
    });
  });

  // ---------------------------------------------------------------------------
  // WEATHER_ERROR_MESSAGES
  // ---------------------------------------------------------------------------

  describe("WEATHER_ERROR_MESSAGES", () => {
    it("contains Polish message for rate_limited", () => {
      expect(WEATHER_ERROR_MESSAGES.rate_limited).toBe("Przekroczono limit zapytań. Spróbuj ponownie za chwilę.");
    });

    it("contains Polish message for bad_gateway", () => {
      expect(WEATHER_ERROR_MESSAGES.bad_gateway).toBe("Błąd serwisu pogodowego. Spróbuj ponownie później.");
    });

    it("contains Polish message for validation_error", () => {
      expect(WEATHER_ERROR_MESSAGES.validation_error).toBe(
        "Wyprawa nie spełnia wymagań (brak lokalizacji lub zbyt stara)."
      );
    });

    it("contains Polish message for not_found", () => {
      expect(WEATHER_ERROR_MESSAGES.not_found).toBe("Dane pogodowe nie zostały znalezione.");
    });

    it("contains Polish message for unauthorized", () => {
      expect(WEATHER_ERROR_MESSAGES.unauthorized).toBe("Sesja wygasła. Zaloguj się ponownie.");
    });

    it("contains Polish message for unknown_error", () => {
      expect(WEATHER_ERROR_MESSAGES.unknown_error).toBe("Wystąpił nieoczekiwany błąd.");
    });
  });

  // ---------------------------------------------------------------------------
  // getWeatherErrorMessage
  // ---------------------------------------------------------------------------

  describe("getWeatherErrorMessage", () => {
    it("returns mapped message for known WeatherApiError code", () => {
      const error = new WeatherApiError("Server error", "rate_limited", 429);
      const message = getWeatherErrorMessage(error);

      expect(message).toBe("Przekroczono limit zapytań. Spróbuj ponownie za chwilę.");
    });

    it("returns original message for unknown WeatherApiError code", () => {
      const error = new WeatherApiError("Niestandardowy błąd", "custom_code", 400);
      const message = getWeatherErrorMessage(error);

      expect(message).toBe("Niestandardowy błąd");
    });

    it("returns message from regular Error", () => {
      const error = new Error("Regularny błąd");
      const message = getWeatherErrorMessage(error);

      expect(message).toBe("Regularny błąd");
    });

    it("returns unknown_error message for non-Error values", () => {
      const message1 = getWeatherErrorMessage("string error");
      const message2 = getWeatherErrorMessage(null);
      const message3 = getWeatherErrorMessage(undefined);
      const message4 = getWeatherErrorMessage({ custom: "object" });

      expect(message1).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message2).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message3).toBe("Wystąpił nieoczekiwany błąd.");
      expect(message4).toBe("Wystąpił nieoczekiwany błąd.");
    });

    it("maps all known error codes correctly", () => {
      const testCases = [
        { code: "rate_limited", expected: "Przekroczono limit zapytań. Spróbuj ponownie za chwilę." },
        { code: "bad_gateway", expected: "Błąd serwisu pogodowego. Spróbuj ponownie później." },
        { code: "validation_error", expected: "Wyprawa nie spełnia wymagań (brak lokalizacji lub zbyt stara)." },
        { code: "not_found", expected: "Dane pogodowe nie zostały znalezione." },
        { code: "unauthorized", expected: "Sesja wygasła. Zaloguj się ponownie." },
        { code: "unknown_error", expected: "Wystąpił nieoczekiwany błąd." },
      ];

      for (const { code, expected } of testCases) {
        const error = new WeatherApiError("original", code, 400);
        const message = getWeatherErrorMessage(error);
        expect(message).toBe(expected);
      }
    });
  });
});
