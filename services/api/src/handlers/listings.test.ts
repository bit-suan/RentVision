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
    headers: { 'x-user-id': 'landlord-test' },
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

  test('lists only the authenticated landlord listings', async () => {
    const created = await handler(
      event('POST', '/listings', undefined, {
        title: 'My portfolio listing',
        description: 'Owned by the authenticated landlord.',
        price: 24000,
        propertyType: 'apartment',
        latitude: 9.01,
        longitude: 38.76,
      })
    );
    expect(created.statusCode).toBe(201);

    const result = await handler(event('GET', '/listings/mine'));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].title).toBe('My portfolio listing');
    expect(body.data.items[0].landlordId).toBe('landlord-test');
  });

  test('rejects unauthenticated portfolio access', async () => {
    const result = await handler({
      ...event('GET', '/listings/mine'),
      headers: {},
    } as APIGatewayProxyEvent);
    expect(result.statusCode).toBe(401);
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

  test('creates a listing with validated panorama scenes and hotspots', async () => {
    const result = await handler(
      event('POST', '/listings', undefined, {
        title: 'Panorama apartment',
        description: 'A furnished apartment with a virtual tour.',
        price: 25000,
        propertyType: 'apartment',
        latitude: 9.005,
        longitude: 38.815,
        landlordId: 'landlord-panorama',
        panorama: {
          defaultSceneId: 'living-room',
          scenes: [
            {
              id: 'living-room',
              title: 'Living room',
              s3Key: 'listings/pending/panoramas/living.jpg',
              hotspots: [
                {
                  id: 'to-bedroom',
                  pitch: -8,
                  yaw: 40,
                  text: 'Go to bedroom',
                  targetSceneId: 'bedroom',
                },
              ],
            },
            {
              id: 'bedroom',
              title: 'Bedroom',
              s3Key: 'listings/pending/panoramas/bedroom.jpg',
              hotspots: [],
            },
          ],
        },
      })
    );

    expect(result.statusCode).toBe(400);
  });

  test('stores panorama metadata after the listing has been created', async () => {
    const created = await handler(
      event('POST', '/listings', undefined, {
        title: 'Panorama apartment',
        description: 'A furnished apartment with a virtual tour.',
        price: 25000,
        propertyType: 'apartment',
        latitude: 9.005,
        longitude: 38.815,
        landlordId: 'landlord-panorama',
      })
    );
    const listing = JSON.parse(created.body).data;

    const updated = await handler(
      event('PUT', `/listings/${listing.listingId}`, undefined, {
        panorama: {
          defaultSceneId: 'living-room',
          scenes: [
            {
              id: 'living-room',
              title: 'Living room',
              s3Key: `listings/${listing.listingId}/panoramas/living.jpg`,
              hotspots: [
                {
                  id: 'to-bedroom',
                  pitch: 0,
                  yaw: 45,
                  text: 'Go to bedroom',
                  targetSceneId: 'bedroom',
                },
              ],
            },
            {
              id: 'bedroom',
              title: 'Bedroom',
              s3Key: `listings/${listing.listingId}/panoramas/bedroom.jpg`,
              hotspots: [],
            },
          ],
        },
      })
    );

    expect(updated.statusCode).toBe(200);
    expect(JSON.parse(updated.body).data.panorama.scenes).toHaveLength(2);

    const fetched = await handler(
      event('GET', `/listings/${listing.listingId}`)
    );
    const fetchedListing = JSON.parse(fetched.body).data;
    expect(fetched.statusCode).toBe(200);
    expect(fetchedListing.panorama.scenes[0].imageUrl).toContain(
      '/local-objects/'
    );
  });

  test('rejects a hotspot that targets a missing scene', async () => {
    const created = await handler(
      event('POST', '/listings', undefined, {
        title: 'Invalid panorama apartment',
        description: 'Invalid tour metadata.',
        price: 25000,
        propertyType: 'apartment',
        latitude: 9.005,
        longitude: 38.815,
        landlordId: 'landlord-panorama',
      })
    );
    const listing = JSON.parse(created.body).data;

    const updated = await handler(
      event('PUT', `/listings/${listing.listingId}`, undefined, {
        panorama: {
          defaultSceneId: 'living-room',
          scenes: [
            {
              id: 'living-room',
              title: 'Living room',
              s3Key: `listings/${listing.listingId}/panoramas/living.jpg`,
              hotspots: [
                {
                  id: 'broken-link',
                  pitch: 0,
                  yaw: 45,
                  text: 'Missing room',
                  targetSceneId: 'missing-room',
                },
              ],
            },
          ],
        },
      })
    );

    expect(updated.statusCode).toBe(400);
  });

  test('requires an authenticated owner or admin to update and moderate listings', async () => {
    const created = await handler(
      event('POST', '/listings', undefined, {
        title: 'Protected listing',
        description: 'Protected listing.',
        price: 25000,
        propertyType: 'apartment',
        latitude: 9.005,
        longitude: 38.815,
      })
    );
    const listing = JSON.parse(created.body).data;

    const forbidden = await handler(
      {
        ...event('PUT', `/listings/${listing.listingId}`, undefined, { price: 26000 }),
        headers: { 'x-user-id': 'another-landlord' },
      } as APIGatewayProxyEvent
    );
    expect(forbidden.statusCode).toBe(403);

    const moderated = await handler({
      ...event('PATCH', `/listings/${listing.listingId}/status`, undefined, {
        status: 'rejected',
      }),
      headers: { 'x-user-id': 'admin-1', 'x-user-role': 'admin' },
    } as APIGatewayProxyEvent);
    expect(moderated.statusCode).toBe(200);
  });

  test('registers an image only when its key belongs to the listing', async () => {
    const created = await handler(
      event('POST', '/listings', undefined, {
        title: 'Image listing',
        description: 'Image listing.',
        price: 25000,
        propertyType: 'apartment',
        latitude: 9.005,
        longitude: 38.815,
      })
    );
    const listing = JSON.parse(created.body).data;

    const response = await handler(
      event('POST', `/listings/${listing.listingId}/images`, undefined, {
        s3Key: `listings/${listing.listingId}/photos/front.jpg`,
      })
    );
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).data.image.s3Key).toContain(listing.listingId);
  });
});
