import type { ListingSearchQuery } from "../../../../shared/contracts/listings";
import { ApiError, type ValidationDetail } from "./errors";

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function numberParam(
  value: string | undefined,
  path: string,
  details: ValidationDetail[],
): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    details.push({ path, message: "must be a number" });
    return undefined;
  }
  return parsed;
}

export function parseSearchQuery(
  query: Record<string, string | undefined>,
): ListingSearchQuery {
  const details: ValidationDetail[] = [];
  const lat = numberParam(query.lat, "lat", details);
  const lng = numberParam(query.lng, "lng", details);
  const radiusKm = numberParam(query.radiusKm, "radiusKm", details) ?? DEFAULT_RADIUS_KM;
  const minPrice = numberParam(query.minPrice, "minPrice", details);
  const maxPrice = numberParam(query.maxPrice, "maxPrice", details);
  const bedrooms = numberParam(query.bedrooms, "bedrooms", details);
  const limit = numberParam(query.limit, "limit", details) ?? DEFAULT_LIMIT;
  const offset = numberParam(query.offset, "offset", details) ?? 0;

  if ((lat === undefined) !== (lng === undefined)) {
    details.push({ path: "lat/lng", message: "lat and lng must be provided together" });
  }
  if (lat !== undefined && (lat < -90 || lat > 90)) {
    details.push({ path: "lat", message: "must be between -90 and 90" });
  }
  if (lng !== undefined && (lng < -180 || lng > 180)) {
    details.push({ path: "lng", message: "must be between -180 and 180" });
  }
  if (radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
    throw new ApiError("INVALID_RADIUS", "radiusKm must be > 0 and <= 50", 400);
  }
  if (minPrice !== undefined && minPrice < 0) {
    details.push({ path: "minPrice", message: "must be >= 0" });
  }
  if (maxPrice !== undefined && maxPrice < 0) {
    details.push({ path: "maxPrice", message: "must be >= 0" });
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    details.push({ path: "price", message: "minPrice must be <= maxPrice" });
  }
  if (bedrooms !== undefined && (!Number.isInteger(bedrooms) || bedrooms < 0)) {
    details.push({ path: "bedrooms", message: "must be a non-negative integer" });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    details.push({ path: "limit", message: "must be an integer between 1 and 50" });
  }
  if (!Number.isInteger(offset) || offset < 0) {
    details.push({ path: "offset", message: "must be a non-negative integer" });
  }
  if (details.length > 0) {
    throw new ApiError("INVALID_QUERY", "One or more query parameters are invalid", 400, details);
  }

  return {
    lat,
    lng,
    radiusKm,
    minPrice,
    maxPrice,
    bedrooms,
    limit,
    offset,
    mine: query.mine === "true",
  };
}
