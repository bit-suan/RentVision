import { ApiError } from "./errors";

export type UserRole = "user" | "admin";

export interface Actor {
  userId?: string;
  role?: UserRole;
}

export function requireUser(actor: Actor): string {
  if (!actor.userId) {
    throw new ApiError(
      "UNAUTHENTICATED",
      "You must be signed in",
      401,
    );
  }

  return actor.userId;
}

export function isAdmin(actor: Actor): boolean {
  return actor.role === "admin";
}

export function canModifyListing(
  ownerId: string,
  actor: Actor,
): boolean {
  return actor.userId === ownerId || isAdmin(actor);
}