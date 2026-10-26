import { describe, expect, it } from "@jest/globals";
import type { Listing } from "../../../../shared/contracts/listings";
import { distanceKm, searchListings } from "./geospatial-search";

const listing = (overrides: Partial<Listing> = {}): Listing => ({
  listingId: "listing-1",
  ownerId: "owner-1",
  status: "approved",
  title: "Test listing",
  description: "A test listing",
  price: 1000,
  bedrooms: 2,
  address: "Bole",
  lat: 9,
  lng: 38,
  panoramas: [],
  images: [],
  createdAt: "2026-10-24T10:00:00.000Z",
  updatedAt: "2026-10-24T10:00:00.000Z",
  ...overrides,
});

describe("geospatial search", () => {
  it("returns zero distance for the same point", () => {
    expect(distanceKm({ lat: 9, lng: 38 }, { lat: 9, lng: 38 })).toBe(0);
  });

  it("filters by radius and sorts nearest first", () => {
    const result = searchListings(
      [
        listing({ listingId: "far", lat: 9.1, lng: 38.1 }),
        listing({ listingId: "near", lat: 9.001, lng: 38.001 }),
      ],
      { lat: 9, lng: 38, radiusKm: 5, limit: 20, offset: 0, mine: false },
    );

    expect(result.results.map((item) => item.listingId)).toEqual(["near"]);
    expect(result.results[0].distanceKm).toBeDefined();
  });

  it("hides pending listings from public search but allows the owner", () => {
    const pending = listing({ status: "pending", ownerId: "owner-1" });
    const query = { radiusKm: 5, limit: 20, offset: 0, mine: false };

    expect(searchListings([pending], query).total).toBe(0);
    expect(searchListings([pending], query, { userId: "owner-1" }).total).toBe(1);
  });

  it("applies pagination and returns total separately from count", () => {
    const listings = Array.from({ length: 3 }, (_, index) =>
      listing({
        listingId: `listing-${index}`,
        createdAt: `2026-10-24T1${index}:00:00.000Z`,
      }),
    );

    const result = searchListings(listings, {
      radiusKm: 5,
      limit: 2,
      offset: 1,
      mine: false,
    });

    expect(result.total).toBe(3);
    expect(result.count).toBe(2);
  });
});
