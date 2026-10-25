import type { Property } from "@/lib/properties";
import EmptyState from "@/components/ui/EmptyState";
import PropertyCard from "@/components/property/PropertyCard";
import { useTranslations } from "next-intl";

interface PropertyGridProps {
  properties: Property[];
}

export default function PropertyGrid({ properties }: PropertyGridProps) {
  const t = useTranslations("States");

  if (properties.length === 0) {
    return (
      <EmptyState
        title={t("noPropertiesTitle")}
        message={t("noPropertiesMessage")}
      />
    );
  }

  return (
    <section aria-label={t("resultsAria")} className="property-grid">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </section>
  );
}
