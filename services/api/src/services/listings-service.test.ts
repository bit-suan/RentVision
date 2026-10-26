import { describe, expect, it } from "@jest/globals";
import type { Listing } from "../../../../shared/contracts/listings";
import { InMemoryListingsRepository } from "../repositories/in-memory-listings-repository";
import { ApiError } from "../utils/errors";
import { ListingsService } from "./listings-service";

const input = {
  title: "2-bedroom near Bole",
  description: "Sunny apartment",
  price: 15000,
  bedrooms: 2,
  address: "Bole, Addis Ababa",
  lat: 9.0054,
  lng: 38.7636,
  panoramas: [],
};

describe("ListingsService", () => {
  it("creates a listing for an authenticated user", async () => {
    const service = new ListingsService(new InMemoryListingsRepository());
    const result = await service.createListing(input, { userId: "owner-1" });

    expect(result.ownerId).toBe("owner-1");
    expect(result.status).toBe("approved");
    expect(result.listingId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects unauthenticated creation", async () => {
    const service = new ListingsService(new InMemoryListingsRepository());

    await expect(service.createListing(input, {})).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      statusCode: 401,
    });
  });

  it("allows only the owner or admin to update a listing", async () => {
    const listing: Listing = {
      listingId: "listing-1",
      ownerId: "owner-1",
      status: "approved",
      ...input,
      images: [],
      createdAt: "2026-10-24T10:00:00.000Z",
      updatedAt: "2026-10-24T10:00:00.000Z",
    };
    const service = new ListingsService(
      new InMemoryListingsRepository([listing]),
    );

    await expect(
      service.updateListing("listing-1", { price: 2 }, { userId: "other" }),
    ).rejects.toBeInstanceOf(ApiError);

    const updated = await service.updateListing(
      "listing-1",
      { price: 16000 },
      { userId: "owner-1" },
    );
    expect(updated.price).toBe(16000);
  });

  it("allows an owner to add an image", async () => {
    const listing: Listing = {
      listingId: "listing-1",
      ownerId: "owner-1",
      status: "approved",
      ...input,
      images: [],
      createdAt: "2026-10-24T10:00:00.000Z",
      updatedAt: "2026-10-24T10:00:00.000Z",
    };
    const service = new ListingsService(
      new InMemoryListingsRepository([listing]),
    );

    const updated = await service.addImage(
      "listing-1",
      "images/example.jpg",
      { userId: "owner-1" },
    );

    expect(updated.images).toHaveLength(1);
    expect(updated.images[0].s3Key).toBe("images/example.jpg");
  });
});
