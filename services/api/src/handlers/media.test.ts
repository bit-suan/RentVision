process.env.DATA_STORE = 'memory';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './media';

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

describe('media handler', () => {
  test('creates a local upload URL for a panorama', async () => {
    const result = await handler(
      event('POST', '/media/upload-url', undefined, {
        listingId: 'listing-bole-loft',
        fileName: 'living.jpg',
        mediaType: 'panorama',
        contentType: 'image/jpeg',
      })
    );
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.uploadUrl).toContain('/local-upload/');
    expect(body.data.fileKey).toContain('listings/listing-bole-loft/panoramas/');
  });

  test('creates a download URL', async () => {
    const result = await handler(
      event('GET', '/media/download-url', {
        fileKey: 'listings/listing-bole-loft/panoramas/living.jpg',
      })
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).data.downloadUrl).toContain('/local-objects/');
  });
});
