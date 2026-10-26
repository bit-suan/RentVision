import type { ApiResponse, LeaseQAResponse, Listing } from "./types";
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };

  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (error) {
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

export function searchListings(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  propertyType?: string;
}): Promise<{ items: Listing[]; count: number }> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radiusKm: String(params.radiusKm),
  });
  if (params.propertyType) {
    query.set("propertyType", params.propertyType);
  }
  return request(`/listings/search?${query.toString()}`);
}

export function askLeaseQuestion(
  listingId: string,
  question: string
): Promise<LeaseQAResponse> {
  return request(`/leases/lease-${listingId}/qa`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
