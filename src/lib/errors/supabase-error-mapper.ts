import type { PostgrestError } from "@supabase/supabase-js";
import type { ApiErrorCode } from "@/types";

/**
 * Mapped error structure for API responses.
 */
export interface MappedError {
  code: ApiErrorCode;
  message: string;
  httpStatus: number;
}

/**
 * Maps Supabase PostgrestError to a standardized API error response.
 *
 * Handles common PostgreSQL error codes:
 * - 23505: Unique constraint violation (conflict)
 * - 23514: Check constraint violation (validation error)
 * - 23503: Foreign key violation (not found)
 * - P0001: Raised exception from triggers
 * - PGRST116: No rows returned (not found)
 *
 * @param error - PostgrestError from Supabase client
 * @returns Mapped error with code, message, and HTTP status
 */
export function mapSupabaseError(error: PostgrestError): MappedError {
  // Unique constraint violation (23505)
  if (error.code === "23505") {
    // Check for trip equipment unique constraints
    if (
      error.message.includes("trip_rods_unique") ||
      error.message.includes("trip_lures_unique") ||
      error.message.includes("trip_groundbaits_unique")
    ) {
      return {
        code: "conflict",
        message: "Ten sprzęt jest już przypisany do wyprawy",
        httpStatus: 409,
      };
    }

    // Generic unique constraint violation
    return {
      code: "conflict",
      message: "Zasób już istnieje",
      httpStatus: 409,
    };
  }

  // Trigger exceptions (P0001 = raise_exception)
  if (error.code === "P0001") {
    // Equipment owner mismatch
    if (error.message.includes("innego użytkownika")) {
      return {
        code: "equipment_owner_mismatch",
        message: "Sprzęt należy do innego użytkownika",
        httpStatus: 409,
      };
    }

    // Soft-deleted equipment
    if (error.message.includes("soft-deleted") || error.message.includes("usunięty")) {
      return {
        code: "equipment_soft_deleted",
        message: "Sprzęt został usunięty",
        httpStatus: 409,
      };
    }

    // Generic trigger exception
    return {
      code: "conflict",
      message: error.message || "Operacja została odrzucona przez bazę danych",
      httpStatus: 409,
    };
  }

  // Check constraint violation (23514) - e.g., weight_g > 0, length_mm > 0
  if (error.code === "23514") {
    if (error.message.includes("weight")) {
      return {
        code: "validation_error",
        message: "weight_g musi być większe od 0",
        httpStatus: 400,
      };
    }
    if (error.message.includes("length")) {
      return {
        code: "validation_error",
        message: "length_mm musi być większe od 0",
        httpStatus: 400,
      };
    }
    // Generic check constraint violation
    return {
      code: "validation_error",
      message: "Naruszenie ograniczenia bazy danych",
      httpStatus: 400,
    };
  }

  // Foreign key violation (23503)
  if (error.code === "23503") {
    // Specific foreign key messages for catches
    if (error.message.includes("species_id") || error.message.includes("fish_species")) {
      return {
        code: "validation_error",
        message: "Gatunek ryby nie został znaleziony",
        httpStatus: 400,
      };
    }
    if (error.message.includes("lure_id") || error.message.includes("lures")) {
      return {
        code: "validation_error",
        message: "Przynęta nie została znaleziona",
        httpStatus: 400,
      };
    }
    if (error.message.includes("groundbait_id") || error.message.includes("groundbaits")) {
      return {
        code: "validation_error",
        message: "Zanęta nie została znaleziona",
        httpStatus: 400,
      };
    }
    if (error.message.includes("trip_id") || error.message.includes("trips")) {
      return {
        code: "not_found",
        message: "Wyprawa nie została znaleziona",
        httpStatus: 404,
      };
    }
    // Generic foreign key violation
    return {
      code: "not_found",
      message: "Powiązany zasób nie istnieje",
      httpStatus: 404,
    };
  }

  // RLS violation / no rows returned (PGRST116)
  if (error.code === "PGRST116") {
    return {
      code: "not_found",
      message: "Zasób nie został znaleziony",
      httpStatus: 404,
    };
  }

  // Default: internal server error
  return {
    code: "internal_error",
    message: "Wystąpił błąd serwera",
    httpStatus: 500,
  };
}
