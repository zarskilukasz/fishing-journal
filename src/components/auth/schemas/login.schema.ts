import { z } from "zod";

/**
 * Schema walidacji formularza logowania.
 * Waliduje email i hasło zgodnie z wymaganiami MVP.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format adresu email"),
  password: z.string().min(1, "Hasło jest wymagane").min(6, "Hasło musi mieć minimum 6 znaków"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export interface LoginFormErrors {
  email?: string;
  password?: string;
}
