import { z } from "zod";

/**
 * Zod schema for trip edit form validation (client-side).
 * Validates the form data before submission to API.
 */

/**
 * Location object schema for form
 */
export const tripEditLocationSchema = z
  .object({
    lat: z
      .number({ required_error: "Szerokość geograficzna jest wymagana" })
      .min(-90, "Szerokość geograficzna musi być >= -90")
      .max(90, "Szerokość geograficzna musi być <= 90"),
    lng: z
      .number({ required_error: "Długość geograficzna jest wymagana" })
      .min(-180, "Długość geograficzna musi być >= -180")
      .max(180, "Długość geograficzna musi być <= 180"),
    label: z.string().max(255, "Nazwa miejsca może mieć max 255 znaków").default(""),
  })
  .nullable();

/**
 * Main form schema for editing a trip.
 * Uses Date objects for datetime fields (form works with JS Dates).
 */
export const tripEditFormSchema = z
  .object({
    /** Trip start date/time (required) */
    started_at: z.date({
      required_error: "Data rozpoczęcia jest wymagana",
      invalid_type_error: "Nieprawidłowy format daty",
    }),
    /** Trip end date/time (optional) */
    ended_at: z
      .date({
        invalid_type_error: "Nieprawidłowy format daty",
      })
      .nullable(),
    /** Location with coordinates and label */
    location: tripEditLocationSchema,
    /** Selected rod IDs */
    selectedRodIds: z.array(z.string().uuid("Nieprawidłowy identyfikator wędki")),
    /** Selected lure IDs */
    selectedLureIds: z.array(z.string().uuid("Nieprawidłowy identyfikator przynęty")),
    /** Selected groundbait IDs */
    selectedGroundbaitIds: z.array(z.string().uuid("Nieprawidłowy identyfikator zanęty")),
  })
  .refine(
    (data) => {
      if (data.ended_at && data.started_at) {
        return data.ended_at >= data.started_at;
      }
      return true;
    },
    {
      message: "Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia",
      path: ["ended_at"],
    }
  );

/**
 * Inferred type from schema - used in form components
 */
export type TripEditFormData = z.infer<typeof tripEditFormSchema>;

/**
 * Default values for the form (used when creating new form instance)
 */
export const tripEditFormDefaults: TripEditFormData = {
  started_at: new Date(),
  ended_at: null,
  location: null,
  selectedRodIds: [],
  selectedLureIds: [],
  selectedGroundbaitIds: [],
};
