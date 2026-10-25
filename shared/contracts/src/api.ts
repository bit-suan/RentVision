/**
 * Standard HTTP Status Codes used across RentVision APIs.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

/**
 * Standard API error structure.
 */
export interface ApiError {
  code: string;
  message: string;
}

/**
 * Request execution metadata.
 */
export interface ApiMetadata {
  requestId?: string;
  timestamp: string;
}

/**
 * Unified API Response wrapper across all RentVision HTTP endpoints.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

/**
 * Standard pagination query parameters.
 */
export interface PaginationParams {
  limit?: number;
  nextToken?: string;
}
