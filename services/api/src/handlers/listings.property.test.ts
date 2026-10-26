process.env.DATA_STORE = 'memory';

import * as fc from 'fast-check';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './listings';
import { resetMemoryStore } from '../data';

// Helper to build minimal APIGatewayProxyEvent objects
function makeEvent(
  method: string,
  path: string,
  query?: Record<string, string>,
  body?: unknown,
  pathParams?: Record<string, string>
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    queryStringParameters: query ?? null,
    body: body !== undefined ? JSON.stringify(body) : null,
    headers: { 'x-user-id': 'property-test-landlord' },
    pathParameters: pathParams ?? null,
    resource: path,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEvent;
}

// Arbitraries for valid listing fields
const titleArb = fc.string({ minLength: 1, maxLength: 80 });
const descArb = fc.string({ minLength: 1, maxLength: 200 });
const priceArb = fc.float({ min: 0, max: Math.fround(1_000_000), noNaN: true });
const propertyTypeArb = fc.constantFrom(
  'apartment', 'house', 'studio', 'commercial', 'villa'
);
// Constrain coords inside Addis Ababa's rough bounding box so geo-search tests
// are meaningful, but keep them truly random within that box.
// fc.float requires 32-bit float boundaries, so we use Math.fround.
const latArb = fc.float({ min: Math.fround(8.8), max: Math.fround(9.2), noNaN: true });
const lngArb = fc.float({ min: Math.fround(38.6), max: Math.fround(39.0), noNaN: true });
const landlordIdArb = fc.string({ minLength: 1, maxLength: 40 });

interface ValidListing {
  title: string;
  description: string;
  price: number;
  propertyType: string;
  latitude: number;
  longitude: number;
  landlordId: string;
}

const validListingArb: fc.Arbitrary<ValidListing> = fc.record({
  title: titleArb,
  description: descArb,
  price: priceArb,
  propertyType: propertyTypeArb,
  latitude: latArb,
  longitude: lngArb,
  landlordId: landlordIdArb,
});

describe('Listings Handler Property Tests', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  // Feature: rentvision-platform, Property 1: Listing creation round-trip
  // Validates: Requirements 1.1, 1.3
  it('Property 1: creating a listing and fetching by returned listingId returns matching fields', async () => {
    await fc.assert(
      fc.asyncProperty(validListingArb, async (payload) => {
        resetMemoryStore();

        const createRes = await handler(
          makeEvent('POST', '/listings', undefined, payload)
        );

        expect(createRes.statusCode).toBe(201);
        const createBody = JSON.parse(createRes.body);
        expect(createBody.success).toBe(true);

        const created = createBody.data;
        expect(created.status).toBe('approved');
        expect(created.geohash).toHaveLength(5);

        // Round-trip: fetch by listingId
        const getRes = await handler(
          makeEvent('GET', `/listings/${created.listingId}`, undefined, undefined, {
            id: created.listingId,
          })
        );

        expect(getRes.statusCode).toBe(200);
        const fetched = JSON.parse(getRes.body).data;

        expect(fetched.listingId).toBe(created.listingId);
        expect(fetched.title).toBe(payload.title);
        expect(fetched.price).toBe(payload.price);
        expect(fetched.latitude).toBe(payload.latitude);
        expect(fetched.longitude).toBe(payload.longitude);
        expect(fetched.status).toBe('approved');
        expect(fetched.geohash).toHaveLength(5);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: rentvision-platform, Property 2: Invalid listing inputs are rejected
  // Validates: Requirements 1.2
  it('Property 2: payloads with missing or out-of-range fields are rejected with 400 VALIDATION_ERROR', async () => {
    // Arbitraries that produce invalid variants
    const missingFieldArb = fc.record({
      // omit one required field randomly
      title: fc.option(titleArb, { nil: undefined }),
      description: fc.option(descArb, { nil: undefined }),
      price: fc.option(priceArb, { nil: undefined }),
      propertyType: fc.option(propertyTypeArb, { nil: undefined }),
      latitude: fc.option(latArb, { nil: undefined }),
      longitude: fc.option(lngArb, { nil: undefined }),
      landlordId: fc.option(landlordIdArb, { nil: undefined }),
    }).filter((rec) =>
      // At least one required field must be absent or undefined
      Object.values(rec).some((v) => v === undefined || v === null || v === '')
    );

    const outOfRangeArb = fc.oneof(
      // latitude > 90
      validListingArb.map((p) => ({ ...p, latitude: 91 + Math.random() * 90 })),
      // latitude < -90
      validListingArb.map((p) => ({ ...p, latitude: -91 - Math.random() * 90 })),
      // longitude > 180
      validListingArb.map((p) => ({ ...p, longitude: 181 + Math.random() * 180 })),
      // longitude < -180
      validListingArb.map((p) => ({ ...p, longitude: -181 - Math.random() * 180 })),
      // negative price
      validListingArb.map((p) => ({ ...p, price: -1 - Math.random() * 100 }))
    );

    await fc.assert(
      fc.asyncProperty(fc.oneof(missingFieldArb, outOfRangeArb), async (payload) => {
        resetMemoryStore();
        const res = await handler(
          makeEvent('POST', '/listings', undefined, payload)
        );
        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(false);
        expect(body.error?.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 100 }
    );
  });

  // Feature: rentvision-platform, Property 3: Listing list count consistency
  // Validates: Requirements 1.5
  it('Property 3: GET /listings returns count === items.length and all items are approved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validListingArb, { minLength: 1, maxLength: 10 }),
        async (payloads) => {
          resetMemoryStore();

          // Insert all listings
          for (const payload of payloads) {
            await handler(makeEvent('POST', '/listings', undefined, payload));
          }

          const listRes = await handler(makeEvent('GET', '/listings'));
          expect(listRes.statusCode).toBe(200);

          const body = JSON.parse(listRes.body);
          expect(body.success).toBe(true);

          const { items, count } = body.data;
          expect(count).toBe(items.length);
          for (const item of items) {
            expect(item.status).toBe('approved');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: rentvision-platform, Property 4: Geo-search radius containment and sort order
  // Validates: Requirements 2.1, 2.4
  it('Property 4: geo-search results are all within radiusKm and sorted ascending by distanceKm', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Search center and radius
        fc.record({
          centerLat: latArb,
          centerLng: lngArb,
          radiusKm: fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        }),
        // A batch of listings to insert
        fc.array(validListingArb, { minLength: 1, maxLength: 8 }),
        async ({ centerLat, centerLng, radiusKm }, payloads) => {
          resetMemoryStore();

          for (const payload of payloads) {
            await handler(makeEvent('POST', '/listings', undefined, payload));
          }

          const searchRes = await handler(
            makeEvent('GET', '/listings/search', {
              lat: String(centerLat),
              lng: String(centerLng),
              radiusKm: String(radiusKm),
            })
          );

          expect(searchRes.statusCode).toBe(200);
          const body = JSON.parse(searchRes.body);
          const items: Array<{ distanceKm: number }> = body.data.items;

          // Every result must be within the radius
          for (const item of items) {
            expect(item.distanceKm).toBeLessThanOrEqual(radiusKm);
          }

          // Results must be sorted in non-decreasing order of distanceKm
          for (let i = 1; i < items.length; i++) {
            expect(items[i].distanceKm).toBeGreaterThanOrEqual(items[i - 1].distanceKm);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
