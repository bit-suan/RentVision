import type {
  Listing,
  ListingSearchQuery,
  ListingSearchResponse,
  ListingSearchResult,
} from "../../../../shared/contracts/listings";

const EARTH_RADIUS_KM = 6371;

export interface SearchActor {
  userId?: string;
  isAdmin?: boolean;
}

export function distanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const latitude1 = toRadians(from.lat);
  const latitude2 = toRadians(to.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

function canSeeListing(listing: Listing, query: ListingSearchQuery, actor: SearchActor): boolean {
  if (query.mine) return actor.userId !== undefined && listing.ownerId === actor.userId;
  return listing.status === "approved" || listing.ownerId === actor.userId || actor.isAdmin === true;
}

export function searchListings(
  listings: readonly Listing[],
  query: ListingSearchQuery,
  actor: SearchActor = {},
): ListingSearchResponse {
  const center =
    query.lat !== undefined && query.lng !== undefined
      ? { lat: query.lat, lng: query.lng }
      : undefined;

  const matching = listings
    .filter((listing) => canSeeListing(listing, query, actor))
    .filter((listing) => query.minPrice === undefined || listing.price >= query.minPrice)
    .filter((listing) => query.maxPrice === undefined || listing.price <= query.maxPrice)
    .filter((listing) => query.bedrooms === undefined || listing.bedrooms >= query.bedrooms)
    .map((listing) => {
      const distance = center ? distanceKm(center, listing) : undefined;
      return { listing, distance };
    })
    .filter(({ distance }) => distance === undefined || distance <= query.radiusKm)
    .sort((left, right) =>
      center
        ? (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY)
        : right.listing.createdAt.localeCompare(left.listing.createdAt),
    );

  const page = matching.slice(query.offset, query.offset + query.limit);
  const results: ListingSearchResult[] = page.map(({ listing, distance }) => ({
    listingId: listing.listingId,
    title: listing.title,
    price: listing.price,
    bedrooms: listing.bedrooms,
    address: listing.address,
    lat: listing.lat,
    lng: listing.lng,
    status: listing.status,
    hasPanorama: listing.panoramas.length > 0,
    ...(distance === undefined ? {} : { distanceKm: Number(distance.toFixed(3)) }),
  }));

  return {
    total: matching.length,
    count: results.length,
    limit: query.limit,
    offset: query.offset,
    center: center ? { ...center, radiusKm: query.radiusKm } : null,
    results,
  };
}
