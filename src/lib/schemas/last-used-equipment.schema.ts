import { z } from "zod";

/**
 * Zod schema for validating last used equipment response.
 * Used primarily for documentation and runtime validation if needed.
 */
export const lastUsedEquipmentResponseSchema = z.object({
  source_trip_id: z.string().uuid(),
  rods: z.array(
    z.object({
      rod_id: z.string().uuid(),
      rod_name_snapshot: z.string(),
    })
  ),
  lures: z.array(
    z.object({
      lure_id: z.string().uuid(),
      lure_name_snapshot: z.string(),
    })
  ),
  groundbaits: z.array(
    z.object({
      groundbait_id: z.string().uuid(),
      groundbait_name_snapshot: z.string(),
    })
  ),
});

export type LastUsedEquipmentResponse = z.infer<typeof lastUsedEquipmentResponseSchema>;
