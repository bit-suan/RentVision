import { haversineDistance } from './distance';

describe('Haversine Distance Utility', () => {
  test('returns 0 for identical coordinates', () => {
    const dist = haversineDistance(9.010793, 38.761252, 9.010793, 38.761252);
    expect(dist).toBeCloseTo(0, 4);
  });

  test('calculates correct approximate distance between Addis Ababa and Hawassa (~218 km)', () => {
    // Addis Ababa: 9.010793, 38.761252
    // Hawassa: 7.062054, 38.476486
    const dist = haversineDistance(9.010793, 38.761252, 7.062054, 38.476486);
    expect(dist).toBeGreaterThan(210);
    expect(dist).toBeLessThan(230);
  });
});
