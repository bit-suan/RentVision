export type ListingStatus = "approved" | "pending" | "rejected";
export interface Hotspot {
    id: string;
    label: string;
    yaw: number;
    pitch: number;
    targetPanoramaId: string;
}
export interface Panorama {
    id: string;
    s3Key: string;
    label: string;
    hotspots: Hotspot[];
}
export interface Listing {
    listingId: string;
    ownerId: string;
    status: ListingStatus;
    title: string;
    description: string;
    price: number;
    bedrooms: number;
    address: string;
    lat: number;
    lng: number;
    panoramas: Panorama[];
    images: Array<{
        s3Key: string;
        sha256?: string;
        phash?: string;
        addedAt?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}
export interface ListingSearchQuery {
    lat?: number;
    lng?: number;
    radiusKm: number;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    limit: number;
    offset: number;
    mine: boolean;
}
export interface ListingSearchResult {
    listingId: string;
    title: string;
    price: number;
    bedrooms: number;
    address: string;
    lat: number;
    lng: number;
    status: ListingStatus;
    hasPanorama: boolean;
    distanceKm?: number;
}
export interface ListingSearchResponse {
    total: number;
    count: number;
    limit: number;
    offset: number;
    center: {
        lat: number;
        lng: number;
        radiusKm: number;
    } | null;
    results: ListingSearchResult[];
}
