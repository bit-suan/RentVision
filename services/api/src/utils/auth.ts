import crypto from "crypto";
import { ApiError } from "./errors";

export type UserRole = "user" | "admin";

export interface Actor {
  userId?: string;
  role?: UserRole;
}

export interface AuthTokenPayload {
  userId: string;
  email?: string;
  role?: string;
  exp?: number;
}

let ephemeralTokenSecret: string | null = null;

/**
 * Resolve the HMAC secret used for API session tokens.
 *
 * Render generates `AUTH_TOKEN_SECRET` in `render.yaml`. When it is absent
 * (for example during local development) we fall back to an ephemeral secret
 * so tokens are still signed, but existing sessions are invalidated when the
 * process restarts.
 */
function getTokenSecret(): string {
  const configured = process.env.AUTH_TOKEN_SECRET?.trim();
  if (configured) return configured;

  if (!ephemeralTokenSecret) {
    ephemeralTokenSecret = crypto.randomBytes(32).toString("hex");
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[auth] AUTH_TOKEN_SECRET is not set. Using an ephemeral secret; sessions will not survive a restart.",
      );
    }
  }

  return ephemeralTokenSecret;
}

function decodeTokenPayload(body: string): AuthTokenPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<AuthTokenPayload>;

    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.userId !== "string" || !parsed.userId) return null;

    return parsed as AuthTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Create a signed bearer token for the lightweight API-backed auth mode.
 * Tokens are HMAC-SHA256 signed so a client cannot forge another user's ID.
 */
export function signAuthToken(payload: AuthTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

/**
 * Verify a bearer token created by `signAuthToken`.
 *
 * Unsigned legacy tokens are accepted only outside production and only when
 * no `AUTH_TOKEN_SECRET` is configured. This keeps existing local sessions
 * working without weakening a real deployment.
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(".");
  const body = parts[0];
  if (!body) return null;

  if (parts.length === 2) {
    const expected = crypto
      .createHmac("sha256", getTokenSecret())
      .update(body)
      .digest();

    let provided: Buffer;
    try {
      provided = Buffer.from(parts[1], "base64url");
    } catch {
      return null;
    }

    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)
    ) {
      return null;
    }
  } else if (parts.length === 1) {
    if (
      process.env.AUTH_TOKEN_SECRET ||
      process.env.NODE_ENV === "production"
    ) {
      return null;
    }
  } else {
    return null;
  }

  const payload = decodeTokenPayload(body);
  if (!payload) return null;
  if (typeof payload.exp === "number" && payload.exp <= Date.now()) {
    return null;
  }

  return payload;
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