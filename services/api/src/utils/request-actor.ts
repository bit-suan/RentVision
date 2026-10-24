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
  const userId =
    event.headers["x-user-id"] ??
    event.headers["X-User-Id"];

  const roleHeader =
    event.headers["x-user-role"] ??
    event.headers["X-User-Role"];

  const role: UserRole | undefined =
    roleHeader === "admin" || roleHeader === "user"
      ? roleHeader
      : undefined;

  return {
    userId,
    role,
  };
}