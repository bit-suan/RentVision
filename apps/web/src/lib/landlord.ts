import type { Address, Listing, PropertyType } from "./types";

export type { Address } from "./types";

export const LISTING_DRAFT_KEY = "rentvision.landlordDraft.v1";
export const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
export const MAX_PHOTOS = 20;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface ListingFormState {
  title: string;
  description: string;
  price: string;
  currency: "ETB" | "USD";
  propertyType: PropertyType;
  address: Address;
  latitude: string;
  longitude: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  amenities: string[];
}

export interface ValidationResult {
  error?: string;
  warning?: string;
}

export const EMPTY_LISTING_FORM: ListingFormState = {
  title: "",
  description: "",
  price: "",
  currency: "ETB",
  propertyType: "apartment",
  address: {
    street: "",
    city: "Addis Ababa",
    subcity: "",
    woreda: "",
  },
  latitude: "9.010793",
  longitude: "38.761252",
  bedrooms: "1",
  bathrooms: "1",
  areaSqm: "",
  amenities: [],
};

export const COMMON_AMENITIES = [
  "parking",
  "generator",
  "water-tank",
  "fiber",
  "security",
  "elevator",
  "balcony",
  "garden",
  "furnished",
  "gym",
] as const;

export function listingToForm(listing: Listing): ListingFormState {
  return {
    title: listing.title,
    description: listing.description,
    price: String(listing.price),
    currency: listing.currency,
    propertyType: listing.propertyType,
    address: {
      street: listing.address?.street ?? "",
      city: listing.address?.city ?? "Addis Ababa",
      subcity: listing.address?.subcity ?? "",
      woreda: listing.address?.woreda ?? "",
    },
    latitude: String(listing.latitude),
    longitude: String(listing.longitude),
    bedrooms: String(listing.bedrooms),
    bathrooms: String(listing.bathrooms),
    areaSqm: String(listing.areaSqm ?? ""),
    amenities: listing.amenities ?? [],
  };
}

export function loadListingDraft(): ListingFormState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LISTING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListingFormState>;
    return {
      ...EMPTY_LISTING_FORM,
      ...parsed,
      address: {
        ...EMPTY_LISTING_FORM.address,
        ...(parsed.address ?? {}),
      },
      amenities: Array.isArray(parsed.amenities) ? parsed.amenities : [],
    };
  } catch {
    return null;
  }
}

export function saveListingDraft(form: ListingFormState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LISTING_DRAFT_KEY, JSON.stringify(form));
  } catch {
    // Storage can be unavailable in private mode; the in-memory form still works.
  }
}

export function clearListingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LISTING_DRAFT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function validatePhoto(file: File): ValidationResult {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { error: "unsupported-type" };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "too-large" };
  }
  return {};
}

function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    image.src = url;
  });
}

/**
 * Checks the parts of a 360° upload we can verify in the browser. An exact 2:1
 * aspect ratio is required for equirectangular images, but this can never prove
 * that a photo is a genuine 360° capture.
 */
export async function validatePanoramaImage(
  file: File
): Promise<ValidationResult> {
  const photoResult = validatePhoto(file);
  if (photoResult.error) return photoResult;

  try {
    const { width, height } = await readImageDimensions(file);
    const ratio = width / height;
    if (ratio < 1.9 || ratio > 2.1) {
      return { error: "not-equirectangular" };
    }
    if (width < 2048) {
      return { warning: "low-resolution" };
    }
  } catch {
    return { error: "unreadable" };
  }

  return {};
}

export function normalizeStatus(
  status: string
): "approved" | "pending" | "rejected" | "other" {
  if (status === "approved" || status === "pending" || status === "rejected") {
    return status;
  }
  if (status === "active") return "approved";
  return "other";
}

export function statusTone(
  status: string
): "success" | "warning" | "danger" | "neutral" {
  switch (normalizeStatus(status)) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}

export function formatListingAddress(listing: Listing): string {
  return [
    listing.address?.street,
    listing.address?.subcity,
    listing.address?.city,
  ]
    .filter(Boolean)
    .join(", ");
}

export function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function isPositiveInteger(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}
