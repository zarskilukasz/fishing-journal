import { z } from "zod";

/**
 * Maximum number of equipment items that can be assigned to a single trip.
 */
const MAX_EQUIPMENT_PER_TRIP = 50;

/**
 * UUID validation schema with Polish error message.
 */
const uuidSchema = z.string().uuid("Nieprawidłowy format UUID");

// ---------------------------------------------------------------------------
// Path Parameters
// ---------------------------------------------------------------------------

/**
 * Schema for validating tripId path parameter.
 */
export const tripIdParamSchema = z.object({
  tripId: uuidSchema,
});

/**
 * Schema for validating both tripId and assignmentId path parameters.
 */
export const equipmentAssignmentParamsSchema = z.object({
  tripId: uuidSchema,
  assignmentId: uuidSchema,
});

// ---------------------------------------------------------------------------
// Rods
// ---------------------------------------------------------------------------

/**
 * Schema for PUT /trips/{tripId}/rods - replace all rods.
 * Validates array of rod UUIDs with duplicate check and max limit.
 */
export const putTripRodsSchema = z.object({
  rod_ids: z
    .array(uuidSchema)
    .max(MAX_EQUIPMENT_PER_TRIP, `Maksymalnie ${MAX_EQUIPMENT_PER_TRIP} wędek`)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplikaty w liście rod_ids",
    }),
});

/**
 * Schema for POST /trips/{tripId}/rods - add single rod.
 */
export const postTripRodsSchema = z.object({
  rod_id: uuidSchema,
});

// ---------------------------------------------------------------------------
// Lures
// ---------------------------------------------------------------------------

/**
 * Schema for PUT /trips/{tripId}/lures - replace all lures.
 * Validates array of lure UUIDs with duplicate check and max limit.
 */
export const putTripLuresSchema = z.object({
  lure_ids: z
    .array(uuidSchema)
    .max(MAX_EQUIPMENT_PER_TRIP, `Maksymalnie ${MAX_EQUIPMENT_PER_TRIP} przynęt`)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplikaty w liście lure_ids",
    }),
});

/**
 * Schema for POST /trips/{tripId}/lures - add single lure.
 */
export const postTripLuresSchema = z.object({
  lure_id: uuidSchema,
});

// ---------------------------------------------------------------------------
// Groundbaits
// ---------------------------------------------------------------------------

/**
 * Schema for PUT /trips/{tripId}/groundbaits - replace all groundbaits.
 * Validates array of groundbait UUIDs with duplicate check and max limit.
 */
export const putTripGroundbaitsSchema = z.object({
  groundbait_ids: z
    .array(uuidSchema)
    .max(MAX_EQUIPMENT_PER_TRIP, `Maksymalnie ${MAX_EQUIPMENT_PER_TRIP} zanęt`)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplikaty w liście groundbait_ids",
    }),
});

/**
 * Schema for POST /trips/{tripId}/groundbaits - add single groundbait.
 */
export const postTripGroundbaitsSchema = z.object({
  groundbait_id: uuidSchema,
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type TripIdParam = z.infer<typeof tripIdParamSchema>;
export type EquipmentAssignmentParams = z.infer<typeof equipmentAssignmentParamsSchema>;

export type PutTripRodsInput = z.infer<typeof putTripRodsSchema>;
export type PostTripRodsInput = z.infer<typeof postTripRodsSchema>;

export type PutTripLuresInput = z.infer<typeof putTripLuresSchema>;
export type PostTripLuresInput = z.infer<typeof postTripLuresSchema>;

export type PutTripGroundbaitsInput = z.infer<typeof putTripGroundbaitsSchema>;
export type PostTripGroundbaitsInput = z.infer<typeof postTripGroundbaitsSchema>;
