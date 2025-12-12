import { describe, it, expect } from "vitest";
import {
  createErrorResponse,
  createSuccessResponse,
  createCreatedResponse,
  createNoContentResponse,
} from "./error-response";

describe("error-response", () => {
  // ---------------------------------------------------------------------------
  // createErrorResponse
  // ---------------------------------------------------------------------------

  describe("createErrorResponse", () => {
    it("creates response with correct status code", async () => {
      const response = createErrorResponse("validation_error", "Invalid input", 400);

      expect(response.status).toBe(400);
    });

    it("creates response with correct Content-Type header", async () => {
      const response = createErrorResponse("not_found", "Not found", 404);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("creates response with correct error structure", async () => {
      const response = createErrorResponse("unauthorized", "Authentication required", 401);
      const body = await response.json();

      expect(body).toEqual({
        error: {
          code: "unauthorized",
          message: "Authentication required",
        },
      });
    });

    it("includes details when provided", async () => {
      const response = createErrorResponse("validation_error", "Invalid field", 400, {
        field: "email",
        reason: "Must be a valid email address",
      });
      const body = await response.json();

      expect(body).toEqual({
        error: {
          code: "validation_error",
          message: "Invalid field",
          details: {
            field: "email",
            reason: "Must be a valid email address",
          },
        },
      });
    });

    it("omits details when not provided", async () => {
      const response = createErrorResponse("internal_error", "Server error", 500);
      const body = await response.json();

      expect(body.error.details).toBeUndefined();
    });

    it("handles various error codes", async () => {
      const testCases = [
        { code: "validation_error" as const, status: 400 },
        { code: "unauthorized" as const, status: 401 },
        { code: "not_found" as const, status: 404 },
        { code: "conflict" as const, status: 409 },
        { code: "rate_limited" as const, status: 429 },
      ];

      for (const { code, status } of testCases) {
        const response = createErrorResponse(code, `${code} message`, status);
        const body = await response.json();

        expect(response.status).toBe(status);
        expect(body.error.code).toBe(code);
      }
    });

    it("handles custom error codes", async () => {
      const response = createErrorResponse("equipment_owner_mismatch", "Equipment belongs to another user", 409);
      const body = await response.json();

      expect(body.error.code).toBe("equipment_owner_mismatch");
    });
  });

  // ---------------------------------------------------------------------------
  // createSuccessResponse
  // ---------------------------------------------------------------------------

  describe("createSuccessResponse", () => {
    it("creates response with default 200 status", async () => {
      const response = createSuccessResponse({ message: "OK" });

      expect(response.status).toBe(200);
    });

    it("creates response with custom status", async () => {
      const response = createSuccessResponse({ message: "Accepted" }, 202);

      expect(response.status).toBe(202);
    });

    it("creates response with correct Content-Type header", async () => {
      const response = createSuccessResponse({ data: "test" });

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("serializes data correctly", async () => {
      const data = {
        id: "123",
        name: "Test",
        items: [1, 2, 3],
        nested: { key: "value" },
      };
      const response = createSuccessResponse(data);
      const body = await response.json();

      expect(body).toEqual(data);
    });

    it("handles array data", async () => {
      const data = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];
      const response = createSuccessResponse(data);
      const body = await response.json();

      expect(body).toEqual(data);
    });

    it("handles primitive data", async () => {
      const response = createSuccessResponse("simple string");
      const body = await response.json();

      expect(body).toBe("simple string");
    });

    it("handles null data", async () => {
      const response = createSuccessResponse(null);
      const body = await response.json();

      expect(body).toBeNull();
    });

    it("handles paginated response structure", async () => {
      const data = {
        data: [{ id: "1" }, { id: "2" }],
        page: {
          limit: 20,
          next_cursor: "eyJpZCI6IjIifQ==",
        },
      };
      const response = createSuccessResponse(data);
      const body = await response.json();

      expect(body).toEqual(data);
    });
  });

  // ---------------------------------------------------------------------------
  // createCreatedResponse
  // ---------------------------------------------------------------------------

  describe("createCreatedResponse", () => {
    it("creates response with 201 status", async () => {
      const response = createCreatedResponse({ id: "new-123" });

      expect(response.status).toBe(201);
    });

    it("creates response with correct Content-Type header", async () => {
      const response = createCreatedResponse({ id: "new-123" });

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("serializes created resource correctly", async () => {
      const resource = {
        id: "new-123",
        name: "New Resource",
        created_at: "2025-01-15T10:00:00Z",
      };
      const response = createCreatedResponse(resource);
      const body = await response.json();

      expect(body).toEqual(resource);
    });

    it("handles nested created resource", async () => {
      const resource = {
        trip: {
          id: "trip-123",
          status: "active",
        },
        copied_equipment: {
          rod_ids: ["rod-1", "rod-2"],
          lure_ids: [],
          groundbait_ids: ["gb-1"],
        },
      };
      const response = createCreatedResponse(resource);
      const body = await response.json();

      expect(body).toEqual(resource);
    });
  });

  // ---------------------------------------------------------------------------
  // createNoContentResponse
  // ---------------------------------------------------------------------------

  describe("createNoContentResponse", () => {
    it("creates response with 204 status", () => {
      const response = createNoContentResponse();

      expect(response.status).toBe(204);
    });

    it("creates response with null body", async () => {
      const response = createNoContentResponse();

      // 204 responses should have no body
      expect(response.body).toBeNull();
    });

    it("does not set Content-Type header", () => {
      const response = createNoContentResponse();

      // 204 responses typically don't have Content-Type
      expect(response.headers.get("Content-Type")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Integration scenarios
  // ---------------------------------------------------------------------------

  describe("integration scenarios", () => {
    it("error response is valid JSON", async () => {
      const response = createErrorResponse("validation_error", "Test", 400);
      const text = await response.clone().text();

      expect(() => JSON.parse(text)).not.toThrow();
    });

    it("success response is valid JSON", async () => {
      const response = createSuccessResponse({ test: true });
      const text = await response.clone().text();

      expect(() => JSON.parse(text)).not.toThrow();
    });

    it("handles special characters in error messages", async () => {
      const response = createErrorResponse("validation_error", 'Field "email" contains invalid characters: <>&', 400);
      const body = await response.json();

      expect(body.error.message).toBe('Field "email" contains invalid characters: <>&');
    });

    it("handles unicode in response data", async () => {
      const response = createSuccessResponse({
        name: "Wędka spinningowa",
        description: "Przynęta z zanętą 🎣",
      });
      const body = await response.json();

      expect(body.name).toBe("Wędka spinningowa");
      expect(body.description).toBe("Przynęta z zanętą 🎣");
    });
  });
});
