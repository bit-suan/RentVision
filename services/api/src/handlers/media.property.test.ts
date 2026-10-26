process.env.DATA_STORE = 'memory';

import * as fc from 'fast-check';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './media';
import { resetMemoryStore } from '../data';
import { loadDemoListings } from '../data/seed';

function makeEvent(
  method: string,
  path: string,
  body?: unknown
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    queryStringParameters: null,
    body: body !== undefined ? JSON.stringify(body) : null,
    headers: { 'x-user-id': 'landlord-hana' },
    pathParameters: null,
    resource: path,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEvent;
}

// Arbitraries constrained to the valid input domain
const listingIdArb = fc.constant('listing-bole-loft');
const mediaTypeArb = fc.constantFrom('photo', 'panorama', 'document');
const contentTypeArb = fc.constantFrom('image/jpeg', 'image/png', 'image/webp');

// File names that survive the sanitizer and produce a non-empty sanitized name.
// The handler replaces [^a-zA-Z0-9._-] with '_', so we generate names that already
// consist only of those characters so the sanitized form equals the original.
const fileNameArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-'.split('')), {
    minLength: 1,
    maxLength: 40,
  })
  .filter((s) => s.length > 0);

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Media Handler Property Tests', () => {
  beforeEach(() => {
    resetMemoryStore();
    loadDemoListings();
  });

  // Feature: rentvision-platform, Property 11: Media upload file key path structure
  // Validates: Requirements 6.1
  it('Property 11: fileKey matches listings/{listingId}/{mediaType}s/{uuid}_{sanitizedFileName}', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingIdArb,
        fileNameArb,
        mediaTypeArb,
        contentTypeArb,
        async (listingId, fileName, mediaType, contentType) => {
          const res = await handler(
            makeEvent('POST', '/media/upload-url', {
              listingId,
              fileName,
              mediaType,
              contentType,
            })
          );

          expect(res.statusCode).toBe(200);
          const body = JSON.parse(res.body);
          expect(body.success).toBe(true);

          const { fileKey } = body.data;

          // Derive expected components
          const folder = mediaType.endsWith('s') ? mediaType : `${mediaType}s`;
          const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

          // Prefix must match
          expect(fileKey).toMatch(
            new RegExp(`^listings/${escapeRegex(listingId)}/${escapeRegex(folder)}/`)
          );

          // Suffix must be {uuid}_{sanitizedFileName}
          const suffix = fileKey.slice(`listings/${listingId}/${folder}/`.length);
          const underscoreIdx = suffix.indexOf('_');
          expect(underscoreIdx).toBeGreaterThan(0);

          const uuidPart = suffix.slice(0, underscoreIdx);
          const namePart = suffix.slice(underscoreIdx + 1);

          expect(uuidPart).toMatch(UUID_RE);
          expect(namePart).toBe(sanitizedFileName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
