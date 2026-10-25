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
  landlordId: string;
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
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
