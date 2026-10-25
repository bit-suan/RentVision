import type {
  Hotspot,
  Panorama,
} from "../../../../shared/contracts/listings";

import {
  ApiError,
  type ValidationDetail,
} from "./errors";

export interface ListingInput {
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  address: string;
  lat: number;
  lng: number;
  panoramas?: Panorama[];
}

function addDetail(
  details: ValidationDetail[],
  path: string,
  message: string,
): void {
  details.push({ path, message });
}

export function validateListingInput(
  input: ListingInput,
): void {
  const details: ValidationDetail[] = [];

  if (!input.title || input.title.trim().length === 0) {
    addDetail(details, "title", "is required");
  }

  if (!input.description || input.description.trim().length === 0) {
    addDetail(details, "description", "is required");
  }

  if (!input.address || input.address.trim().length === 0) {
    addDetail(details, "address", "is required");
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    addDetail(details, "price", "must be greater than 0");
  }

  if (
    !Number.isInteger(input.bedrooms) ||
    input.bedrooms < 0
  ) {
    addDetail(
      details,
      "bedrooms",
      "must be a non-negative integer",
    );
  }

  if (
    !Number.isFinite(input.lat) ||
    input.lat < -90 ||
    input.lat > 90
  ) {
    addDetail(
      details,
      "lat",
      "must be between -90 and 90",
    );
  }

  if (
    !Number.isFinite(input.lng) ||
    input.lng < -180 ||
    input.lng > 180
  ) {
    addDetail(
      details,
      "lng",
      "must be between -180 and 180",
    );
  }

  const panoramas = input.panoramas ?? [];

  if (panoramas.length > 10) {
    addDetail(
      details,
      "panoramas",
      "cannot contain more than 10 panoramas",
    );
  }

  validatePanoramas(panoramas, details);

  if (details.length > 0) {
    throw new ApiError(
      "INVALID_LISTING",
      "One or more listing fields are invalid",
      400,
      details,
    );
  }
}

function validatePanoramas(
  panoramas: Panorama[],
  details: ValidationDetail[],
): void {
  const panoramaIds = new Set<string>();

  panoramas.forEach((panorama, panoramaIndex) => {
    if (panoramaIds.has(panorama.id)) {
      addDetail(
        details,
        `panoramas[${panoramaIndex}].id`,
        "must be unique",
      );
    }

    panoramaIds.add(panorama.id);

    if (panorama.hotspots.length > 20) {
      addDetail(
        details,
        `panoramas[${panoramaIndex}].hotspots`,
        "cannot contain more than 20 hotspots",
      );
    }
  });

  panoramas.forEach((panorama, panoramaIndex) => {
    const panoramaIdsSet = new Set(
      panoramas.map((item) => item.id),
    );

    panorama.hotspots.forEach(
      (hotspot: Hotspot, hotspotIndex: number) => {
        if (!panoramaIdsSet.has(hotspot.targetPanoramaId)) {
          addDetail(
            details,
            `panoramas[${panoramaIndex}].hotspots[${hotspotIndex}].targetPanoramaId`,
            "must reference a panorama in the same listing",
          );
        }
      },
    );
  });
}