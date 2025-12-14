import { z } from "zod";

/**
 * Zod schemas for catch form validation (client-side).
 *
 * Handles:
 * - Required fields: species_id, caught_at
 * - Optional fields: lure_id, groundbait_id, weight_g, length_mm
 * - Conversion: kg→g (weight), cm→mm (length)
 */

// ---------------------------------------------------------------------------
// Schemat formularza połowu
// ---------------------------------------------------------------------------

/**
 * Schema for the catch form with all validation rules.
 * Weight and length use user-friendly units (kg, cm) but store as (g, mm).
 */
/**
 * Helper to validate optional UUID (empty string treated as null).
 */
const optionalUuid = z
  .string()
  .transform((val) => (val === "" ? null : val))
  .pipe(z.string().uuid().nullable());

export const catchFormSchema = z.object({
  /** Fish species UUID (required) */
  species_id: z.string().uuid("Wybierz gatunek ryby"),

  /** Lure UUID (optional) */
  lure_id: optionalUuid.optional(),

  /** Groundbait UUID (optional) */
  groundbait_id: optionalUuid.optional(),

  /** Datetime when the fish was caught (required) */
  caught_at: z.date({
    required_error: "Podaj czas połowu",
    invalid_type_error: "Nieprawidłowy format daty",
  }),

  /** Weight in grams (optional, max 100kg = 100000g) */
  weight_g: z
    .number()
    .int("Waga musi być liczbą całkowitą")
    .positive("Waga musi być większa od 0")
    .max(100000, "Maksymalna waga to 100 kg")
    .nullable()
    .optional(),

  /** Length in millimeters (optional, max 300cm = 3000mm) */
  length_mm: z
    .number()
    .int("Długość musi być liczbą całkowitą")
    .positive("Długość musi być większa od 0")
    .max(3000, "Maksymalna długość to 300 cm")
    .nullable()
    .optional(),
});

export type CatchFormSchemaInput = z.input<typeof catchFormSchema>;
export type CatchFormSchemaOutput = z.output<typeof catchFormSchema>;

// ---------------------------------------------------------------------------
// Walidacja kontekstowa (zakres dat wyprawy)
// ---------------------------------------------------------------------------

/**
 * Creates a refined schema with trip date range validation.
 *
 * @param tripStartedAt - Trip start datetime (ISO string)
 * @param tripEndedAt - Trip end datetime (ISO string) or null if still active
 */
export function createCatchFormSchemaWithTripDates(tripStartedAt: string, tripEndedAt: string | null) {
  return catchFormSchema.refine(
    (data) => {
      const startDate = new Date(tripStartedAt);
      const caughtAt = data.caught_at;

      // Must be after trip start
      if (caughtAt < startDate) {
        return false;
      }

      // Must be before trip end (if set)
      if (tripEndedAt) {
        const endDate = new Date(tripEndedAt);
        if (caughtAt > endDate) {
          return false;
        }
      }

      // Cannot be in the future
      if (caughtAt > new Date()) {
        return false;
      }

      return true;
    },
    {
      message: "Data połowu musi być w zakresie wyprawy i nie może być w przyszłości",
      path: ["caught_at"],
    }
  );
}

// ---------------------------------------------------------------------------
// Helper: Walidacja pojedynczego pola caught_at
// ---------------------------------------------------------------------------

/**
 * Validates caught_at against trip date range.
 *
 * @param caughtAt - The catch datetime
 * @param tripStartedAt - Trip start datetime (ISO string)
 * @param tripEndedAt - Trip end datetime (ISO string) or null
 * @returns Error message or undefined if valid
 */
export function validateCaughtAtInTripRange(
  caughtAt: Date,
  tripStartedAt: string,
  tripEndedAt: string | null
): string | undefined {
  const startDate = new Date(tripStartedAt);

  if (caughtAt < startDate) {
    return "Data połowu nie może być przed rozpoczęciem wyprawy";
  }

  if (tripEndedAt) {
    const endDate = new Date(tripEndedAt);
    if (caughtAt > endDate) {
      return "Data połowu nie może być po zakończeniu wyprawy";
    }
  }

  if (caughtAt > new Date()) {
    return "Data połowu nie może być w przyszłości";
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Konwersja jednostek
// ---------------------------------------------------------------------------

/**
 * Converts weight from kilograms (user input) to grams (storage).
 * Handles decimal input (e.g., 1.5 kg = 1500 g).
 */
export function kgToGrams(kg: number | null | undefined): number | null {
  if (kg === null || kg === undefined) return null;
  return Math.round(kg * 1000);
}

/**
 * Converts weight from grams (storage) to kilograms (display).
 */
export function gramsToKg(grams: number | null | undefined): number | null {
  if (grams === null || grams === undefined) return null;
  return grams / 1000;
}

/**
 * Converts length from centimeters (user input) to millimeters (storage).
 * Handles decimal input (e.g., 65.5 cm = 655 mm).
 */
export function cmToMm(cm: number | null | undefined): number | null {
  if (cm === null || cm === undefined) return null;
  return Math.round(cm * 10);
}

/**
 * Converts length from millimeters (storage) to centimeters (display).
 */
export function mmToCm(mm: number | null | undefined): number | null {
  if (mm === null || mm === undefined) return null;
  return mm / 10;
}
