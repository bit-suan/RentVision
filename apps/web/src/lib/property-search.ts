import type { Property, PropertyAvailability } from "@/lib/properties";

export type PropertySortOrder = "price-asc" | "price-desc";

export interface PropertySearchFilters {
  query?: string;
  location?: string;
  minimumPrice?: number;
  maximumPrice?: number;
  minimumBedrooms?: number;
  propertyType?: string;
  availability?: PropertyAvailability;
  sort?: PropertySortOrder;
}

export const PROPERTY_AVAILABILITIES: PropertyAvailability[] = [
  "AVAILABLE",
  "COMING_SOON",
  "OCCUPIED",
];

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getNonNegativeNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parsePropertySearchFilters(
  params: SearchParams,
): PropertySearchFilters {
  const query = getSingleValue(params.q).trim();
  const location = getSingleValue(params.location);
  const minimumPrice = getNonNegativeNumber(
    getSingleValue(params.minimumPrice),
  );
  const maximumPrice = getNonNegativeNumber(
    getSingleValue(params.maximumPrice),
  );
  const bedroomValue = getNonNegativeNumber(
    getSingleValue(params.minimumBedrooms),
  );
  const propertyType = getSingleValue(params.propertyType);
  const availabilityValue = getSingleValue(params.availability);
  const sortValue = getSingleValue(params.sort);

  return {
    query: query || undefined,
    location: location || undefined,
    minimumPrice,
    maximumPrice,
    minimumBedrooms:
      bedroomValue !== undefined && Number.isInteger(bedroomValue)
        ? bedroomValue
        : undefined,
    propertyType: propertyType || undefined,
    availability: PROPERTY_AVAILABILITIES.includes(
      availabilityValue as PropertyAvailability,
    )
      ? (availabilityValue as PropertyAvailability)
      : undefined,
    sort:
      sortValue === "price-asc" || sortValue === "price-desc"
        ? sortValue
        : undefined,
  };
}

export function searchProperties(
  properties: Property[],
  filters: PropertySearchFilters,
): Property[] {
  const query = filters.query?.toLocaleLowerCase();
  const filtered = properties.filter((property) => {
    const matchesQuery =
      !query ||
      [property.title, property.location, property.propertyType].some((value) =>
        value.toLocaleLowerCase().includes(query),
      );

    return (
      matchesQuery &&
      (!filters.location || property.location === filters.location) &&
      (filters.minimumPrice === undefined ||
        property.price >= filters.minimumPrice) &&
      (filters.maximumPrice === undefined ||
        property.price <= filters.maximumPrice) &&
      (filters.minimumBedrooms === undefined ||
        property.bedrooms >= filters.minimumBedrooms) &&
      (!filters.propertyType || property.propertyType === filters.propertyType) &&
      (!filters.availability || property.availability === filters.availability)
    );
  });

  if (filters.sort === "price-asc") {
    return filtered.sort((a, b) => a.price - b.price);
  }
  if (filters.sort === "price-desc") {
    return filtered.sort((a, b) => b.price - a.price);
  }
  return filtered;
}
