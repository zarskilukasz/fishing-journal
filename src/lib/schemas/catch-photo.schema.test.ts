import { describe, it, expect } from "vitest";
import {
  catchIdParamSchema,
  uploadUrlSchema,
  commitPhotoSchema,
  isAllowedContentType,
  getExtensionFromContentType,
  isFileSizeValid,
  ALLOWED_CONTENT_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "./catch-photo.schema";

describe("catch-photo.schema", () => {
  const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const invalidUuid = "not-a-uuid";

  // ---------------------------------------------------------------------------
  // catchIdParamSchema
  // ---------------------------------------------------------------------------

  describe("catchIdParamSchema", () => {
    it("accepts valid UUID for id", () => {
      const result = catchIdParamSchema.safeParse({ id: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validUuid);
      }
    });

    it("rejects invalid UUID for id", () => {
      const result = catchIdParamSchema.safeParse({ id: invalidUuid });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects missing id", () => {
      const result = catchIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // uploadUrlSchema
  // ---------------------------------------------------------------------------

  describe("uploadUrlSchema", () => {
    describe("valid inputs", () => {
      it("accepts image/jpeg with jpg extension", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/jpeg",
          file_ext: "jpg",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.content_type).toBe("image/jpeg");
          expect(result.data.file_ext).toBe("jpg");
        }
      });

      it("accepts image/jpeg with jpeg extension", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/jpeg",
          file_ext: "jpeg",
        });

        expect(result.success).toBe(true);
      });

      it("accepts image/png with png extension", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/png",
          file_ext: "png",
        });

        expect(result.success).toBe(true);
      });

      it("accepts image/webp with webp extension", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/webp",
          file_ext: "webp",
        });

        expect(result.success).toBe(true);
      });
    });

    describe("invalid content_type", () => {
      it("rejects image/gif", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/gif",
          file_ext: "gif",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Nieobsługiwany typ pliku");
        }
      });

      it("rejects application/pdf", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "application/pdf",
          file_ext: "pdf",
        });

        expect(result.success).toBe(false);
      });

      it("rejects text/plain", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "text/plain",
          file_ext: "txt",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("invalid file_ext", () => {
      it("rejects gif extension", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/jpeg",
          file_ext: "gif",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Nieobsługiwane rozszerzenie");
        }
      });

      it("rejects bmp extension", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/jpeg",
          file_ext: "bmp",
        });

        expect(result.success).toBe(false);
      });

      it("rejects uppercase extension", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/jpeg",
          file_ext: "JPG",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("required fields", () => {
      it("rejects missing content_type", () => {
        const result = uploadUrlSchema.safeParse({
          file_ext: "jpg",
        });

        expect(result.success).toBe(false);
      });

      it("rejects missing file_ext", () => {
        const result = uploadUrlSchema.safeParse({
          content_type: "image/jpeg",
        });

        expect(result.success).toBe(false);
      });

      it("rejects empty object", () => {
        const result = uploadUrlSchema.safeParse({});

        expect(result.success).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // commitPhotoSchema
  // ---------------------------------------------------------------------------

  describe("commitPhotoSchema", () => {
    describe("valid inputs", () => {
      it("accepts valid photo path with jpg extension", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321.jpg",
        });

        expect(result.success).toBe(true);
      });

      it("accepts valid photo path with jpeg extension", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321.jpeg",
        });

        expect(result.success).toBe(true);
      });

      it("accepts valid photo path with png extension", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321.png",
        });

        expect(result.success).toBe(true);
      });

      it("accepts valid photo path with webp extension", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321.webp",
        });

        expect(result.success).toBe(true);
      });

      it("accepts uppercase extension (case insensitive regex)", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321.JPG",
        });

        expect(result.success).toBe(true);
      });
    });

    describe("invalid photo_path format", () => {
      it("rejects path without slash", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Nieprawidłowy format ścieżki");
        }
      });

      it("rejects path with multiple slashes", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "user/folder/file.jpg",
        });

        expect(result.success).toBe(false);
      });

      it("rejects path with path traversal", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "../user-id/catch-id.jpg",
        });

        expect(result.success).toBe(false);
      });

      it("rejects path with invalid extension", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321.gif",
        });

        expect(result.success).toBe(false);
      });

      it("rejects empty path", () => {
        const result = commitPhotoSchema.safeParse({
          photo_path: "",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("photo_path jest wymagany");
        }
      });

      it("rejects path exceeding 255 characters", () => {
        const longPath = "a".repeat(200) + "/" + "b".repeat(55) + ".jpg";
        const result = commitPhotoSchema.safeParse({
          photo_path: longPath,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("255 znaków");
        }
      });
    });

    describe("required fields", () => {
      it("rejects missing photo_path", () => {
        const result = commitPhotoSchema.safeParse({});

        expect(result.success).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------

  describe("isAllowedContentType", () => {
    it("returns true for image/jpeg", () => {
      expect(isAllowedContentType("image/jpeg")).toBe(true);
    });

    it("returns true for image/png", () => {
      expect(isAllowedContentType("image/png")).toBe(true);
    });

    it("returns true for image/webp", () => {
      expect(isAllowedContentType("image/webp")).toBe(true);
    });

    it("returns false for image/gif", () => {
      expect(isAllowedContentType("image/gif")).toBe(false);
    });

    it("returns false for application/pdf", () => {
      expect(isAllowedContentType("application/pdf")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isAllowedContentType("")).toBe(false);
    });

    it("validates all ALLOWED_CONTENT_TYPES", () => {
      for (const type of ALLOWED_CONTENT_TYPES) {
        expect(isAllowedContentType(type)).toBe(true);
      }
    });
  });

  describe("getExtensionFromContentType", () => {
    it("returns jpg for image/jpeg", () => {
      expect(getExtensionFromContentType("image/jpeg")).toBe("jpg");
    });

    it("returns png for image/png", () => {
      expect(getExtensionFromContentType("image/png")).toBe("png");
    });

    it("returns webp for image/webp", () => {
      expect(getExtensionFromContentType("image/webp")).toBe("webp");
    });

    it("returns jpg for unknown content type (fallback)", () => {
      expect(getExtensionFromContentType("image/unknown")).toBe("jpg");
    });
  });

  describe("isFileSizeValid", () => {
    it("returns true for 1 byte", () => {
      expect(isFileSizeValid(1)).toBe(true);
    });

    it("returns true for 1MB", () => {
      expect(isFileSizeValid(1024 * 1024)).toBe(true);
    });

    it("returns true for exactly MAX_FILE_SIZE_BYTES", () => {
      expect(isFileSizeValid(MAX_FILE_SIZE_BYTES)).toBe(true);
    });

    it("returns false for 0 bytes", () => {
      expect(isFileSizeValid(0)).toBe(false);
    });

    it("returns false for negative size", () => {
      expect(isFileSizeValid(-1)).toBe(false);
    });

    it("returns false for size exceeding MAX_FILE_SIZE_BYTES", () => {
      expect(isFileSizeValid(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
    });

    it("MAX_FILE_SIZE_BYTES is 10MB", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });
  });

  describe("constants", () => {
    it("ALLOWED_CONTENT_TYPES contains expected types", () => {
      expect(ALLOWED_CONTENT_TYPES).toContain("image/jpeg");
      expect(ALLOWED_CONTENT_TYPES).toContain("image/png");
      expect(ALLOWED_CONTENT_TYPES).toContain("image/webp");
      expect(ALLOWED_CONTENT_TYPES).toHaveLength(3);
    });

    it("ALLOWED_FILE_EXTENSIONS contains expected extensions", () => {
      expect(ALLOWED_FILE_EXTENSIONS).toContain("jpg");
      expect(ALLOWED_FILE_EXTENSIONS).toContain("jpeg");
      expect(ALLOWED_FILE_EXTENSIONS).toContain("png");
      expect(ALLOWED_FILE_EXTENSIONS).toContain("webp");
      expect(ALLOWED_FILE_EXTENSIONS).toHaveLength(4);
    });
  });
});
