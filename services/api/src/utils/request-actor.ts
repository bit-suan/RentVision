import type {
  APIGatewayProxyEvent,
} from "aws-lambda";

import type {
  Actor,
  UserRole,
} from "./auth";

export function getActor(
  event: APIGatewayProxyEvent,
): Actor {
  const authorizer = event.requestContext?.authorizer as
    | { jwt?: { claims?: Record<string, unknown> }; claims?: Record<string, unknown> }
    | undefined;
  const claims = authorizer?.jwt?.claims ?? authorizer?.claims;
  const userId =
    event.headers["x-user-id"] ??
    event.headers["X-User-Id"] ??
    (typeof claims?.sub === "string" ? claims.sub : undefined) ??
    (typeof claims?.username === "string" ? claims.username : undefined);

  const roleHeader =
    event.headers["x-user-role"] ??
    event.headers["X-User-Role"];
  const claimRole = claims?.["custom:role"] ?? claims?.role;

  const role: UserRole | undefined =
    roleHeader === "admin" ||
    roleHeader === "user"
      ? roleHeader
      : claimRole === "admin" || claimRole === "user"
        ? claimRole
      : undefined;

  return {
    userId,
    role,
  };
}