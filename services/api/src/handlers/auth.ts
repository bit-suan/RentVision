import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import crypto from 'crypto';
import { getUserByEmail, getUserById, putUser, type UserRecord } from '../data';
import { successResponse, errorResponse } from '../utils/response';
import { signAuthToken } from '../utils/auth';
import { getActor } from '../utils/request-actor';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, combined: string): boolean {
  try {
    const [salt, key] = combined.split(':');
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod || 'GET';
  const path = event.path || '';

  // Preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-User-Id,x-user-id,X-User-Role,x-user-role',
      },
      body: '',
    };
  }

  // POST /auth/signup or /api/v1/auth/signup
  if (method === 'POST' && path.endsWith('/signup')) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, password, givenName, familyName, role } = body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return errorResponse('VALIDATION_ERROR', 'A valid email address is required.', 400);
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return errorResponse('VALIDATION_ERROR', 'Password must be at least 6 characters long.', 400);
      }

      if (!givenName || typeof givenName !== 'string' || !givenName.trim()) {
        return errorResponse('VALIDATION_ERROR', 'First name is required.', 400);
      }

      // Admin accounts must be provisioned explicitly (seed data or direct
      // store access). Never let a caller elevate itself via public signup.
      if (role === 'admin') {
        return errorResponse(
          'FORBIDDEN',
          'Admin accounts cannot be created through public signup.',
          403
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        return errorResponse('USER_ALREADY_EXISTS', 'An account with this email already exists.', 409);
      }

      const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const now = new Date().toISOString();
      const userRecord: UserRecord = {
        userId,
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        givenName: givenName.trim(),
        familyName: (familyName || '').trim(),
        role: role === 'landlord' ? 'landlord' : 'user',
        createdAt: now,
        updatedAt: now,
      };

      await putUser(userRecord);

      return successResponse(
        {
          user: {
            userId: userRecord.userId,
            email: userRecord.email,
            givenName: userRecord.givenName,
            familyName: userRecord.familyName,
            role: userRecord.role,
          },
          token: signAuthToken({
            userId: userRecord.userId,
            email: userRecord.email,
            role: userRecord.role,
            exp: Date.now() + 30 * 86400000,
          }),
        },
        201
      );
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      return errorResponse('INTERNAL_ERROR', 'Failed to register account.', 500);
    }
  }

  // POST /auth/login or /api/v1/auth/login
  if (method === 'POST' && path.endsWith('/login')) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, password } = body;

      if (!email || !password) {
        return errorResponse('VALIDATION_ERROR', 'Email and password are required.', 400);
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await getUserByEmail(normalizedEmail);

      if (!user || !verifyPassword(String(password), user.passwordHash)) {
        return errorResponse('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
      }

      return successResponse(
        {
          user: {
            userId: user.userId,
            email: user.email,
            givenName: user.givenName,
            familyName: user.familyName,
            role: user.role,
          },
          token: signAuthToken({
            userId: user.userId,
            email: user.email,
            role: user.role,
            exp: Date.now() + 30 * 86400000,
          }),
        },
        200
      );
    } catch (err: unknown) {
      console.error('Login error:', err);
      return errorResponse('INTERNAL_ERROR', 'Failed to authenticate.', 500);
    }
  }

  // GET /auth/me or /api/v1/auth/me
  if (method === 'GET' && path.endsWith('/me')) {
    const actor = getActor(event);
    const userId = actor.userId;

    if (!userId) {
      return errorResponse('UNAUTHENTICATED', 'Missing user session.', 401);
    }

    const user = await getUserById(userId);
    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found.', 404);
    }

    return successResponse({
      user: {
        userId: user.userId,
        email: user.email,
        givenName: user.givenName,
        familyName: user.familyName,
        role: user.role,
      },
    });
  }

  return errorResponse('NOT_FOUND', 'Unknown auth endpoint.', 404);
};
