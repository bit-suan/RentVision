import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";

import {
  ApiError,
  errorBody,
} from "./errors";

export function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export function parseJsonBody<T>(
  event: APIGatewayProxyEvent,
): T {
  if (!event.body) {
    throw new ApiError(
      "INVALID_JSON",
      "Request body is required",
      400,
    );
  }

  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new ApiError(
      "INVALID_JSON",
      "Request body must contain valid JSON",
      400,
    );
  }
}

export function handleError(
  error: unknown,
): APIGatewayProxyResult {
  if (error instanceof ApiError) {
    return jsonResponse(
      error.statusCode,
      errorBody(error),
    );
  }

  return jsonResponse(500, {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}