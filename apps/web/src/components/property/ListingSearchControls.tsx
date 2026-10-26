"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { ListingSearchQuery } from "@/lib/types";

interface ListingSearchControlsProps {
  filters: ListingSearchQuery;
  onFilterChange: (filters: ListingSearchQuery) => void;
}

const NEIGHBORHOODS = [
  { label: "Bole", lat: 8.9951, lng: 38.7884 },
  { label: "Kazanchis", lat: 9.0200, lng: 38.7650 },
  { label: "Old Airport", lat: 9.0000, lng: 38.7300 },
  { label: "Sarbet", lat: 8.9950, lng: 38.7450 },
  { label: "4 Kilo", lat: 9.0330, lng: 38.7630 },
  { label: "Piassa", lat: 9.0300, lng: 38.7500 },
  { label: "Lebu", lat: 8.9700, lng: 38.7100 },
  { label: "Ayat", lat: 9.0200, lng: 38.8500 },
];

export default function ListingSearchControls({
  filters,
  onFilterChange,
}: ListingSearchControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locationText, setLocationText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newFilters: ListingSearchQuery = { ...filters };

    const neighborhoodName = formData.get("neighborhood") as string;
    const locationInput = formData.get("locationText") as string;

    if (neighborhoodName) {
      const neighborhood = NEIGHBORHOODS.find(n => n.label === neighborhoodName);
      if (neighborhood) {
        newFilters.lat = neighborhood.lat;
        newFilters.lng = neighborhood.lng;
        newFilters.radiusKm = 5;
      }
    } else if (locationInput) {
      // Basic simulation of location search - if it matches a neighborhood, use its coords
      const matched = NEIGHBORHOODS.find(n => 
        n.label.toLowerCase().includes(locationInput.toLowerCase())
      );
      if (matched) {
        newFilters.lat = matched.lat;
        newFilters.lng = matched.lng;
        newFilters.radiusKm = 5;
      }
    }

    const minPrice = formData.get("minPrice") as string;
    newFilters.minPrice = minPrice ? Number(minPrice) : undefined;

    const maxPrice = formData.get("maxPrice") as string;
    newFilters.maxPrice = maxPrice ? Number(maxPrice) : undefined;

    const bedrooms = formData.get("bedrooms") as string;
    newFilters.bedrooms = bedrooms ? Number(bedrooms) : undefined;

    const propertyType = formData.get("propertyType") as string;
    newFilters.propertyType = propertyType || undefined;

    onFilterChange(newFilters);
  }

  function clearFilters() {
    onFilterChange({});
  }

  return (
    <form className="property-search-panel" onSubmit={handleSubmit}>
      <div className="property-search-panel__query" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Input
            id="location-search"
            label="Search location"
            name="locationText"
            placeholder="e.g. Bole, Kazanchis..."
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
          />
        </div>
        <div style={{ flex: '0 1 200px' }}>
          <Select
            defaultValue=""
            id="property-neighborhood"
            label="Neighborhood"
            name="neighborhood"
            options={[
              { label: "Quick select", value: "" },
              ...NEIGHBORHOODS.map((n) => ({ label: n.label, value: n.label })),
            ]}
            onChange={(e) => {
              const val = e.target.value;
              if (val) setLocationText(val);
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="submit">Search</Button>
          <Button 
            type="button" 
            variant="quiet" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide Filters" : "More Filters"}
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <fieldset className="property-filter-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <legend className="sr-only">Additional Filters</legend>
          <Input
            defaultValue={filters.minPrice ?? ""}
            id="filter-min-price"
            label="Min Rent (ETB)"
            name="minPrice"
            type="number"
            min={0}
          />
          <Input
            defaultValue={filters.maxPrice ?? ""}
            id="filter-max-price"
            label="Max Rent (ETB)"
            name="maxPrice"
            type="number"
            min={0}
          />
          <Select
            defaultValue={filters.bedrooms?.toString() ?? ""}
            id="filter-bedrooms"
            label="Bedrooms"
            name="bedrooms"
            options={[
              { label: "Any bedrooms", value: "" },
              ...[1, 2, 3, 4, 5].map((c) => ({ label: `${c}+`, value: c.toString() })),
            ]}
          />
          <Select
            defaultValue={filters.propertyType ?? ""}
            id="filter-type"
            label="Property Type"
            name="propertyType"
            options={[
              { label: "Any type", value: "" },
              { label: "Apartment", value: "apartment" },
              { label: "House", value: "house" },
              { label: "Studio", value: "studio" },
              { label: "Villa", value: "villa" },
            ]}
          />
        </fieldset>
      )}

      <div className="property-search-panel__actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
        <Button onClick={clearFilters} type="button" variant="quiet">
          Reset all filters
        </Button>
      </div>
    </form>
  );
}
