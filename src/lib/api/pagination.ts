import type { Cursor } from "@/types";

/**
 * Internal structure of cursor data for keyset pagination.
 */
export interface CursorData {
  /** Value of the sort field for the last item */
  sortValue: string;
  /** ID of the last item (for stable pagination) */
  id: string;
}

/**
 * Encodes cursor data to an opaque base64 string.
 *
 * @param data - Cursor data containing sort value and ID
 * @returns Base64-encoded cursor string
 */
export function encodeCursor(data: CursorData): Cursor {
  return btoa(JSON.stringify(data));
}

/**
 * Decodes a base64 cursor string back to cursor data.
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded cursor data or null if invalid
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = JSON.parse(atob(cursor));
    if (typeof decoded.sortValue === "string" && typeof decoded.id === "string") {
      return decoded as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}
