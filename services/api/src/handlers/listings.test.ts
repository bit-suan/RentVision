process.env.DATA_STORE = 'memory';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './listings';
import { resetMemoryStore } from '../data';
import { loadDemoListings } from '../data/seed';

function event(
  method: string,
  path: string,
  query?: Record<string, string>,
  body?: unknown
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    queryStringParameters: query ?? null,
    body: body ? JSON.stringify(body) : null,
    headers: {},
    pathParameters: null,
    resource: path,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEvent;
}

describe('listings handler', () => {
  beforeEach(() => {
    resetMemoryStore();
    loadDemoListings();
  });

  test('lists seeded Addis Ababa listings', async () => {
    const result = await handler(event('GET', '/listings'));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.count).toBeGreaterThan(0);
  });

  test('creates a listing and fetches it by id', async () => {
    const created = await handler(
      event('POST', '/listings', undefined, {
        title: 'Gerji one bedroom',
        description: 'Simple apartment near Gerji Mebrat Hail.',
        price: 22000,
        propertyType: 'apartment',
        latitude: 9.005,
        longitude: 38.815,
        landlordId: 'landlord-test',
      })
    );
    expect(created.statusCode).toBe(201);
    const listing = JSON.parse(created.body).data;
    expect(listing.geohash).toHaveLength(5);

    const fetched = await handler(event('GET', `/listings/${listing.listingId}`, undefined));
    const byId = await handler({
      ...event('GET', `/listings/${listing.listingId}`),
      pathParameters: { id: listing.listingId },
    } as APIGatewayProxyEvent);
    expect(byId.statusCode).toBe(200);
    expect(JSON.parse(byId.body).data.listingId).toBe(listing.listingId);
    expect(fetched.statusCode).toBe(200);
  });

  test('radius search around Kirkos returns nearby homes', async () => {
    const result = await handler(
      event('GET', '/listings/search', {
        lat: '9.0104',
        lng: '38.7613',
        radiusKm: '8',
      })
    );
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.count).toBeGreaterThan(0);
    expect(body.data.items[0].distanceKm).toBeDefined();
  });

  test('rejects search without coordinates', async () => {
    const result = await handler(event('GET', '/listings/search'));
    expect(result.statusCode).toBe(400);
  });
});
