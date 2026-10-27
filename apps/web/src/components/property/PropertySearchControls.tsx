"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { PropertySearchFilters } from "@/lib/property-search";
import { PROPERTY_AVAILABILITIES } from "@/lib/property-search";

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
  const t = useTranslations("SearchControls");
  const tAvail = useTranslations("Availability");
  const tType = useTranslations("PropertyTypes");

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
          label={t("queryLabel")}
          name="q"
          placeholder={t("queryPlaceholder")}
        />
        <Button type="submit">{t("search")}</Button>
      </div>

      <fieldset className="property-filter-grid">
        <legend>{t("filterLegend")}</legend>
        <Select
          defaultValue={filters.location ?? ""}
          id="property-location"
          label={t("locationLabel")}
          name="location"
          options={[
            { label: t("anyLocation"), value: "" },
            ...locations.map((location) => ({ label: location, value: location })),
          ]}
        />
        <Input
          defaultValue={filters.minimumPrice ?? ""}
          id="property-minimum-price"
          label={t("minPriceLabel")}
          min={0}
          name="minimumPrice"
          type="number"
        />
        <Input
          defaultValue={filters.maximumPrice ?? ""}
          id="property-maximum-price"
          label={t("maxPriceLabel")}
          min={0}
          name="maximumPrice"
          type="number"
        />
        <Select
          defaultValue={filters.minimumBedrooms?.toString() ?? ""}
          id="property-bedrooms"
          label={t("bedroomsLabel")}
          name="minimumBedrooms"
          options={[
            { label: t("anyBedrooms"), value: "" },
            ...[1, 2, 3, 4].map((count) => ({
              label: t("bedroomsOption", { count }),
              value: count.toString(),
            })),
          ]}
        />
        <Select
          defaultValue={filters.propertyType ?? ""}
          id="property-type"
          label={t("propertyTypeLabel")}
          name="propertyType"
          options={[
            { label: t("anyPropertyType"), value: "" },
            ...propertyTypes.map((propertyType) => ({
              label: tType.has(propertyType) ? tType(propertyType) : propertyType,
              value: propertyType,
            })),
          ]}
        />
        <Select
          defaultValue={filters.availability ?? ""}
          id="property-availability"
          label={t("availabilityLabel")}
          name="availability"
          options={[
            { label: t("anyAvailability"), value: "" },
            ...PROPERTY_AVAILABILITIES.map((availability) => ({
              label: tAvail.has(availability) ? tAvail(availability) : availability,
              value: availability,
            })),
          ]}
        />
        <Select
          defaultValue={filters.sort ?? ""}
          id="property-sort"
          label={t("sortLabel")}
          name="sort"
          options={[
            { label: t("sortRecommended"), value: "" },
            { label: t("sortPriceAsc"), value: "price-asc" },
            { label: t("sortPriceDesc"), value: "price-desc" },
          ]}
        />
        <div className="property-filter-grid__clear">
          <Button onClick={clearFilters} type="button" variant="quiet">
            {t("clearFilters")}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
