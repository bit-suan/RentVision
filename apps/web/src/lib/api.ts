import type {
  ApiResponse,
  LeaseQAResponse,
  Listing,
  ListingSearchQuery,
  ListingSearchResponse,
} from "./types";
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };

  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // Not signed in, proceed without token
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401) {
    // Potential session expiry, could trigger a redirect or refresh here
    // For now, let the error propagate
  }

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error?.message || `Request failed: ${path}`);
  }
  return payload.data;
}

export function listListings(): Promise<{ items: Listing[]; count: number }> {
  return request("/listings");
}

export function getListing(id: string): Promise<Listing> {
  return request(`/listings/${id}`);
}

export function searchListings(
  params: ListingSearchQuery
): Promise<ListingSearchResponse> {
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
