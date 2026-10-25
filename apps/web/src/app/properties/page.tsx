import { Suspense } from "react";
import PropertyGrid from "@/components/property/PropertyGrid";
import PropertySearchControls from "@/components/property/PropertySearchControls";
import Spinner from "@/components/ui/Spinner";
import { getProperties } from "@/lib/properties";
import {
  parsePropertySearchFilters,
  searchProperties,
} from "@/lib/property-search";

type PropertiesSearchParams = Record<
  string,
  string | string[] | undefined
>;

interface PropertiesPageProps {
  searchParams: Promise<PropertiesSearchParams>;
}

export default function PropertiesPage({ searchParams }: PropertiesPageProps) {
  return (
    <Suspense
      fallback={
        <div className="detail-panel" role="status">
          <Spinner label="Loading property results" />
        </div>
      }
    >
      <PropertyResults searchParams={searchParams} />
    </Suspense>
  );
}

async function PropertyResults({ searchParams }: PropertiesPageProps) {
  const rawParams = await searchParams;
  const filters = parsePropertySearchFilters(rawParams);
  const allProperties = getProperties();
  const properties = searchProperties(allProperties, filters);
  const locations = [...new Set(allProperties.map((property) => property.location))].sort();
  const propertyTypes = [
    ...new Set(allProperties.map((property) => property.propertyType)),
  ].sort();

  return (
    <div className="properties-page">
      <header className="page-intro">
        <p className="eyebrow">Property discovery</p>
        <h1>Discover rental properties</h1>
        <p>
          Explore rental homes across Addis Ababa. Search by location, compare
          prices, and narrow the results to find a place that fits your needs.
        </p>
      </header>

      <PropertySearchControls
        key={JSON.stringify(filters)}
        filters={filters}
        locations={locations}
        propertyTypes={propertyTypes}
      />

      <section aria-live="polite" className="property-results">
        <div className="property-results__heading">
          <h2>Rental properties</h2>
          <p>
            {properties.length} {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>
        <PropertyGrid properties={properties} />
      </section>
    </div>
  );
}
