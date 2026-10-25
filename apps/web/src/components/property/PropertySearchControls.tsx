"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { PropertySearchFilters } from "@/lib/property-search";
import { PROPERTY_AVAILABILITIES } from "@/lib/property-search";
import { formatPropertyAvailability } from "@/lib/property-formatting";

interface PropertySearchControlsProps {
  filters: PropertySearchFilters;
  locations: string[];
  propertyTypes: string[];
}

export default function PropertySearchControls({
  filters,
  locations,
  propertyTypes,
}: PropertySearchControlsProps) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim()) {
        params.set(key, value.trim());
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `/properties?${queryString}` : "/properties");
  }

  function clearFilters() {
    router.push("/properties");
  }

  return (
    <form className="property-search-panel" onSubmit={handleSubmit}>
      <div className="property-search-panel__query">
        <Input
          defaultValue={filters.query ?? ""}
          id="property-query"
          label="Search by keyword or location"
          name="q"
          placeholder="Try Bole or apartment"
        />
        <Button type="submit">Search</Button>
      </div>

      <fieldset className="property-filter-grid">
        <legend>Filter properties</legend>
        <Select
          defaultValue={filters.location ?? ""}
          id="property-location"
          label="Location"
          name="location"
          options={[
            { label: "Any location", value: "" },
            ...locations.map((location) => ({ label: location, value: location })),
          ]}
        />
        <Input
          defaultValue={filters.minimumPrice ?? ""}
          id="property-minimum-price"
          label="Minimum price (ETB/month)"
          min={0}
          name="minimumPrice"
          type="number"
        />
        <Input
          defaultValue={filters.maximumPrice ?? ""}
          id="property-maximum-price"
          label="Maximum price (ETB/month)"
          min={0}
          name="maximumPrice"
          type="number"
        />
        <Select
          defaultValue={filters.minimumBedrooms?.toString() ?? ""}
          id="property-bedrooms"
          label="Bedrooms"
          name="minimumBedrooms"
          options={[
            { label: "Any bedrooms", value: "" },
            ...[1, 2, 3, 4].map((count) => ({
              label: `${count}+ bedrooms`,
              value: count.toString(),
            })),
          ]}
        />
        <Select
          defaultValue={filters.propertyType ?? ""}
          id="property-type"
          label="Property type"
          name="propertyType"
          options={[
            { label: "Any type", value: "" },
            ...propertyTypes.map((propertyType) => ({
              label: propertyType,
              value: propertyType,
            })),
          ]}
        />
        <Select
          defaultValue={filters.availability ?? ""}
          id="property-availability"
          label="Availability"
          name="availability"
          options={[
            { label: "Any availability", value: "" },
            ...PROPERTY_AVAILABILITIES.map((availability) => ({
              label: formatPropertyAvailability(availability),
              value: availability,
            })),
          ]}
        />
        <Select
          defaultValue={filters.sort ?? ""}
          id="property-sort"
          label="Sort by price"
          name="sort"
          options={[
            { label: "Recommended", value: "" },
            { label: "Price: low to high", value: "price-asc" },
            { label: "Price: high to low", value: "price-desc" },
          ]}
        />
      </fieldset>

      <div className="property-search-panel__actions">
        <Button onClick={clearFilters} type="button" variant="quiet">
          Clear filters
        </Button>
      </div>
    </form>
  );
}
