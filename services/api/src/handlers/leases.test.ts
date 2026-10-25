process.env.DATA_STORE = 'memory';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './leases';

function event(
  method: string,
  path: string,
  query?: Record<string, string>,
  body?: unknown,
  pathParameters?: Record<string, string>
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    queryStringParameters: query ?? null,
    body: body ? JSON.stringify(body) : null,
    headers: {},
    pathParameters: pathParameters ?? null,
    resource: path,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEvent;
}

describe('leases handler', () => {
  test('creates a lease upload record', async () => {
    const result = await handler(
      event('POST', '/leases/upload-url', undefined, {
        listingId: 'listing-bole-loft',
        fileName: 'agreement.pdf',
        mimeType: 'application/pdf',
        fileSize: 12000,
        uploadedBy: 'tenant-1',
      })
    );
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.data.leaseId).toBeDefined();

    const fetched = await handler(
      event('GET', `/leases/${body.data.leaseId}`, undefined, undefined, {
        id: body.data.leaseId,
      })
    );
    expect(fetched.statusCode).toBe(200);
    expect(JSON.parse(fetched.body).data.listingId).toBe('listing-bole-loft');
  });

  test('rejects non-pdf uploads', async () => {
    const result = await handler(
      event('POST', '/leases/upload-url', undefined, {
        listingId: 'listing-bole-loft',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 12000,
      })
    );
    expect(result.statusCode).toBe(400);
  });
});
