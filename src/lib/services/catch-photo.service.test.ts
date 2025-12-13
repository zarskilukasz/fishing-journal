/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { catchPhotoService } from "./catch-photo.service";
import type { SupabaseClient } from "@/db/supabase.client";

// ---------------------------------------------------------------------------
// Mock Helpers
// ---------------------------------------------------------------------------

/**
 * Mock Supabase query builder factory
 */
function createMockQuery() {
  const query = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    _resolvedValue: { data: [], error: null } as { data: unknown; error: unknown },
  };

  Object.defineProperty(query, "then", {
    value: function (resolve: (value: { data: unknown; error: unknown }) => void) {
      return Promise.resolve(this._resolvedValue).then(resolve);
    },
    writable: true,
  });

  return query;
}

type MockQuery = ReturnType<typeof createMockQuery>;

/**
 * Mock Supabase Storage builder factory
 */
function createMockStorage() {
  return {
    upload: vi.fn().mockResolvedValue({ data: { path: "test/path.webp" }, error: null }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/upload-url" },
      error: null,
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/download-url" },
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
}

/**
 * Mock Supabase client factory
 */
function createMockSupabase() {
  const mockQueries: Record<string, MockQuery> = {};
  const mockStorage = createMockStorage();

  const supabase = {
    from: vi.fn((table: string) => {
      if (!mockQueries[table]) {
        mockQueries[table] = createMockQuery();
      }
      return mockQueries[table];
    }),
    storage: {
      from: vi.fn().mockReturnValue(mockStorage),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
    },
    _mockQueries: mockQueries,
    _mockStorage: mockStorage,
  } as unknown as SupabaseClient & {
    _mockQueries: Record<string, MockQuery>;
    _mockStorage: ReturnType<typeof createMockStorage>;
  };

  return supabase;
}

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const validUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const validCatchId = "f9e8d7c6-b5a4-3210-fedc-ba0987654321";
const validTripId = "trip-123-456-789";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("catchPhotoService", () => {
  // ---------------------------------------------------------------------------
  // validatePhotoPath
  // ---------------------------------------------------------------------------

  describe("validatePhotoPath", () => {
    it("returns true for valid path with user folder and webp extension", () => {
      const path = `${validUserId}/${validCatchId}.webp`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(true);
    });

    it("returns true for valid path with jpg extension", () => {
      const path = `${validUserId}/${validCatchId}.jpg`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(true);
    });

    it("returns true for valid path with jpeg extension", () => {
      const path = `${validUserId}/${validCatchId}.jpeg`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(true);
    });

    it("returns true for valid path with png extension", () => {
      const path = `${validUserId}/${validCatchId}.png`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(true);
    });

    it("returns false if path does not start with user folder", () => {
      const otherUserId = "other-user-id";
      const path = `${otherUserId}/${validCatchId}.webp`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(false);
    });

    it("returns false for path traversal attempt with ..", () => {
      const path = `${validUserId}/../other-user/${validCatchId}.webp`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(false);
    });

    it("returns false for path with .. at start", () => {
      const path = `../${validUserId}/${validCatchId}.webp`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(false);
    });

    it("returns false for path with invalid extension", () => {
      const path = `${validUserId}/${validCatchId}.gif`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(false);
    });

    it("returns false for path with no extension", () => {
      const path = `${validUserId}/${validCatchId}`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(false);
    });

    it("returns false for path with too many segments", () => {
      const path = `${validUserId}/subfolder/${validCatchId}.webp`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(false);
    });

    it("returns false for path with only one segment", () => {
      const path = `${validCatchId}.webp`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(false);
    });

    it("returns false for empty path", () => {
      expect(catchPhotoService.validatePhotoPath("", validUserId)).toBe(false);
    });

    it("returns true for uppercase extension (case insensitive)", () => {
      const path = `${validUserId}/${validCatchId}.WEBP`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(true);
    });

    it("returns true for mixed case extension", () => {
      const path = `${validUserId}/${validCatchId}.JpG`;
      expect(catchPhotoService.validatePhotoPath(path, validUserId)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // verifyCatchOwnership
  // ---------------------------------------------------------------------------

  describe("verifyCatchOwnership", () => {
    it("returns exists: true when catch is found", async () => {
      const supabase = createMockSupabase();
      const mockCatch = {
        id: validCatchId,
        photo_path: `${validUserId}/${validCatchId}.webp`,
        trip_id: validTripId,
        trips: { user_id: validUserId },
      };

      supabase._mockQueries["catches"] = createMockQuery();
      supabase._mockQueries["catches"].single.mockResolvedValue({
        data: mockCatch,
        error: null,
      });

      const result = await catchPhotoService.verifyCatchOwnership(supabase, validCatchId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        exists: true,
        photoPath: `${validUserId}/${validCatchId}.webp`,
        tripId: validTripId,
      });
    });

    it("returns exists: false when catch is not found (PGRST116)", async () => {
      const supabase = createMockSupabase();

      supabase._mockQueries["catches"] = createMockQuery();
      supabase._mockQueries["catches"].single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await catchPhotoService.verifyCatchOwnership(supabase, validCatchId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        exists: false,
        photoPath: null,
        tripId: null,
      });
    });

    it("returns error for other database errors", async () => {
      const supabase = createMockSupabase();

      supabase._mockQueries["catches"] = createMockQuery();
      supabase._mockQueries["catches"].single.mockResolvedValue({
        data: null,
        error: { code: "SOME_ERROR", message: "Database error" },
      });

      const result = await catchPhotoService.verifyCatchOwnership(supabase, validCatchId);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it("handles null photo_path correctly", async () => {
      const supabase = createMockSupabase();
      const mockCatch = {
        id: validCatchId,
        photo_path: null,
        trip_id: validTripId,
        trips: { user_id: validUserId },
      };

      supabase._mockQueries["catches"] = createMockQuery();
      supabase._mockQueries["catches"].single.mockResolvedValue({
        data: mockCatch,
        error: null,
      });

      const result = await catchPhotoService.verifyCatchOwnership(supabase, validCatchId);

      expect(result.error).toBeNull();
      expect(result.data?.photoPath).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // uploadToStorage
  // ---------------------------------------------------------------------------

  describe("uploadToStorage", () => {
    it("uploads buffer to correct path", async () => {
      const supabase = createMockSupabase();
      const buffer = Buffer.from("test image data");

      const result = await catchPhotoService.uploadToStorage(supabase, validUserId, validCatchId, buffer);

      expect(result.error).toBeNull();
      expect(result.data?.path).toBe(`${validUserId}/${validCatchId}.webp`);
      expect(supabase.storage.from).toHaveBeenCalledWith("catch-photos");
      expect(supabase._mockStorage.upload).toHaveBeenCalledWith(
        `${validUserId}/${validCatchId}.webp`,
        buffer,
        expect.objectContaining({
          contentType: "image/webp",
          upsert: true,
        })
      );
    });

    it("returns error when upload fails", async () => {
      const supabase = createMockSupabase();
      supabase._mockStorage.upload.mockResolvedValue({
        data: null,
        error: { message: "Upload failed" },
      });

      const buffer = Buffer.from("test image data");
      const result = await catchPhotoService.uploadToStorage(supabase, validUserId, validCatchId, buffer);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: "internal_error",
        message: "Błąd zapisu do storage",
        httpStatus: 500,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // createUploadUrl
  // ---------------------------------------------------------------------------

  describe("createUploadUrl", () => {
    it("creates signed URL for given path", async () => {
      const supabase = createMockSupabase();

      const result = await catchPhotoService.createUploadUrl(supabase, validUserId, validCatchId, "jpg");

      expect(result.error).toBeNull();
      expect(result.data?.path).toBe(`${validUserId}/${validCatchId}.jpg`);
      expect(result.data?.signedUrl).toBe("https://example.com/upload-url");
      expect(result.data?.expiresIn).toBe(600);
    });

    it("returns error when signed URL creation fails", async () => {
      const supabase = createMockSupabase();
      supabase._mockStorage.createSignedUploadUrl.mockResolvedValue({
        data: null,
        error: { message: "Failed to create URL" },
      });

      const result = await catchPhotoService.createUploadUrl(supabase, validUserId, validCatchId, "jpg");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("internal_error");
    });
  });

  // ---------------------------------------------------------------------------
  // createDownloadUrl
  // ---------------------------------------------------------------------------

  describe("createDownloadUrl", () => {
    it("creates signed download URL", async () => {
      const supabase = createMockSupabase();
      const photoPath = `${validUserId}/${validCatchId}.webp`;

      const result = await catchPhotoService.createDownloadUrl(supabase, photoPath);

      expect(result.error).toBeNull();
      expect(result.data?.url).toBe("https://example.com/download-url");
      expect(result.data?.expiresIn).toBe(600);
    });

    it("returns error when signed URL creation fails", async () => {
      const supabase = createMockSupabase();
      supabase._mockStorage.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "Failed to create URL" },
      });

      const result = await catchPhotoService.createDownloadUrl(supabase, "some/path.webp");

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("internal_error");
    });
  });

  // ---------------------------------------------------------------------------
  // deleteFromStorage
  // ---------------------------------------------------------------------------

  describe("deleteFromStorage", () => {
    it("deletes file from storage", async () => {
      const supabase = createMockSupabase();
      const photoPath = `${validUserId}/${validCatchId}.webp`;

      const result = await catchPhotoService.deleteFromStorage(supabase, photoPath);

      expect(result.error).toBeNull();
      expect(supabase._mockStorage.remove).toHaveBeenCalledWith([photoPath]);
    });

    it("does not return error even if delete fails (graceful)", async () => {
      const supabase = createMockSupabase();
      supabase._mockStorage.remove.mockResolvedValue({
        data: null,
        error: { message: "Delete failed" },
      });

      const result = await catchPhotoService.deleteFromStorage(supabase, "some/path.webp");

      // Should still succeed - delete errors are ignored
      expect(result.error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // updatePhotoPath
  // ---------------------------------------------------------------------------

  describe("updatePhotoPath", () => {
    it("updates catch with new photo path", async () => {
      const supabase = createMockSupabase();
      const mockUpdatedCatch = {
        id: validCatchId,
        photo_path: `${validUserId}/${validCatchId}.webp`,
      };

      supabase._mockQueries["catches"] = createMockQuery();
      supabase._mockQueries["catches"].single.mockResolvedValue({
        data: mockUpdatedCatch,
        error: null,
      });

      const result = await catchPhotoService.updatePhotoPath(
        supabase,
        validCatchId,
        `${validUserId}/${validCatchId}.webp`
      );

      expect(result.error).toBeNull();
      expect(result.data?.photo_path).toBe(`${validUserId}/${validCatchId}.webp`);
    });

    it("sets photo_path to null when clearing", async () => {
      const supabase = createMockSupabase();
      const mockUpdatedCatch = {
        id: validCatchId,
        photo_path: null,
      };

      supabase._mockQueries["catches"] = createMockQuery();
      supabase._mockQueries["catches"].single.mockResolvedValue({
        data: mockUpdatedCatch,
        error: null,
      });

      const result = await catchPhotoService.updatePhotoPath(supabase, validCatchId, null);

      expect(result.error).toBeNull();
      expect(result.data?.photo_path).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // verifyFileExists
  // ---------------------------------------------------------------------------

  describe("verifyFileExists", () => {
    it("returns true when file exists in storage", async () => {
      const supabase = createMockSupabase();
      const photoPath = `${validUserId}/${validCatchId}.webp`;

      supabase._mockStorage.list.mockResolvedValue({
        data: [{ name: `${validCatchId}.webp` }],
        error: null,
      });

      const result = await catchPhotoService.verifyFileExists(supabase, photoPath);

      expect(result).toBe(true);
    });

    it("returns false when file does not exist", async () => {
      const supabase = createMockSupabase();
      const photoPath = `${validUserId}/${validCatchId}.webp`;

      supabase._mockStorage.list.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await catchPhotoService.verifyFileExists(supabase, photoPath);

      expect(result).toBe(false);
    });

    it("returns false when list returns error", async () => {
      const supabase = createMockSupabase();

      supabase._mockStorage.list.mockResolvedValue({
        data: null,
        error: { message: "List failed" },
      });

      const result = await catchPhotoService.verifyFileExists(supabase, "some/path.webp");

      expect(result).toBe(false);
    });
  });
});

