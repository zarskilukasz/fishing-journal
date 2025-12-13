import { z } from "zod";

/**
 * Zod schema for validating query parameters for equipment list endpoints.
 * Supports filtering, pagination, and sorting for rods/lures/groundbaits.
 */
export const equipmentListQuerySchema = z.object({
  /** Search substring in equipment name (case-insensitive) */
  q: z.string().max(100).optional(),
  /** Whether to include soft-deleted items */
  include_deleted: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  /** Number of results per page (1-100, default 20) */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Opaque cursor for pagination */
  cursor: z.string().optional(),
  /** Sort field */
  sort: z.enum(["name", "created_at", "updated_at"]).default("created_at"),
  /** Sort direction */
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;

/**
 * Zod schema for validating UUID path parameter.
 */
export const equipmentIdSchema = z.string().uuid("Invalid UUID format");

/**
 * Zod schema for validating equipment creation request body.
 */
export const createEquipmentSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(255, "Name too long (max 255 characters)")),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;

/**
 * Zod schema for validating equipment update request body.
 * All fields are optional (partial update).
 */
export const updateEquipmentSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name cannot be empty").max(255, "Name too long (max 255 characters)"))
    .optional(),
});

export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
