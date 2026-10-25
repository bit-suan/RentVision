process.env.DATA_STORE = 'memory';

import * as fc from 'fast-check';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './leases';
import { resetMemoryStore } from '../data';

function makeEvent(
  method: string,
  path: string,
  body?: unknown,
  pathParams?: Record<string, string>
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    queryStringParameters: null,
    body: body !== undefined ? JSON.stringify(body) : null,
    headers: {},
    pathParameters: pathParams ?? null,
    resource: path,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEvent;
}

// Arbitraries for valid lease upload fields
const listingIdArb = fc.string({ minLength: 1, maxLength: 40 });
const fileNameArb = fc
  .string({ minLength: 1, maxLength: 60 })
  .map((s) => s.replace(/[^a-zA-Z0-9._-]/g, 'x') + '.pdf');
const fileSizeArb = fc.integer({ min: 1, max: 25 * 1024 * 1024 });

interface ValidLeaseUpload {
  listingId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const validLeaseUploadArb: fc.Arbitrary<ValidLeaseUpload> = fc.record({
  listingId: listingIdArb,
  fileName: fileNameArb,
  mimeType: fc.constant('application/pdf'),
  fileSize: fileSizeArb,
});

describe('Leases Handler Property Tests', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  // Feature: rentvision-platform, Property 8: Lease upload round-trip
  // Validates: Requirements 4.1
  it('Property 8: uploading a valid lease returns 201 with a leaseId, and GET /{leaseId} returns a lease with matching listingId', async () => {
    await fc.assert(
      fc.asyncProperty(validLeaseUploadArb, async (payload) => {
        resetMemoryStore();

        const uploadRes = await handler(
          makeEvent('POST', '/leases/upload-url', payload)
        );

        expect(uploadRes.statusCode).toBe(201);
        const uploadBody = JSON.parse(uploadRes.body);
        expect(uploadBody.success).toBe(true);

        const { leaseId } = uploadBody.data;
        expect(typeof leaseId).toBe('string');
        expect(leaseId.length).toBeGreaterThan(0);

        const getRes = await handler(
          makeEvent('GET', `/leases/${leaseId}`, undefined, { id: leaseId })
        );

        expect(getRes.statusCode).toBe(200);
        const getBody = JSON.parse(getRes.body);
        expect(getBody.success).toBe(true);
        expect(getBody.data.listingId).toBe(payload.listingId);
      }),
      { numRuns: 100 }
    );
  });
});
