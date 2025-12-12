import { z } from "zod";

/**
 * Zod schema for validating query parameters for the fish species list endpoint.
 * Supports filtering, pagination, and sorting.
 */
export const fishSpeciesListQuerySchema = z.object({
  /** Search substring in species name (case-insensitive) */
  q: z.string().max(100).optional(),
  /** Number of results per page (1-100, default 20) */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Opaque cursor for pagination */
  cursor: z.string().optional(),
  /** Sort field */
  sort: z.enum(["name", "created_at"]).default("name"),
  /** Sort direction */
  order: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Zod schema for validating UUID path parameter.
 */
export const fishSpeciesIdSchema = z.string().uuid("Must be a valid UUID");

export type FishSpeciesListQuery = z.infer<typeof fishSpeciesListQuerySchema>;
