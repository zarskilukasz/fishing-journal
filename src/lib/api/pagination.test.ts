import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor, type CursorData } from "./pagination";

describe("pagination helpers", () => {
  describe("encodeCursor", () => {
    it("encodes cursor data to base64 string", () => {
      const data: CursorData = { sortValue: "Pike", id: "123e4567-e89b-12d3-a456-426614174000" };

      const cursor = encodeCursor(data);

      expect(cursor).toBeTruthy();
      expect(typeof cursor).toBe("string");
      // Verify it's valid base64
      expect(() => atob(cursor)).not.toThrow();
    });

    it("produces different cursors for different data", () => {
      const data1: CursorData = { sortValue: "Pike", id: "123" };
      const data2: CursorData = { sortValue: "Carp", id: "456" };

      const cursor1 = encodeCursor(data1);
      const cursor2 = encodeCursor(data2);

      expect(cursor1).not.toBe(cursor2);
    });
  });

  describe("decodeCursor", () => {
    it("decodes valid cursor back to original data", () => {
      const original: CursorData = { sortValue: "Pike", id: "123e4567-e89b-12d3-a456-426614174000" };
      const cursor = encodeCursor(original);

      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual(original);
    });

    it("returns null for invalid base64", () => {
      const result = decodeCursor("not-valid-base64!!!");

      expect(result).toBeNull();
    });

    it("returns null for valid base64 but invalid JSON", () => {
      const invalidJson = btoa("not json");

      const result = decodeCursor(invalidJson);

      expect(result).toBeNull();
    });

    it("returns null for valid JSON but missing required fields", () => {
      const missingFields = btoa(JSON.stringify({ foo: "bar" }));

      const result = decodeCursor(missingFields);

      expect(result).toBeNull();
    });

    it("returns null for valid JSON with wrong field types", () => {
      const wrongTypes = btoa(JSON.stringify({ sortValue: 123, id: true }));

      const result = decodeCursor(wrongTypes);

      expect(result).toBeNull();
    });
  });

  describe("roundtrip", () => {
    it("encode -> decode returns original data", () => {
      const testCases: CursorData[] = [
        { sortValue: "Pike", id: "uuid-1" },
        { sortValue: "2025-01-01T00:00:00Z", id: "uuid-2" },
        { sortValue: "", id: "" },
        { sortValue: "Fish-Name_123", id: "special-chars" },
      ];

      for (const original of testCases) {
        const encoded = encodeCursor(original);
        const decoded = decodeCursor(encoded);
        expect(decoded).toEqual(original);
      }
    });
  });
});
