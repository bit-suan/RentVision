import {
  encodeGeohash,
  decodeGeohash,
  getNeighborGeohashes,
  getBoundingBoxGeohashes,
} from './geohash';

describe('Geohash Utility', () => {
  // Addis Ababa coordinates
  const addisLat = 9.010793;
  const addisLng = 38.761252;

  test('encodes coordinates to valid geohash string', () => {
    const hash = encodeGeohash(addisLat, addisLng, 5);
    expect(hash).toHaveLength(5);
    expect(typeof hash).toBe('string');
  });

  test('decodes geohash back to approximate coordinates within tolerance', () => {
    const precision = 7;
    const hash = encodeGeohash(addisLat, addisLng, precision);
    const decoded = decodeGeohash(hash);

    expect(Math.abs(decoded.latitude - addisLat)).toBeLessThan(0.01);
    expect(Math.abs(decoded.longitude - addisLng)).toBeLessThan(0.01);
  });

  test('getNeighborGeohashes returns 9 unique geohashes including the center', () => {
    const hash = encodeGeohash(addisLat, addisLng, 5);
    const neighbors = getNeighborGeohashes(hash);

    expect(neighbors.length).toBe(9);
    expect(new Set(neighbors).size).toBe(9);
    expect(neighbors).toContain(hash);
  });

  test('getBoundingBoxGeohashes returns unique cells covering radius', () => {
    const cells = getBoundingBoxGeohashes(addisLat, addisLng, 5, 5);
    expect(cells.length).toBeGreaterThan(0);
    expect(new Set(cells).size).toBe(cells.length);

    // Center cell should be included
    const centerHash = encodeGeohash(addisLat, addisLng, 5);
    expect(cells).toContain(centerHash);
  });
});
