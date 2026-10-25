import * as fc from 'fast-check';
import { successResponse, errorResponse } from './response';

// Feature: rentvision-platform, Property 12: Response shape invariant

describe('Property 12: Response shape invariant', () => {
  /**
   * For any successful handler response, successResponse(data, status).body
   * when parsed should have success === true, a defined data field, and
   * a defined metadata.timestamp.
   * Validates: Requirements 1.1, 1.2, 2.1, 4.1, 6.1
   */
  it('successResponse always produces correct shape', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.array(fc.string()),
          fc.record({ id: fc.string(), value: fc.integer() })
        ),
        fc.integer({ min: 200, max: 299 }),
        (data, statusCode) => {
          const res = successResponse(data, statusCode);
          const body = JSON.parse(res.body);

          expect(res.statusCode).toBe(statusCode);
          expect(body.success).toBe(true);
          expect(body).toHaveProperty('data');
          expect(typeof body.metadata?.timestamp).toBe('string');
          expect(body.metadata.timestamp.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any error handler response, errorResponse(code, message, status).body
   * when parsed should have success === false and error.code matching the input code.
   * Validates: Requirements 1.1, 1.2, 2.1, 4.1, 6.1
   */
  it('errorResponse always produces correct shape', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string(),
        fc.integer({ min: 400, max: 599 }),
        (code, message, statusCode) => {
          const res = errorResponse(code, message, statusCode);
          const body = JSON.parse(res.body);

          expect(res.statusCode).toBe(statusCode);
          expect(body.success).toBe(false);
          expect(body.error?.code).toBe(code);
          expect(typeof body.metadata?.timestamp).toBe('string');
          expect(body.metadata.timestamp.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
