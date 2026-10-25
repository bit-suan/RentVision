import Badge from "@/components/ui/Badge";
import type { Property } from "@/lib/properties";
import { formatMonthlyRent } from "@/lib/property-formatting";
import { useLocale, useTranslations } from "next-intl";

interface PropertySummaryProps {
  property: Property;
}

function availabilityTone(availability: Property["availability"]) {
  if (availability === "AVAILABLE") return "success";
  if (availability === "COMING_SOON") return "warning";
  return "neutral";
}

export default function PropertySummary({ property }: PropertySummaryProps) {
  const t = useTranslations("PropertyDetail");
  const tAvail = useTranslations("Availability");
  const tType = useTranslations("PropertyTypes");
  const locale = useLocale();

  const propertyTypeLabel = tType.has(property.propertyType)
    ? tType(property.propertyType)
    : property.propertyType;

  const availabilityLabel = tAvail.has(property.availability)
    ? tAvail(property.availability)
    : property.availability;

  return (
    <header className="property-summary">
      <div className="property-summary__heading">
        <div className="property-summary__badges">
          <Badge>{propertyTypeLabel}</Badge>
          <Badge tone={availabilityTone(property.availability)}>
            {availabilityLabel}
          </Badge>
        </div>
        <h1>{property.title}</h1>
        <p>{property.location}</p>
      </div>

      <div className="property-summary__price">
        <strong>{formatMonthlyRent(property.price, locale)}</strong>
      </div>

      <dl className="property-summary__facts">
        <div>
          <dt>{t("bedrooms")}</dt>
          <dd>{property.bedrooms}</dd>
        </div>
        <div>
          <dt>{t("bathrooms")}</dt>
          <dd>{property.bathrooms}</dd>
        </div>
      </dl>

      <p className="property-summary__description">{property.description}</p>
    </header>
  );
}
