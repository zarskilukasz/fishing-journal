import { z } from "zod";

/**
 * Zod schemas for trip endpoint validation.
 * Covers query params, path params, and request bodies for all trip operations.
 */

// ---------------------------------------------------------------------------
// Enums & Reusable Schemas
// ---------------------------------------------------------------------------

/**
 * Trip status enum schema.
 * Mirrors TripStatus type from src/types.ts
 */
export const tripStatusSchema = z.enum(["draft", "active", "closed"]);

/**
 * Location object schema (lat/lng with optional label).
 * Used for trip creation and updates.
 */
export const tripLocationSchema = z
  .object({
    lat: z.number().min(-90, "lat must be >= -90").max(90, "lat must be <= 90"),
    lng: z.number().min(-180, "lng must be >= -180").max(180, "lng must be <= 180"),
    label: z.string().max(255, "label must be <= 255 characters").nullish(),
  })
  .nullable();

// ---------------------------------------------------------------------------
// Query Params: GET /trips (List)
// ---------------------------------------------------------------------------

/**
 * Query params for listing trips.
 * Supports filtering by status, date range, soft-deleted, pagination, and sorting.
 */
export const tripListQuerySchema = z.object({
  /** Filter by trip status */
  status: tripStatusSchema.optional(),
  /** Start of date range filter (on started_at) */
  from: z.string().datetime("Invalid datetime format for 'from'").optional(),
  /** End of date range filter (on started_at) */
  to: z.string().datetime("Invalid datetime format for 'to'").optional(),
  /** Include soft-deleted trips */
  include_deleted: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default(false),
  /** Results per page (1-100) */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Pagination cursor (opaque string) */
  cursor: z.string().optional(),
  /** Sort field */
  sort: z.enum(["started_at", "created_at", "updated_at"]).default("started_at"),
  /** Sort direction */
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type TripListQuery = z.infer<typeof tripListQuerySchema>;

// ---------------------------------------------------------------------------
// Path Params: Trip ID
// ---------------------------------------------------------------------------

/**
 * Path param schema for trip ID validation.
 */
export const tripIdParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

// ---------------------------------------------------------------------------
// Query Params: GET /trips/{id} (Detail)
// ---------------------------------------------------------------------------

/**
 * Allowed include values for trip detail endpoint.
 */
export const tripIncludeSchema = z.enum(["catches", "rods", "lures", "groundbaits", "weather_current"]);

/**
 * Query params for getting trip details.
 * Supports optional include param for eager loading relations.
 */
export const tripGetQuerySchema = z.object({
  include: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim()))
    .pipe(z.array(tripIncludeSchema))
    .optional(),
});

export type TripGetQuery = z.infer<typeof tripGetQuerySchema>;
export type TripIncludeValue = z.infer<typeof tripIncludeSchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /trips (Create)
// ---------------------------------------------------------------------------

/**
 * Request body schema for creating a new trip.
 * Includes business rule refinements:
 * - ended_at must be >= started_at
 * - status 'closed' requires ended_at
 */
export const createTripSchema = z
  .object({
    /** Trip start datetime (required) */
    started_at: z.string().datetime("Invalid datetime format for 'started_at'"),
    /** Trip end datetime (optional, null if ongoing) */
    ended_at: z.string().datetime("Invalid datetime format for 'ended_at'").nullable().optional(),
    /** Trip status */
    status: tripStatusSchema,
    /** Location (optional) */
    location: tripLocationSchema.optional().default(null),
    /** Copy equipment from user's last trip */
    copy_equipment_from_last_trip: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.ended_at && data.started_at) {
        return new Date(data.ended_at) >= new Date(data.started_at);
      }
      return true;
    },
    {
      message: "ended_at must be greater than or equal to started_at",
      path: ["ended_at"],
    }
  )
  .refine(
    (data) => {
      if (data.status === "closed" && !data.ended_at) {
        return false;
      }
      return true;
    },
    {
      message: "ended_at is required when status is 'closed'",
      path: ["ended_at"],
    }
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /trips/quick-start
// ---------------------------------------------------------------------------

/**
 * Request body schema for quick-start trip creation.
 * Creates a trip with started_at=now() and status=active.
 *
 * GPS handling:
 * - Frontend is responsible for obtaining GPS coordinates via Geolocation API
 * - If location is provided, it will be saved to the trip
 * - If location is null/undefined, trip is created without location
 */
export const quickStartTripSchema = z.object({
  /** Optional GPS location (frontend obtains via Geolocation API) */
  location: tripLocationSchema.optional(),
  /** Copy equipment from user's last trip */
  copy_equipment_from_last_trip: z.boolean(),
});

export type QuickStartTripInput = z.infer<typeof quickStartTripSchema>;

// ---------------------------------------------------------------------------
// Request Body: PATCH /trips/{id} (Update)
// ---------------------------------------------------------------------------

/**
 * Request body schema for partial trip update.
 * All fields are optional. Business rules validated in service layer
 * when combined with existing trip data.
 */
export const updateTripSchema = z
  .object({
    started_at: z.string().datetime("Invalid datetime format for 'started_at'").optional(),
    ended_at: z.string().datetime("Invalid datetime format for 'ended_at'").nullable().optional(),
    status: tripStatusSchema.optional(),
    location: tripLocationSchema.optional(),
  })
  .refine(
    (data) => {
      // Only validate if both are provided in the request
      if (data.ended_at && data.started_at) {
        return new Date(data.ended_at) >= new Date(data.started_at);
      }
      return true;
    },
    {
      message: "ended_at must be greater than or equal to started_at",
      path: ["ended_at"],
    }
  );

export type UpdateTripInput = z.infer<typeof updateTripSchema>;

// ---------------------------------------------------------------------------
// Request Body: POST /trips/{id}/close
// ---------------------------------------------------------------------------

/**
 * Request body schema for closing a trip.
 * Sets status to 'closed'. The ended_at field is not modified here -
 * it can only be set through the trip edit page.
 */
export const closeTripSchema = z.object({}).optional();

export type CloseTripInput = z.infer<typeof closeTripSchema>;
