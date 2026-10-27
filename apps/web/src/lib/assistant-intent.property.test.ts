import * as fc from "fast-check";
import type { Listing } from "./types";
import {
  buildPropertiesHref,
  classifyAssistantIntent,
  filterAvailableListings,
  listingDetailHref,
  listingLeaseHref,
  parsePropertySearchQuery,
  toAssistantListingCard,
} from "./assistant-intent";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    listingId: "listing-1",
    title: "Bright apartment in Bole",
    description: "Two bedroom home close to shops and transport.",
    price: 30_000,
    currency: "ETB",
    propertyType: "apartment",
    status: "active",
    latitude: 8.9951,
    longitude: 38.7884,
    geohash: "sc",
    address: {
      street: "Bole Road",
      city: "Addis Ababa",
      subcity: "Bole",
      woreda: "03",
    },
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 80,
    amenities: ["Generator"],
    mediaKeys: [],
    panoramaKeys: [],
    landlordId: "landlord-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("assistant intent classification", () => {
  it.each([
    ["Hello", "greeting"],
    ["ሰላም", "greeting"],
    ["Find a 2-bedroom apartment in Bole under 30,000 ETB", "property_search"],
    ["I need a house in Bole", "property_search"],
    ["Show me rentals", "property_search"],
    ["How does RentVision verify listings?", "trust"],
    ["Is this listing safe?", "trust"],
    ["Can I ask questions about my lease?", "lease"],
    ["I need help with my lease", "lease"],
    ["What does the deposit clause say?", "lease"],
    ["What can you help me with?", "platform_help"],
    ["I need help", "platform_help"],
    ["What is the capital of Ethiopia?", "general"],
  ] as const)("classifies %s as %s", (message, expected) => {
    expect(classifyAssistantIntent(message)).toBe(expected);
  });

  it("prefers property search when trust words appear in a search request", () => {
    expect(classifyAssistantIntent("I need a safe apartment in Bole")).toBe(
      "property_search"
    );
  });
});

describe("assistant property query parsing", () => {
  it("extracts neighborhood, budget, bedrooms, and property type", () => {
    expect(
      parsePropertySearchQuery(
        "Find a 2-bedroom apartment in Bole under 30,000 ETB"
      )
    ).toEqual({
      neighborhood: "Bole",
      maxPrice: 30_000,
      minBedrooms: 2,
      propertyType: "apartment",
    });
  });

  it("extracts a between range and shorthand amounts", () => {
    expect(
      parsePropertySearchQuery("Show villas between 20k and 35k")
    ).toMatchObject({
      minPrice: 20_000,
      maxPrice: 35_000,
      propertyType: "villa",
    });
  });

  it("extracts a studio in a neighborhood without coordinates", () => {
    expect(parsePropertySearchQuery("studio in CMC")).toMatchObject({
      neighborhood: "CMC",
      propertyType: "studio",
    });
  });

  it("returns an empty query when no filters are present", () => {
    expect(parsePropertySearchQuery("Show me available rentals")).toEqual({});
  });
});

describe("assistant listing filtering", () => {
  it("keeps only published or available listings", () => {
    const listings = [
      makeListing({ listingId: "approved", status: "approved" }),
      makeListing({ listingId: "active", status: "active" }),
      makeListing({ listingId: "available", status: "available" }),
      makeListing({ listingId: "pending", status: "pending" }),
      makeListing({ listingId: "rented", status: "rented" }),
      makeListing({ listingId: "rejected", status: "rejected" }),
    ];

    expect(
      filterAvailableListings(listings, {}).map((listing) => listing.listingId)
    ).toEqual(["approved", "active", "available"]);
  });

  it("applies price, bedroom, type, and neighborhood filters", () => {
    const listings = [
      makeListing({ listingId: "match" }),
      makeListing({ listingId: "expensive", price: 80_000 }),
      makeListing({ listingId: "small", bedrooms: 1 }),
      makeListing({ listingId: "house", propertyType: "house" }),
      makeListing({
        listingId: "elsewhere",
        title: "Apartment in CMC",
        description: "Two bedroom home in CMC.",
        address: {
          street: "CMC Road",
          city: "Addis Ababa",
          subcity: "CMC",
          woreda: "01",
        },
      }),
    ];

    const matches = filterAvailableListings(listings, {
      neighborhood: "Bole",
      maxPrice: 50_000,
      minBedrooms: 2,
      propertyType: "apartment",
    });

    expect(matches.map((listing) => listing.listingId)).toEqual(["match"]);
  });

  it("never invents results when nothing matches", () => {
    expect(
      filterAvailableListings([makeListing()], { neighborhood: "Ayat" })
    ).toEqual([]);
  });

  it("always respects published status and price limits", () => {
    const listingArb = fc
      .record({
        price: fc.integer({ min: 0, max: 200_000 }),
        bedrooms: fc.integer({ min: 0, max: 6 }),
        status: fc.constantFrom(
          "approved",
          "active",
          "available",
          "pending",
          "rented",
          "rejected"
        ),
        propertyType: fc.constantFrom(
          "apartment",
          "house",
          "studio",
          "villa",
          "commercial"
        ),
        neighborhood: fc.constantFrom("Bole", "CMC", "Kazanchis", "Sar Bet"),
      })
      .map((values) =>
        makeListing({
          price: values.price,
          bedrooms: values.bedrooms,
          status: values.status,
          propertyType: values.propertyType,
          address: {
            street: `${values.neighborhood} Road`,
            city: "Addis Ababa",
            subcity: values.neighborhood,
            woreda: "01",
          },
        })
      );

    fc.assert(
      fc.property(
        fc.array(listingArb, { maxLength: 20 }),
        fc.integer({ min: 1_000, max: 100_000 }),
        (listings, maxPrice) => {
          const filtered = filterAvailableListings(listings, {
            maxPrice,
            minBedrooms: 2,
          });

          return filtered.every((listing) => {
            const status = listing.status.toLocaleLowerCase();
            return (
              (status === "approved" ||
                status === "active" ||
                status === "available") &&
              listing.price <= maxPrice &&
              listing.bedrooms >= 2
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("assistant route and card helpers", () => {
  it("builds a map-backed href for neighborhoods with coordinates", () => {
    const href = buildPropertiesHref({
      neighborhood: "Bole",
      minBedrooms: 2,
      maxPrice: 40_000,
    });
    const params = new URL(href, "https://rentvision.test").searchParams;

    expect(params.get("lat")).toBe("8.9951");
    expect(params.get("lng")).toBe("38.7884");
    expect(params.get("radiusKm")).toBe("5");
    expect(params.get("bedrooms")).toBe("2");
    expect(params.get("maxPrice")).toBe("40000");
  });

  it("falls back to a text query for neighborhoods without coordinates", () => {
    expect(buildPropertiesHref({ neighborhood: "CMC" })).toBe(
      "/properties?q=CMC"
    );
  });

  it("uses the property detail route for demo listings", () => {
    const listing = makeListing({ listingId: "property-001" });
    expect(listingDetailHref(listing, true)).toBe("/properties/property-001");
    expect(listingDetailHref(listing, false)).toBe("/listings/property-001");
  });

  it("uses the matching lease flow and encodes listing ids", () => {
    expect(listingLeaseHref("property 001", true)).toBe(
      "/properties/property%20001/lease"
    );
    expect(listingLeaseHref("listing 001", false)).toBe(
      "/listings/listing%20001/lease"
    );
  });

  it("converts a listing into an honest card without inventing fields", () => {
    const card = toAssistantListingCard(makeListing(), true);

    expect(card).toMatchObject({
      listingId: "listing-1",
      title: "Bright apartment in Bole",
      price: 30_000,
      currency: "ETB",
      bedrooms: 2,
      bathrooms: 1,
      location: "Bole Road, Bole, Addis Ababa",
      propertyType: "apartment",
      detailHref: "/properties/listing-1",
      leaseHref: "/properties/listing-1/lease",
      isDemo: true,
    });
  });

  it("links real listings to the real listing and lease routes", () => {
    const card = toAssistantListingCard(makeListing(), false);

    expect(card.detailHref).toBe("/listings/listing-1");
    expect(card.leaseHref).toBe("/listings/listing-1/lease");
    expect(card.isDemo).toBe(false);
  });
});
