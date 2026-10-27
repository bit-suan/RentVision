import type {
  AddImageResponse,
  ApiResponse,
  CreateListingInput,
  LeaseQAResponse,
  Listing,
  ListingSearchQuery,
  ListingSearchResponse,
  MediaUploadUrl,
  MyListingsResponse,
  UpdateListingInput,
} from "./types";
import { fetchAuthSession } from "aws-amplify/auth";
import { mockProperties } from "./property-data";
import {
  hasLocalAuthSession,
  isLocalAuthMode,
  LOCAL_DEV_USER_ID,
} from "./auth-config";

/** Convert a MockProperty to the Listing shape used by the API contract. */
function mockToListing(m: (typeof mockProperties)[number], index: number): Listing {
  return {
    listingId: m.id,
    title: m.title,
    description: m.description,
    price: m.price,
    currency: "ETB",
    propertyType: (m.propertyType.toLowerCase() as Listing["propertyType"]) || "apartment",
    status: m.availability === "AVAILABLE" ? "active" : m.availability.toLowerCase(),
    latitude: 9.010793 + index * 0.01,
    longitude: 38.761252 + index * 0.01,
    geohash: "",
    address: {
      street: m.location,
      city: "Addis Ababa",
      subcity: m.location.split(",")[0] || "",
      woreda: "",
    },
    bedrooms: m.bedrooms,
    bathrooms: m.bathrooms,
    areaSqm: 0,
    amenities: m.amenities,
    mediaKeys: [m.imageUrl, ...m.galleryImages],
    panoramaKeys: [],
    landlordId: "mock-landlord",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const MOCK_LISTINGS: Listing[] = mockProperties.map(mockToListing);

/** Returns true when we should use mock data (backend not configured). */
export function isMockMode(): boolean {
  return !process.env.NEXT_PUBLIC_API_BASE_URL;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = "API_ERROR"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Not signed in with Cognito, or Cognito is not configured locally.
  }

  if (!headers.Authorization && isLocalAuthMode() && hasLocalAuthSession()) {
    headers["x-user-id"] = LOCAL_DEV_USER_ID;
  }

  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
    ...(await authHeaders()),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error
        ? `Could not reach the RentVision API: ${error.message}`
        : "Could not reach the RentVision API",
      0,
      "NETWORK_ERROR"
    );
  }

  const text = await response.text();
  let payload: ApiResponse<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new ApiError(
      payload?.error?.message || `Request failed (${response.status})`,
      response.status,
      payload?.error?.code || "REQUEST_FAILED"
    );
  }

  return payload.data;
}

function requireConfiguredApi(): void {
  if (isMockMode()) {
    throw new ApiError(
      "The RentVision API is not configured. Set NEXT_PUBLIC_API_BASE_URL to use the landlord portal.",
      0,
      "API_NOT_CONFIGURED"
    );
  }
}

export function listListings(): Promise<{ items: Listing[]; count: number }> {
  if (isMockMode()) return Promise.resolve({ items: MOCK_LISTINGS, count: MOCK_LISTINGS.length });
  return request("/listings");
}

export function getListing(id: string): Promise<Listing> {
  if (isMockMode()) {
    const found = MOCK_LISTINGS.find((l) => l.listingId === id);
    if (found) return Promise.resolve(found);
    return Promise.reject(new Error("Property not found"));
  }
  return request(`/listings/${encodeURIComponent(id)}`);
}

export function listMyListings(): Promise<MyListingsResponse> {
  requireConfiguredApi();
  return request("/listings/mine");
}

export function createListing(input: CreateListingInput): Promise<Listing> {
  requireConfiguredApi();
  return request("/listings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateListing(
  listingId: string,
  input: UpdateListingInput
): Promise<Listing> {
  requireConfiguredApi();
  return request(`/listings/${encodeURIComponent(listingId)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function requestUploadUrl(input: {
  listingId: string;
  fileName: string;
  mediaType: "photo" | "panorama" | "document";
  contentType: string;
}): Promise<MediaUploadUrl> {
  requireConfiguredApi();
  return request("/media/upload-url", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadFileToUrl(
  uploadUrl: string,
  file: File
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new ApiError(
      `Upload failed (${response.status}). The upload link may have expired.`,
      response.status,
      "UPLOAD_FAILED"
    );
  }
}

export function registerImage(
  listingId: string,
  s3Key: string
): Promise<AddImageResponse> {
  requireConfiguredApi();
  return request(`/listings/${encodeURIComponent(listingId)}/images`, {
    method: "POST",
    body: JSON.stringify({ s3Key }),
  });
}

export function searchListings(
  params: ListingSearchQuery
): Promise<ListingSearchResponse> {
  if (isMockMode()) {
    let items = [...MOCK_LISTINGS];
    if (params.bedrooms !== undefined)
      items = items.filter((l) => l.bedrooms === params.bedrooms);
    if (params.minPrice !== undefined)
      items = items.filter((l) => l.price >= (params.minPrice as number));
    if (params.maxPrice !== undefined)
      items = items.filter((l) => l.price <= (params.maxPrice as number));
    if (params.propertyType)
      items = items.filter((l) => l.propertyType === params.propertyType?.toLowerCase());
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 12;
    const page = items.slice(offset, offset + limit);
    return Promise.resolve({ items: page, count: items.length });
  }

  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set("lat", String(params.lat));
  if (params.lng !== undefined) query.set("lng", String(params.lng));
  if (params.radiusKm !== undefined) query.set("radiusKm", String(params.radiusKm));
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.bedrooms !== undefined) query.set("bedrooms", String(params.bedrooms));
  if (params.propertyType) query.set("propertyType", params.propertyType);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));

  return request(`/listings/search?${query.toString()}`);
}

export function getDownloadUrl(fileKey: string): Promise<{ downloadUrl: string; expiresIn: number }> {
  return request(`/media/download-url?fileKey=${encodeURIComponent(fileKey)}`);
}

export function askLeaseQuestion(
  listingId: string,
  question: string
): Promise<LeaseQAResponse> {
  return request(`/leases/${listingId}/qa`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
