import type { Property } from "@/lib/properties";
import EmptyState from "@/components/ui/EmptyState";
import PropertyCard from "@/components/property/PropertyCard";

interface PropertyGridProps {
  properties: Property[];
}

export default function PropertyGrid({ properties }: PropertyGridProps) {
  if (properties.length === 0) {
    return (
      <EmptyState
        title="No properties found"
        message="Try changing your search or filters to see more rental options."
      />
    );
  }

  return (
    <section aria-label="Property results" className="property-grid">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </section>
  );
}
