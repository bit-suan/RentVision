import type {
  APIGatewayProxyEvent,
} from "aws-lambda";

import type {
  Actor,
  UserRole,
} from "./auth";

export function getActor(
  event: any,
): Actor {
  // 1. Try to get identity from API Gateway JWT authorizer (Production)
  // HTTP API v2 payload format 2.0
  const jwtClaims = event.requestContext?.authorizer?.jwt?.claims;
  if (jwtClaims) {
    return {
      userId: jwtClaims.sub,
      role: jwtClaims['custom:role'] || 'user', // Assuming a custom claim for roles
    };
  }

  // 2. Try to get identity from REST API Cognito authorizer
  const cognitoClaims = event.requestContext?.authorizer?.claims;
  if (cognitoClaims) {
    return {
      userId: cognitoClaims.sub || cognitoClaims['cognito:username'],
      role: cognitoClaims['custom:role'] || 'user',
    };
  }

  // 3. Fallback to headers (Local development/testing only)
  const userId =
    event.headers?.["x-user-id"] ??
    event.headers?.["X-User-Id"];

  const roleHeader =
    event.headers?.["x-user-role"] ??
    event.headers?.["X-User-Role"];

  const role: UserRole | undefined =
    roleHeader === "admin" || roleHeader === "user"
      ? roleHeader
      : undefined;

  return {
    userId,
    role,
  };
}