import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../types';

/**
 * Standard CORS headers for all API Gateway responses.
 */
export const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

/**
 * Creates a standardized API Gateway proxy response with CORS headers.
 *
 * @param statusCode - HTTP status code
 * @param body - Response body (string or serializable object)
 * @returns APIGatewayProxyResult
 */
export function createResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

/**
 * Creates a standardized success response matching the ApiResponse contract.
 *
 * @param data - Payload to return in response.data
 * @param statusCode - HTTP status code (default: 200)
 * @returns APIGatewayProxyResult
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
  return createResponse(statusCode, payload);
}

/**
 * Creates a standardized error response matching the ApiResponse contract.
 *
 * @param code - Error code identifier (e.g. 'VALIDATION_ERROR', 'NOT_FOUND')
 * @param message - Human-readable error description
 * @param statusCode - HTTP status code (default: 400)
 * @returns APIGatewayProxyResult
 */
export function errorResponse(
  code: string,
  message: string,
  statusCode: number = 400
): APIGatewayProxyResult {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
  return createResponse(statusCode, payload);
}
