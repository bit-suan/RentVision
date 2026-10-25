/**
 * Geohash encoding, decoding, neighbor calculation, and bounding box utilities.
 * Uses standard base32 encoding (32 characters: 0-9, b-z excluding a, i, l, o).
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_MAP: { [char: string]: number } = {};
for (let i = 0; i < BASE32.length; i++) {
  BASE32_MAP[BASE32.charAt(i)] = i;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Normalizes a longitude coordinate to the range [-180, 180].
 */
function normalizeLongitude(lng: number): number {
  let normalized = lng;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}

/**
 * Encodes latitude and longitude into a geohash string.
 *
 * @param lat - Latitude in degrees [-90, 90]
 * @param lng - Longitude in degrees [-180, 180]
 * @param precision - Character precision (default: 5, approx 4.9km x 4.9km cell)
 * @returns Geohash string of length `precision`
 */
export function encodeGeohash(lat: number, lng: number, precision: number = 5): string {
  if (precision < 1 || precision > 12) {
    throw new Error('Precision must be between 1 and 12');
  }

  let latMin = -90.0;
  let latMax = 90.0;
  let lngMin = -180.0;
  let lngMax = 180.0;

  const targetLng = normalizeLongitude(lng);
  const targetLat = Math.max(-90.0, Math.min(90.0, lat));

  let geohash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lngMin + lngMax) / 2;
      if (targetLng >= mid) {
        ch = (ch << 1) | 1;
        lngMin = mid;
      } else {
        ch = (ch << 1) | 0;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (targetLat >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch = (ch << 1) | 0;
        latMax = mid;
      }
    }

    isEven = !isEven;

    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32.charAt(ch);
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

/**
 * Decodes a geohash string to the bounding box of the cell.
 *
 * @param hash - Geohash string
 * @returns Bounding box representing cell boundaries
 */
export function decodeGeohashBbox(hash: string): BoundingBox {
  if (!hash || hash.length === 0) {
    throw new Error('Geohash must not be empty');
  }

  let latMin = -90.0;
  let latMax = 90.0;
  let lngMin = -180.0;
  let lngMax = 180.0;

  let isEven = true;

  for (let i = 0; i < hash.length; i++) {
    const c = hash.charAt(i).toLowerCase();
    const cd = BASE32_MAP[c];
    if (cd === undefined) {
      throw new Error(`Invalid geohash character '${c}' at index ${i}`);
    }

    for (let mask = 16; mask > 0; mask >>= 1) {
      const bit = (cd & mask) !== 0;
      if (isEven) {
        const mid = (lngMin + lngMax) / 2;
        if (bit) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (bit) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
    }
  }

  return {
    minLat: latMin,
    maxLat: latMax,
    minLng: lngMin,
    maxLng: lngMax,
  };
}

/**
 * Decodes a geohash back to its approximate center coordinates.
 *
 * @param hash - Geohash string
 * @returns Center coordinates { latitude, longitude }
 */
export function decodeGeohash(hash: string): Coordinates {
  const bbox = decodeGeohashBbox(hash);
  return {
    latitude: (bbox.minLat + bbox.maxLat) / 2,
    longitude: (bbox.minLng + bbox.maxLng) / 2,
  };
}

/**
 * Returns the 8 neighboring geohash cells plus the center cell (9 total)
 * for a given geohash.
 *
 * @param hash - Geohash string
 * @returns Array of unique geohashes (including center and 8 neighbors)
 */
export function getNeighborGeohashes(hash: string): string[] {
  const bbox = decodeGeohashBbox(hash);
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLng = (bbox.minLng + bbox.maxLng) / 2;
  const latDelta = bbox.maxLat - bbox.minLat;
  const lngDelta = bbox.maxLng - bbox.minLng;

  const precision = hash.length;
  const neighbors = new Set<string>();

  for (const dLat of [-1, 0, 1]) {
    for (const dLng of [-1, 0, 1]) {
      let targetLat = centerLat + dLat * latDelta;
      let targetLng = centerLng + dLng * lngDelta;

      // Clamp latitude to valid range
      if (targetLat > 90) targetLat = 90 - 1e-6;
      if (targetLat < -90) targetLat = -90 + 1e-6;

      targetLng = normalizeLongitude(targetLng);

      neighbors.add(encodeGeohash(targetLat, targetLng, precision));
    }
  }

  return Array.from(neighbors);
}

/**
 * Computes which geohash cells overlap with a circle of given radius in kilometers.
 * Returns a unique array of geohash prefixes to query.
 *
 * @param lat - Center latitude in degrees
 * @param lng - Center longitude in degrees
 * @param radiusKm - Search radius in kilometers
 * @param precision - Geohash precision level (default: 5)
 * @returns Array of unique geohash prefixes covering the circle's bounding box
 */
export function getBoundingBoxGeohashes(
  lat: number,
  lng: number,
  radiusKm: number,
  precision: number = 5
): string[] {
  if (radiusKm <= 0) {
    return [encodeGeohash(lat, lng, precision)];
  }

  // Earth radius in km
  const EARTH_RADIUS_KM = 6371.0088;

  // Angular distance in radians
  const radDist = radiusKm / EARTH_RADIUS_KM;
  const radLat = (lat * Math.PI) / 180;

  // Latitude delta in degrees
  const deltaLatDeg = (radDist * 180) / Math.PI;

  // Longitude delta in degrees (accounting for latitude convergence)
  const cosLat = Math.cos(radLat);
  const deltaLngDeg =
    cosLat > 0.0001 ? (radDist / cosLat) * (180 / Math.PI) : 180;

  const minLat = Math.max(-90, lat - deltaLatDeg);
  const maxLat = Math.min(90, lat + deltaLatDeg);
  const minLng = lng - deltaLngDeg;
  const maxLng = lng + deltaLngDeg;

  // Decode cell dimensions at target precision
  const sampleHash = encodeGeohash(lat, lng, precision);
  const sampleBbox = decodeGeohashBbox(sampleHash);
  const cellHeight = Math.max(1e-5, sampleBbox.maxLat - sampleBbox.minLat);
  const cellWidth = Math.max(1e-5, sampleBbox.maxLng - sampleBbox.minLng);

  // Step across the bounding box using half the cell size to guarantee coverage
  const stepLat = cellHeight * 0.75;
  const stepLng = cellWidth * 0.75;

  const hashes = new Set<string>();

  // Include center and cardinal boundary points explicitly
  hashes.add(encodeGeohash(lat, lng, precision));
  hashes.add(encodeGeohash(minLat, lng, precision));
  hashes.add(encodeGeohash(maxLat, lng, precision));
  hashes.add(encodeGeohash(lat, minLng, precision));
  hashes.add(encodeGeohash(lat, maxLng, precision));

  // Step across bounding box grid with safety limit on maximum samples
  const maxSteps = 30;
  const latSteps = Math.min(maxSteps, Math.ceil((maxLat - minLat) / stepLat));
  const lngSteps = Math.min(maxSteps, Math.ceil((maxLng - minLng) / stepLng));

  for (let i = 0; i <= latSteps; i++) {
    const curLat = minLat + (i / Math.max(1, latSteps)) * (maxLat - minLat);
    for (let j = 0; j <= lngSteps; j++) {
      const curLng = minLng + (j / Math.max(1, lngSteps)) * (maxLng - minLng);
      hashes.add(encodeGeohash(curLat, curLng, precision));
    }
  }

  return Array.from(hashes);
}
