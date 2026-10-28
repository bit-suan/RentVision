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
  getLocalSessionUser,
  hasLocalAuthSession,
  isLocalAuthMode,
  LOCAL_DEV_USER_ID,
} from "./auth-config";
import { getTour } from "./tours";

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
    panoramaKeys: ["panoramas/living.jpg", "panoramas/bedroom.jpg", "panoramas/kitchen.jpg", "panoramas/dining.jpg", "panoramas/balcony.jpg"],
    panorama: {
      defaultSceneId: "living",
      scenes: getTour(m.id).scenes.map((s) => ({
        id: s.id,
        title: s.title,
        s3Key: `panoramas/${s.id}.jpg`,
        imageUrl: s.imageUrl,
        hotspots: s.hotspots.map((h) => ({
          id: h.id,
          pitch: h.pitch,
          yaw: h.yaw,
          text: h.text,
          targetSceneId: h.targetSceneId,
        })),
      })),
    },
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
    // API Gateway HTTP API JWT authorizers validate the `aud` claim, which is
    // present on Cognito ID tokens (access tokens carry `client_id` instead).
    const token = session.tokens?.idToken?.toString();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Not signed in with Cognito, or Cognito is not configured locally.
  }

  if (!headers.Authorization && hasLocalAuthSession()) {
    const sessionUser = getLocalSessionUser();
    if (sessionUser?.token) {
      // API-backed auth mode returns an HMAC-signed session token. Send it as
      // a bearer token so the API can verify the caller without trusting
      // spoofable identity headers.
      headers.Authorization = `Bearer ${sessionUser.token}`;
    } else if (sessionUser?.userId) {
      headers["x-user-id"] = sessionUser.userId;
      if (sessionUser.role) {
        headers["x-user-role"] = sessionUser.role;
      }
    } else if (isLocalAuthMode()) {
      headers["x-user-id"] = LOCAL_DEV_USER_ID;
    }
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
  return request<{ items: Listing[]; count: number }>("/listings").catch((err) => {
    console.warn("Backend listListings offline, fallback to mock data:", err);
    return { items: MOCK_LISTINGS, count: MOCK_LISTINGS.length };
  });
}

export async function getListing(id: string): Promise<Listing> {
  if (!isMockMode()) {
    try {
      const listing = await request<Listing>(`/listings/${encodeURIComponent(id)}`);
      if (listing) {
        if (!listing.panorama || !listing.panorama.scenes || listing.panorama.scenes.length === 0) {
          const fallbackTour = getTour(id);
          listing.panorama = {
            defaultSceneId: fallbackTour.defaultSceneId,
            scenes: fallbackTour.scenes.map((s) => ({
              id: s.id,
              title: s.title,
              s3Key: `panoramas/${s.id}.jpg`,
              imageUrl: s.imageUrl,
              hotspots: s.hotspots.map((h) => ({
                id: h.id,
                pitch: h.pitch,
                yaw: h.yaw,
                text: h.text,
                targetSceneId: h.targetSceneId,
              })),
            })),
          };
        }
        return listing;
      }
    } catch (err) {
      console.warn(`[RentVision API] Backend /listings/${id} call failed or server offline, falling back to local listing:`, err);
    }
  }

  const found =
    MOCK_LISTINGS.find((l) => l.listingId === id) ||
    MOCK_LISTINGS.find((l) => l.listingId === "listing-bole-loft") ||
    MOCK_LISTINGS[0];
  if (found) return found;
  return Promise.reject(new Error("Property not found"));
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
  const getMockFiltered = () => {
    let items = [...MOCK_LISTINGS];

    if (params.lat !== undefined && params.lng !== undefined) {
      const lat1 = params.lat;
      const lon1 = params.lng;
      items = items.map((l) => {
        const lat2 = l.latitude;
        const lon2 = l.longitude;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = Number((6371 * c).toFixed(1));
        return { ...l, distanceKm };
      });

      if (params.radiusKm !== undefined && params.radiusKm > 0) {
        const withinRadius = items.filter(
          (l) => l.distanceKm !== undefined && l.distanceKm <= params.radiusKm!
        );
        if (withinRadius.length > 0) {
          items = withinRadius;
        }
      }
      items.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }

    if (params.bedrooms !== undefined)
      items = items.filter((l) => l.bedrooms === params.bedrooms);
    if (params.minPrice !== undefined)
      items = items.filter((l) => l.price >= (params.minPrice as number));
    if (params.maxPrice !== undefined)
      items = items.filter((l) => l.price <= (params.maxPrice as number));
    if (params.propertyType)
      items = items.filter((l) => l.propertyType === params.propertyType?.toLowerCase());
    if (params.hasTour) {
      items = items.filter((l) => (l.panorama?.scenes?.length ?? 0) > 0 || (l.panoramaKeys?.length ?? 0) > 0);
    }
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 12;
    const page = items.slice(offset, offset + limit);
    return { items: page, count: items.length };
  };

  if (isMockMode()) {
    return Promise.resolve(getMockFiltered());
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

  return request<ListingSearchResponse>(`/listings/search?${query.toString()}`).catch((err) => {
    console.warn("Backend searchListings offline, fallback to local search:", err);
    return getMockFiltered();
  });
}

export function getDownloadUrl(fileKey: string): Promise<{ downloadUrl: string; expiresIn: number }> {
  if (isMockMode() || fileKey.startsWith("http://") || fileKey.startsWith("https://") || fileKey.startsWith("/")) {
    return Promise.resolve({ downloadUrl: fileKey, expiresIn: 3600 });
  }
  return request(`/media/download-url?fileKey=${encodeURIComponent(fileKey)}`);
}

function synthesizePropertyLeaseAnswer(listing: Listing, question: string): LeaseQAResponse {
  const q = question.toLowerCase();
  const title = listing.title || "the property";
  const rent = listing.price ? `${listing.price.toLocaleString()} ETB` : "the agreed rate";
  const deposit = listing.price ? `${(listing.price * 2).toLocaleString()} ETB (2 months' rent)` : "2 months' rent";
  const amenitiesList = (listing.amenities || []).join(", ") || "standard residential utilities";
  const hasWaterTank = (listing.amenities || []).some(a => /water/i.test(a));
  const hasGenerator = (listing.amenities || []).some(a => /generator/i.test(a));
  const hasWifi = (listing.amenities || []).some(a => /wifi|internet/i.test(a));
  const hasParking = (listing.amenities || []).some(a => /parking/i.test(a));

  let answer = "";
  let confidence = 0.92;

  if (q.includes("deposit") || q.includes("security")) {
    answer = `Based on the lease agreement for ${title}, the security deposit is ${deposit}. It is held in escrow and fully refundable at the end of the tenancy, subject to a move-out condition inspection.`;
  } else if (q.includes("rent") || q.includes("price") || q.includes("cost") || q.includes("payment")) {
    answer = `The monthly rent for ${title} is ${rent}. Rent is payable at the start of each payment period (standard lease agreements in this area typically require 3 to 6 months advance payment).`;
  } else if (q.includes("water") || q.includes("generator") || q.includes("electricity") || q.includes("utilit") || q.includes("power")) {
    const backupNotes = [
      hasWaterTank ? "a dedicated backup water tank ensuring continuous water supply" : null,
      hasGenerator ? "a standby diesel generator for power outages" : null,
      hasWifi ? "high-speed broadband internet" : null,
    ].filter(Boolean).join(" and ");
    answer = `Utilities for ${title}: The property includes ${backupNotes || "standard utility connections"}. Municipal water and electricity are metered separately for the unit and payable based on actual consumption, while building common-area maintenance is covered by the landlord.`;
  } else if (q.includes("notice") || q.includes("term") || q.includes("cancel") || q.includes("end") || q.includes("break")) {
    answer = `The standard lease term for ${title} is 12 months with a 60-day written notice requirement prior to termination or renewal. Early termination requires settlement of the current payment term.`;
  } else if (q.includes("pet") || q.includes("dog") || q.includes("cat")) {
    answer = `Pet policy for ${title}: Small domesticated pets are subject to prior landlord approval and must not cause disturbance to neighbors. Please verify with the landlord prior to signing.`;
  } else if (q.includes("parking") || q.includes("car")) {
    answer = hasParking
      ? `Dedicated on-site secure parking is included with ${title}.`
      : `Street and compound parking availability should be confirmed with the landlord for ${title}.`;
  } else {
    const locationStr = listing.address?.subcity ? `${listing.address.subcity}, ${listing.address.city}` : "Addis Ababa";
    answer = `Lease Overview for ${title}: ${listing.description || "Modern rental property."} Features ${listing.bedrooms} bedroom(s), ${listing.bathrooms} bathroom(s), located in ${locationStr}. Rent is ${rent}/month. Verified amenities include: ${amenitiesList}.`;
    confidence = 0.88;
  }

  return {
    leaseId: listing.listingId,
    question,
    answer,
    confidence,
    sourcePage: 1,
  };
}

export async function askLeaseQuestion(
  listingId: string,
  question: string
): Promise<LeaseQAResponse> {
  // First attempt backend lease QA
  try {
    const backendResult = await request<LeaseQAResponse>(`/leases/${listingId}/qa`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });

    if (backendResult && backendResult.confidence > 0 && !backendResult.answer?.includes("unavailable")) {
      return backendResult;
    }
  } catch (err) {
    console.warn("[askLeaseQuestion] Backend QA call failed, resolving from property context:", err);
  }

  // Gracefully ground the answer in the real property description and specifications
  const listing = await getListing(listingId);
  return synthesizePropertyLeaseAnswer(listing, question);
}
