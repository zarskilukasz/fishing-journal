import type { ApiErrorCode, ApiErrorDetails, ApiErrorResponse } from "@/types";

/**
 * Creates a standardized JSON error response.
 *
 * @param code - Error code identifier
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details (e.g., field validation info)
 * @returns Response object with JSON error body
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: ApiErrorDetails
): Response {
  const body: ApiErrorResponse = {
    error: { code, message, ...(details && { details }) },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates a standardized JSON success response.
 *
 * @param data - Response payload
 * @param status - HTTP status code (default 200)
 * @returns Response object with JSON body
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates a 201 Created response with the created resource.
 *
 * @param data - The created resource
 * @returns Response object with JSON body and 201 status
 */
export function createCreatedResponse<T>(data: T): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates a 204 No Content response.
 * Used for successful DELETE operations.
 *
 * @returns Empty response with 204 status
 */
export function createNoContentResponse(): Response {
  return new Response(null, {
    status: 204,
  });
}
