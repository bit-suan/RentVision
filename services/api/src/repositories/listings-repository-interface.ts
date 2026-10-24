import type {
  Listing,
  ListingSearchQuery,
} from "../../../../shared/contracts/listings";

export interface ListingsRepositoryInterface {
  getById(listingId: string): Promise<Listing | undefined>;

  create(listing: Listing): Promise<void>;

  update(
    listingId: string,
    updates: Partial<Listing>,
  ): Promise<Listing>;

  updateStatus(
    listingId: string,
    status: Listing["status"],
  ): Promise<Listing>;

  findCandidates(
    query: ListingSearchQuery,
  ): Promise<Listing[]>;

  addImage(
    listingId: string,
    image: Listing["images"][number],
  ): Promise<Listing>;
}