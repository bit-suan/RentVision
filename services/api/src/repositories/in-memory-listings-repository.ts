import type {
  Listing,
  ListingSearchQuery,
} from "../../../../shared/contracts/listings";

import type { ListingsRepositoryInterface } from "./listings-repository-interface";

export class InMemoryListingsRepository
  implements ListingsRepositoryInterface
{
  private readonly listings = new Map<string, Listing>();

  constructor(initialListings: Listing[] = []) {
    for (const listing of initialListings) {
      this.listings.set(listing.listingId, listing);
    }
  }

  clear(): void {
    this.listings.clear();
  }

  async getById(
    listingId: string,
  ): Promise<Listing | undefined> {
    return this.listings.get(listingId);
  }

  async create(listing: Listing): Promise<void> {
    if (this.listings.has(listing.listingId)) {
      throw new Error("Listing already exists");
    }

    this.listings.set(listing.listingId, listing);
  }

  async update(
    listingId: string,
    updates: Partial<Listing>,
  ): Promise<Listing> {
    const existing = this.listings.get(listingId);

    if (!existing) {
      throw new Error("Listing not found");
    }

    const updatedListing: Listing = {
      ...existing,
      ...updates,
      listingId: existing.listingId,
      ownerId: existing.ownerId,
      updatedAt: new Date().toISOString(),
    };

    this.listings.set(listingId, updatedListing);

    return updatedListing;
  }

  async updateStatus(
    listingId: string,
    status: Listing["status"],
  ): Promise<Listing> {
    return this.update(listingId, { status });
  }

  async findCandidates(
    _query: ListingSearchQuery,
  ): Promise<Listing[]> {
    return [...this.listings.values()];
  }

  async addImage(
    listingId: string,
    image: Listing["images"][number],
  ): Promise<Listing> {
    const existing = this.listings.get(listingId);

    if (!existing) {
      throw new Error("Listing not found");
    }

    return this.update(listingId, {
      images: [...existing.images, image],
    });
  }
}