import type {
  APIGatewayProxyEvent,
} from "aws-lambda";

import {
  verifyAuthToken,
  type Actor,
  type UserRole,
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

  // 3. Verify a signed API session token. This is how the API-backed auth
  // mode works on Render without a Cognito authorizer in front of the API.
  const authorization =
    event.headers?.authorization ?? event.headers?.Authorization;
  if (typeof authorization === "string") {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match) {
      const payload = verifyAuthToken(match[1]);
      if (payload?.userId) {
        return {
          userId: payload.userId,
          role: payload.role === "admin" ? "admin" : "user",
        };
      }
    }
  }

  // 4. Fallback to headers for local development and tests only. A deployed
  // API must never trust caller-supplied identity headers unless local mode
  // is explicitly enabled.
  const localMode = process.env.API_LOCAL_MODE;
  const allowHeaderActor =
    localMode === "true" ||
    (localMode !== "false" &&
      process.env.NODE_ENV !== "production" &&
      process.env.DATA_STORE === "memory");
  if (!allowHeaderActor) {
    return {};
  }

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

export const getRequestActor = getActor;