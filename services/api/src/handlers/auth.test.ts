process.env.API_LOCAL_MODE = 'true';
process.env.DATA_STORE = 'memory';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as authHandler } from './auth';
import { handler as listingsHandler } from './listings';
import { handler as mediaHandler } from './media';
import { resetMemoryStore, putListing } from '../data';
import { ListingStatus } from '../types';

function createSignUpEvent(body: Record<string, unknown>): any {
  return {
    httpMethod: 'POST',
    path: '/auth/signup',
    pathParameters: null,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    requestContext: {},
    isBase64Encoded: false,
  };
}

function createJwtEvent(
  method: string,
  path: string,
  claims: any,
  pathParameters?: any,
  body?: any
): any {
  return {
    httpMethod: method,
    path,
    pathParameters: pathParameters || null,
    body: body ? JSON.stringify(body) : null,
    headers: {},
    requestContext: {
      authorizer: {
        jwt: {
          claims
        }
      },
      http: {
        method,
        path
      }
    },
    isBase64Encoded: false,
  };
}

describe('Authorization and JWT Claim parsing', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  test('listings handler extracts userId from JWT claims on POST', async () => {
    const event = createJwtEvent('POST', '/listings', { sub: 'user-123' }, null, {
      title: 'Test Listing',
      description: 'Test Description',
      price: 1000,
      propertyType: 'apartment',
      latitude: 9.0,
      longitude: 38.0,
      landlordId: 'user-123'
    });

    const result = await listingsHandler(event);
    expect(result.statusCode).toBe(201);
    const data = JSON.parse(result.body).data;
    expect(data.landlordId).toBe('user-123');
  });

  test('listings handler rejects update if user is not the owner', async () => {
    const listingId = 'listing-1';
    await putListing({
      listingId,
      landlordId: 'owner-456',
      title: 'Original Title',
      status: ListingStatus.APPROVED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    const event = createJwtEvent(
      'PUT', 
      `/listings/${listingId}`, 
      { sub: 'attacker-789' }, 
      { id: listingId },
      { title: 'Hacked Title' }
    );

    const result = await listingsHandler(event);
    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error.code).toBe('UNAUTHORIZED');
  });

  test('media handler rejects upload URL if user is not the listing owner', async () => {
    const listingId = 'listing-1';
    await putListing({
      listingId,
      landlordId: 'owner-456',
      status: ListingStatus.APPROVED,
    } as any);

    const event = createJwtEvent(
      'POST',
      '/media/upload-url',
      { sub: 'attacker-789' },
      null,
      {
        listingId,
        fileName: 'test.jpg',
        mediaType: 'photo',
        contentType: 'image/jpeg'
      }
    );

    const result = await mediaHandler(event);
    expect(result.statusCode).toBe(403);
  });

  test('health handler is public and does not require auth', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/health',
      requestContext: {
        http: {
          method: 'GET',
          path: '/health'
        }
      }
    } as any;
    
    // We need to import health handler
    const { handler: healthHandler } = await import('./health');
    const result = await healthHandler(event);
    expect(result.statusCode).toBe(200);
  });

  test('public signup defaults to the user role', async () => {
    const result = await authHandler(
      createSignUpEvent({
        email: 'default-role@example.com',
        password: 'Password123!',
        givenName: 'Default',
        familyName: 'User',
      })
    );

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body).data.user.role).toBe('user');
  });

  test('public signup allows landlord accounts', async () => {
    const result = await authHandler(
      createSignUpEvent({
        email: 'landlord-role@example.com',
        password: 'Password123!',
        givenName: 'Landlord',
        familyName: 'User',
        role: 'landlord',
      })
    );

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body).data.user.role).toBe('landlord');
  });

  test('public signup cannot create admin accounts', async () => {
    const result = await authHandler(
      createSignUpEvent({
        email: 'admin-role@example.com',
        password: 'Password123!',
        givenName: 'Admin',
        familyName: 'User',
        role: 'admin',
      })
    );

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error.code).toBe('FORBIDDEN');
  });
});
