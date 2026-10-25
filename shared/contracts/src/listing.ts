/**
 * Property types supported by RentVision.
 */
export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  STUDIO = 'studio',
  COMMERCIAL = 'commercial',
  VILLA = 'villa',
}

/**
 * Lifecycle status of a property listing.
 */
export enum ListingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  RENTED = 'rented',
}

/**
 * Currency options for property pricing.
 */
export type Currency = 'ETB' | 'USD';

/**
 * Structured address for Ethiopian locations.
 */
export interface Address {
  street: string;
  city: string;
  subcity: string;
  woreda: string;
}

/**
 * Core Property Listing model.
 */
export interface Listing {
  listingId: string;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  propertyType: PropertyType;
  status: ListingStatus;
  latitude: number;
  longitude: number;
  geohash: string;
  address: Address;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  amenities: string[];
  mediaKeys: string[];
  panoramaKeys: string[];
  landlordId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating a new listing.
 * Excludes server-generated properties (ID, geohash, status, timestamps).
 */
export type CreateListingRequest = Omit<
  Listing,
  'listingId' | 'createdAt' | 'updatedAt' | 'geohash' | 'status'
>;

/**
 * Request payload for updating an existing listing.
 */
export type UpdateListingRequest = Partial<CreateListingRequest>;

/**
 * Query parameters for geospatial radius search.
 */
export interface GeoSearchParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

/**
 * Search response containing matching listings and pagination info.
 */
export interface ListingSearchResponse {
  items: Array<Listing & { distanceKm?: number }>;
  count: number;
  lastEvaluatedKey?: string;
  nextToken?: string;
}
