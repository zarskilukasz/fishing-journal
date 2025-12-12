import { z } from "zod";

/**
 * Zod schemas for catch endpoint validation.
 * Covers query params, path params, and request bodies for all catch operations.
 *
 * Key validation aspects:
 * - UUIDs for tripId, id, species_id, lure_id, groundbait_id
 * - Datetime validation for caught_at and date range filters
 * - Snapshot fields (lure_name_snapshot, groundbait_name_snapshot) are rejected - DB triggers handle these
 * - Positive integers for weight_g and length_mm when provided
 */

// ---------------------------------------------------------------------------
// Path Params
// ---------------------------------------------------------------------------

/**
 * Path param schema for trip ID (used in /trips/{tripId}/catches).
 */
export const tripIdParamSchema = z.object({
  tripId: z.string().uuid("Nieprawidłowy format UUID tripId"),
});

/**
 * Path param schema for catch ID (used in /catches/{id}).
 */
export const catchIdParamSchema = z.object({
  id: z.string().uuid("Nieprawidłowy format UUID"),
});

// ---------------------------------------------------------------------------
// Query Params: GET /trips/{tripId}/catches (List)
// ---------------------------------------------------------------------------

/**
 * Query params for listing catches.
 * Supports filtering by date range (on caught_at), species, pagination, and sorting.
 */
export const catchListQuerySchema = z.object({
  /** Start of date range filter (on caught_at) */
  from: z.string().datetime("Nieprawidłowy format datetime dla 'from'").optional(),
  /** End of date range filter (on caught_at) */
  to: z.string().datetime("Nieprawidłowy format datetime dla 'to'").optional(),
  /** Filter by fish species */
  species_id: z.string().uuid("Nieprawidłowy format UUID dla species_id").optional(),
  /** Results per page (1-100) */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Pagination cursor (opaque string) */
  cursor: z.string().optional(),
  /** Sort field */
  sort: z.enum(["caught_at", "created_at"]).default("caught_at"),
  /** Sort direction */
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CatchListQuery = z.infer<typeof catchListQuerySchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /trips/{tripId}/catches (Create)
// ---------------------------------------------------------------------------

/**
 * Request body schema for creating a new catch.
 *
 * Note: lure_name_snapshot and groundbait_name_snapshot are NOT accepted.
 * These are automatically populated by database triggers.
 */
export const createCatchSchema = z.object({
  /** Datetime when the fish was caught (required, must be within trip date range - validated in service) */
  caught_at: z.string().datetime("Nieprawidłowy format datetime dla caught_at"),
  /** Fish species UUID (required) */
  species_id: z.string().uuid("Nieprawidłowy format UUID dla species_id"),
  /** Lure UUID (required, must not be soft-deleted, must belong to user - validated by DB trigger) */
  lure_id: z.string().uuid("Nieprawidłowy format UUID dla lure_id"),
  /** Groundbait UUID (required, must not be soft-deleted, must belong to user - validated by DB trigger) */
  groundbait_id: z.string().uuid("Nieprawidłowy format UUID dla groundbait_id"),
  /** Weight in grams (optional, must be positive if provided) */
  weight_g: z
    .number()
    .int("weight_g musi być liczbą całkowitą")
    .positive("weight_g musi być większe od 0")
    .nullable()
    .optional(),
  /** Length in millimeters (optional, must be positive if provided) */
  length_mm: z
    .number()
    .int("length_mm musi być liczbą całkowitą")
    .positive("length_mm musi być większe od 0")
    .nullable()
    .optional(),
});

export type CreateCatchInput = z.infer<typeof createCatchSchema>;

// ---------------------------------------------------------------------------
// Request Body: PATCH /catches/{id} (Update)
// ---------------------------------------------------------------------------

/**
 * Request body schema for partially updating a catch.
 * All fields are optional. Uses strict mode to reject unknown fields (e.g., snapshot fields).
 *
 * Note: lure_name_snapshot and groundbait_name_snapshot are NOT accepted.
 * If lure_id or groundbait_id is changed, DB triggers automatically update the snapshots.
 */
export const updateCatchSchema = z
  .object({
    /** Datetime when the fish was caught (must be within trip date range - validated in service) */
    caught_at: z.string().datetime("Nieprawidłowy format datetime dla caught_at").optional(),
    /** Fish species UUID */
    species_id: z.string().uuid("Nieprawidłowy format UUID dla species_id").optional(),
    /** Lure UUID (must not be soft-deleted, must belong to user - validated by DB trigger) */
    lure_id: z.string().uuid("Nieprawidłowy format UUID dla lure_id").optional(),
    /** Groundbait UUID (must not be soft-deleted, must belong to user - validated by DB trigger) */
    groundbait_id: z.string().uuid("Nieprawidłowy format UUID dla groundbait_id").optional(),
    /** Weight in grams (can be set to null to clear) */
    weight_g: z
      .number()
      .int("weight_g musi być liczbą całkowitą")
      .positive("weight_g musi być większe od 0")
      .nullable()
      .optional(),
    /** Length in millimeters (can be set to null to clear) */
    length_mm: z
      .number()
      .int("length_mm musi być liczbą całkowitą")
      .positive("length_mm musi być większe od 0")
      .nullable()
      .optional(),
    /** Photo path in Supabase Storage (can be set to null to remove) */
    photo_path: z.string().max(255, "photo_path nie może przekraczać 255 znaków").nullable().optional(),
  })
  .strict(); // Strict mode rejects unknown fields like snapshots

export type UpdateCatchInput = z.infer<typeof updateCatchSchema>;

// ---------------------------------------------------------------------------
// Helper: Forbidden Snapshot Fields Check
// ---------------------------------------------------------------------------

/**
 * List of field names that are forbidden in request bodies.
 * These are automatically managed by database triggers.
 */
export const FORBIDDEN_SNAPSHOT_FIELDS = ["lure_name_snapshot", "groundbait_name_snapshot"] as const;

/**
 * Checks if the request body contains forbidden snapshot fields.
 *
 * @param body - Parsed request body
 * @returns The name of the first forbidden field found, or null if none
 */
export function checkForbiddenSnapshotFields(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  for (const field of FORBIDDEN_SNAPSHOT_FIELDS) {
    if (field in body) {
      return field;
    }
  }

  return null;
}
