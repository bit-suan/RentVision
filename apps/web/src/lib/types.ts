export type PropertyType =
  | "apartment"
  | "house"
  | "studio"
  | "commercial"
  | "villa";

export interface Address {
  street: string;
  city: string;
  subcity: string;
  woreda: string;
}

export interface PanoramaHotspot {
  id: string;
  pitch: number;
  yaw: number;
  text: string;
  targetSceneId?: string;
}

export interface PanoramaScene {
  id: string;
  title: string;
  s3Key: string;
  imageUrl?: string;
  hotspots: PanoramaHotspot[];
}

export interface PanoramaTour {
  defaultSceneId: string;
  scenes: PanoramaScene[];
}

export type ListingStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "active"
  | "inactive"
  | "rented";

export interface Listing {
  listingId: string;
  title: string;
  description: string;
  price: number;
  currency: "ETB" | "USD";
  propertyType: PropertyType;
  status: string;
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
  panorama?: PanoramaTour;
  landlordId: string;
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  currency?: "ETB" | "USD";
  propertyType: PropertyType;
  latitude: number;
  longitude: number;
  address: Address;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  amenities: string[];
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  mediaKeys?: string[];
  panorama?: PanoramaTour | null;
}

export interface MyListingsResponse {
  items: Listing[];
  count: number;
}

export interface MediaUploadUrl {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export interface AddImageResponse {
  image: { s3Key: string; addedAt: string };
  warnings: unknown[];
  listingStatus: string;
  note?: string;
  listing: Listing;
}


export interface ListingSearchQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: string;
  hasTour?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListingSearchResponse {
  items: Listing[];
  count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface LeaseQAResponse {
  leaseId: string;
  question: string;
  answer: string;
  confidence: number;
  sourcePage?: number;
}
