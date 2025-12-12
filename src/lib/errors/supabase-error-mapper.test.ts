import { describe, it, expect } from "vitest";
import { mapSupabaseError } from "./supabase-error-mapper";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Helper to create a mock PostgrestError
 */
function createMockError(code: string, message: string): PostgrestError {
  return {
    code,
    message,
    details: "",
    hint: "",
    name: "PostgrestError",
  };
}

describe("mapSupabaseError", () => {
  describe("unique constraint violations (23505)", () => {
    it("maps trip_rods_unique violation to conflict", () => {
      const error = createMockError("23505", 'duplicate key value violates unique constraint "trip_rods_unique"');

      const result = mapSupabaseError(error);

      expect(result.code).toBe("conflict");
      expect(result.httpStatus).toBe(409);
      expect(result.message).toContain("sprzęt");
    });

    it("maps trip_lures_unique violation to conflict", () => {
      const error = createMockError("23505", 'duplicate key value violates unique constraint "trip_lures_unique"');

      const result = mapSupabaseError(error);

      expect(result.code).toBe("conflict");
      expect(result.httpStatus).toBe(409);
    });

    it("maps trip_groundbaits_unique violation to conflict", () => {
      const error = createMockError(
        "23505",
        'duplicate key value violates unique constraint "trip_groundbaits_unique"'
      );

      const result = mapSupabaseError(error);

      expect(result.code).toBe("conflict");
      expect(result.httpStatus).toBe(409);
    });

    it("maps generic unique violation to conflict", () => {
      const error = createMockError("23505", 'duplicate key value violates unique constraint "some_other_unique"');

      const result = mapSupabaseError(error);

      expect(result.code).toBe("conflict");
      expect(result.httpStatus).toBe(409);
      expect(result.message).toContain("istnieje");
    });
  });

  describe("trigger exceptions (P0001)", () => {
    it("maps equipment owner mismatch to equipment_owner_mismatch", () => {
      const error = createMockError("P0001", "Sprzęt należy do innego użytkownika");

      const result = mapSupabaseError(error);

      expect(result.code).toBe("equipment_owner_mismatch");
      expect(result.httpStatus).toBe(409);
      expect(result.message).toContain("innego użytkownika");
    });

    it("maps soft-deleted equipment error to equipment_soft_deleted", () => {
      const error = createMockError("P0001", "Wędka została usunięta (soft-deleted)");

      const result = mapSupabaseError(error);

      expect(result.code).toBe("equipment_soft_deleted");
      expect(result.httpStatus).toBe(409);
    });

    it("maps Polish soft-delete message to equipment_soft_deleted", () => {
      const error = createMockError("P0001", "Sprzęt został usunięty");

      const result = mapSupabaseError(error);

      expect(result.code).toBe("equipment_soft_deleted");
      expect(result.httpStatus).toBe(409);
    });

    it("maps generic trigger exception to conflict", () => {
      const error = createMockError("P0001", "Some custom trigger error");

      const result = mapSupabaseError(error);

      expect(result.code).toBe("conflict");
      expect(result.httpStatus).toBe(409);
    });
  });

  describe("check constraint violations (23514)", () => {
    it("maps weight constraint violation to validation_error", () => {
      const error = createMockError(
        "23514",
        'new row for relation "catches" violates check constraint "catches_weight_g_check"'
      );

      const result = mapSupabaseError(error);

      expect(result.code).toBe("validation_error");
      expect(result.httpStatus).toBe(400);
      expect(result.message).toContain("weight_g");
    });

    it("maps length constraint violation to validation_error", () => {
      const error = createMockError(
        "23514",
        'new row for relation "catches" violates check constraint "catches_length_mm_check"'
      );

      const result = mapSupabaseError(error);

      expect(result.code).toBe("validation_error");
      expect(result.httpStatus).toBe(400);
      expect(result.message).toContain("length_mm");
    });

    it("maps generic check constraint violation to validation_error", () => {
      const error = createMockError("23514", 'new row violates check constraint "some_other_constraint"');

      const result = mapSupabaseError(error);

      expect(result.code).toBe("validation_error");
      expect(result.httpStatus).toBe(400);
    });
  });

  describe("foreign key violations (23503)", () => {
    it("maps species_id foreign key violation to validation_error", () => {
      const error = createMockError(
        "23503",
        'insert or update on table "catches" violates foreign key constraint "catches_species_id_fkey"'
      );

      const result = mapSupabaseError(error);

      expect(result.code).toBe("validation_error");
      expect(result.httpStatus).toBe(400);
      expect(result.message).toContain("Gatunek");
    });

    it("maps lure_id foreign key violation to validation_error", () => {
      const error = createMockError(
        "23503",
        'insert or update on table "catches" violates foreign key constraint "catches_lure_id_fkey"'
      );

      const result = mapSupabaseError(error);

      expect(result.code).toBe("validation_error");
      expect(result.httpStatus).toBe(400);
      expect(result.message).toContain("Przynęta");
    });

    it("maps groundbait_id foreign key violation to validation_error", () => {
      const error = createMockError(
        "23503",
        'insert or update on table "catches" violates foreign key constraint "catches_groundbait_id_fkey"'
      );

      const result = mapSupabaseError(error);

      expect(result.code).toBe("validation_error");
      expect(result.httpStatus).toBe(400);
      expect(result.message).toContain("Zanęta");
    });

    it("maps trip_id foreign key violation to not_found", () => {
      const error = createMockError(
        "23503",
        'insert or update on table "catches" violates foreign key constraint "catches_trip_id_fkey"'
      );

      const result = mapSupabaseError(error);

      expect(result.code).toBe("not_found");
      expect(result.httpStatus).toBe(404);
      expect(result.message).toContain("Wyprawa");
    });

    it("maps generic foreign key violation to not_found", () => {
      const error = createMockError("23503", 'insert or update on table "trip_rods" violates foreign key constraint');

      const result = mapSupabaseError(error);

      expect(result.code).toBe("not_found");
      expect(result.httpStatus).toBe(404);
      expect(result.message).toContain("nie istnieje");
    });
  });

  describe("RLS / no rows returned (PGRST116)", () => {
    it("maps PGRST116 to not_found", () => {
      const error = createMockError("PGRST116", "No rows returned");

      const result = mapSupabaseError(error);

      expect(result.code).toBe("not_found");
      expect(result.httpStatus).toBe(404);
      expect(result.message).toContain("znaleziony");
    });
  });

  describe("unknown errors", () => {
    it("maps unknown error codes to internal_error", () => {
      const error = createMockError("UNKNOWN", "Something went wrong");

      const result = mapSupabaseError(error);

      expect(result.code).toBe("internal_error");
      expect(result.httpStatus).toBe(500);
      expect(result.message).toContain("błąd");
    });

    it("maps PGRST000 to internal_error", () => {
      const error = createMockError("PGRST000", "Connection failed");

      const result = mapSupabaseError(error);

      expect(result.code).toBe("internal_error");
      expect(result.httpStatus).toBe(500);
    });
  });
});
