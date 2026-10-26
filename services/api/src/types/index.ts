/**
 * Local type definitions for RentVision API Lambda handlers.
 * Isolated from shared/contracts to eliminate cross-package bundling issues during Lambda deployment.
 */

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  STUDIO = 'studio',
  COMMERCIAL = 'commercial',
  VILLA = 'villa',
}

export enum ListingStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export type Currency = 'ETB' | 'USD';

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
  hotspots: PanoramaHotspot[];
}

export interface PanoramaTour {
  defaultSceneId: string;
  scenes: PanoramaScene[];
}

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
  panorama?: PanoramaTour;
  landlordId: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateListingRequest = Omit<
  Listing,
  'listingId' | 'createdAt' | 'updatedAt' | 'geohash' | 'status'
>;

export type UpdateListingRequest = Partial<CreateListingRequest>;

export interface GeoSearchParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface ListingSearchResponse {
  items: (Listing & { distanceKm?: number })[];
  count: number;
  lastEvaluatedKey?: string;
}

export type LeaseStatus = 'uploaded' | 'processing' | 'extracted' | 'failed';

export interface LeaseExtractedData {
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  deposit?: number;
  terms?: string[];
  landlordName?: string;
  tenantName?: string;
}

export interface Lease {
  leaseId: string;
  listingId: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  status: LeaseStatus;
  uploadedBy: string;
  extractedData?: LeaseExtractedData;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseUploadRequest {
  listingId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
}

export interface LeaseUploadResponse {
  leaseId: string;
  uploadUrl: string;
  fileKey: string;
}

export interface LeaseQAQuery {
  leaseId: string;
  question: string;
}

export interface LeaseQAResponse {
  leaseId: string;
  question: string;
  answer: string;
  confidence: number;
  sourcePage?: number;
}

export type MediaType = 'photo' | 'panorama' | 'document';

export interface PresignedUrlRequest {
  listingId: string;
  fileName: string;
  mediaType: MediaType;
  contentType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export interface MediaDownloadRequest {
  fileKey: string;
}

export interface MediaDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiMetadata {
  requestId?: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

export interface PaginationParams {
  limit?: number;
  nextToken?: string;
}

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];
