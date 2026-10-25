import { createResponse, successResponse, errorResponse } from './response';

describe('API Gateway Response Utility', () => {
  test('createResponse sets CORS headers and status code', () => {
    const res = createResponse(200, { foo: 'bar' });
    expect(res.statusCode).toBe(200);
    expect(res.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(res.body)).toEqual({ foo: 'bar' });
  });

  test('successResponse formats body with success: true and data', () => {
    const res = successResponse({ item: 'test' }, 201);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ item: 'test' });
    expect(body.metadata?.timestamp).toBeDefined();
  });

  test('errorResponse formats body with success: false and error', () => {
    const res = errorResponse('INVALID_PARAM', 'Missing parameter', 400);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toEqual({
      code: 'INVALID_PARAM',
      message: 'Missing parameter',
    });
  });
});
