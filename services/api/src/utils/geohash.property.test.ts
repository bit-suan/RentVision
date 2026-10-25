import * as fc from 'fast-check';
import { encodeGeohash, decodeGeohash } from './geohash';

const BASE32_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';

// Arbitraries
const latArb = fc.float({ min: -90, max: 90, noNaN: true });
const lngArb = fc.float({ min: -180, max: 180, noNaN: true });
const precisionArb = fc.integer({ min: 1, max: 12 });

describe('Geohash Property Tests', () => {
  // Feature: rentvision-platform, Property 5: Geohash encoding output contract
  it('Property 5: output length equals precision and all chars are in Base32 alphabet', () => {
    fc.assert(
      fc.property(latArb, lngArb, precisionArb, (lat, lng, precision) => {
        const hash = encodeGeohash(lat, lng, precision);

        // Length must equal precision
        expect(hash).toHaveLength(precision);

        // Every character must be in the Base32 alphabet
        for (const ch of hash) {
          expect(BASE32_ALPHABET).toContain(ch);
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: rentvision-platform, Property 6: Geohash encode-decode round-trip
  it('Property 6: decoding center and re-encoding returns the same hash', () => {
    fc.assert(
      fc.property(latArb, lngArb, precisionArb, (lat, lng, precision) => {
        const hash = encodeGeohash(lat, lng, precision);
        const center = decodeGeohash(hash);
        const reEncoded = encodeGeohash(center.latitude, center.longitude, precision);

        expect(reEncoded).toBe(hash);
      }),
      { numRuns: 100 }
    );
  });
});
