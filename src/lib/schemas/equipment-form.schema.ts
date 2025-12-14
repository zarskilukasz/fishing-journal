/**
 * Zod schema for equipment form validation (client-side, Polish messages)
 */
import { z } from "zod";

export const equipmentFormSchema = z.object({
  name: z
    .string({ required_error: "Nazwa jest wymagana" })
    .min(1, "Nazwa jest wymagana")
    .max(255, "Nazwa może mieć maksymalnie 255 znaków"),
});

export type EquipmentFormSchema = z.infer<typeof equipmentFormSchema>;
