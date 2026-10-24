import type {
  Listing,
  ListingStatus,
} from "../../../../shared/contracts/listings";

import type { ListingsRepositoryInterface } from "../repositories/listings-repository-interface";
const randomUUID = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value =
      character === "x" ? randomValue : (randomValue & 0x3) | 0x8;

    return value.toString(16);
  });

import {
  ApiError,
} from "../utils/errors";

import {
  canModifyListing,
  isAdmin,
  requireUser,
  type Actor,
} from "../utils/auth";

import {
  validateListingInput,
  type ListingInput,
} from "../utils/listing-validation";

export class ListingsService {
  constructor(
    private readonly repository: ListingsRepositoryInterface,
  ) {}

  async createListing(
    input: ListingInput,
    actor: Actor,
  ): Promise<Listing> {
    const ownerId = requireUser(actor);

    validateListingInput(input);

    const now = new Date().toISOString();

    const listing: Listing = {
      listingId: randomUUID(),
      ownerId,
      status: "approved",
      title: input.title.trim(),
      description: input.description.trim(),
      price: input.price,
      bedrooms: input.bedrooms,
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      panoramas: input.panoramas ?? [],
      images: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.create(listing);

    return listing;
  }

  async getListing(
    listingId: string,
    actor: Actor,
  ): Promise<Listing> {
    const listing = await this.repository.getById(listingId);

    if (!listing) {
      throw new ApiError(
        "LISTING_NOT_FOUND",
        "Listing not found",
        404,
      );
    }

    const canView =
      listing.status === "approved" ||
      listing.ownerId === actor.userId ||
      isAdmin(actor);

    if (!canView) {
      throw new ApiError(
        "LISTING_NOT_FOUND",
        "Listing not found",
        404,
      );
    }

    return listing;
  }

  async updateListing(
    listingId: string,
    updates: Partial<ListingInput>,
    actor: Actor,
  ): Promise<Listing> {
    const listing = await this.repository.getById(listingId);

    if (!listing) {
      throw new ApiError(
        "LISTING_NOT_FOUND",
        "Listing not found",
        404,
      );
    }

    if (!canModifyListing(listing.ownerId, actor)) {
      throw new ApiError(
        "FORBIDDEN",
        "You are not allowed to modify this listing",
        403,
      );
    }

    const mergedInput: ListingInput = {
      title: updates.title ?? listing.title,
      description: updates.description ?? listing.description,
      price: updates.price ?? listing.price,
      bedrooms: updates.bedrooms ?? listing.bedrooms,
      address: updates.address ?? listing.address,
      lat: updates.lat ?? listing.lat,
      lng: updates.lng ?? listing.lng,
      panoramas: updates.panoramas ?? listing.panoramas,
    };

    validateListingInput(mergedInput);

    return this.repository.update(listingId, mergedInput);
  }

  async updateStatus(
    listingId: string,
    status: ListingStatus,
    actor: Actor,
  ): Promise<Listing> {
    if (!isAdmin(actor)) {
      throw new ApiError(
        "FORBIDDEN",
        "Only admins can update listing status",
        403,
      );
    }

    const listing = await this.repository.getById(listingId);

    if (!listing) {
      throw new ApiError(
        "LISTING_NOT_FOUND",
        "Listing not found",
        404,
      );
    }

    return this.repository.updateStatus(listingId, status);
  }

  async addImage(
    listingId: string,
    s3Key: string,
    actor: Actor,
  ): Promise<Listing> {
    const listing = await this.repository.getById(listingId);

    if (!listing) {
      throw new ApiError(
        "LISTING_NOT_FOUND",
        "Listing not found",
        404,
      );
    }

    if (!canModifyListing(listing.ownerId, actor)) {
      throw new ApiError(
        "FORBIDDEN",
        "You are not allowed to modify this listing",
        403,
      );
    }

    if (!s3Key.trim()) {
      throw new ApiError(
        "INVALID_IMAGE",
        "s3Key is required",
        400,
      );
    }

    return this.repository.addImage(listingId, {
      s3Key: s3Key.trim(),
      addedAt: new Date().toISOString(),
    });
  }
}