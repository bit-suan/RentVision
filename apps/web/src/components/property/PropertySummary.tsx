import Badge from "@/components/ui/Badge";
import type { Property } from "@/lib/properties";
import { formatMonthlyRent, formatPropertyAvailability } from "@/lib/property-formatting";

interface PropertySummaryProps {
  property: Property;
}

function availabilityTone(availability: Property["availability"]) {
  if (availability === "AVAILABLE") return "success";
  if (availability === "COMING_SOON") return "warning";
  return "neutral";
}

export default function PropertySummary({ property }: PropertySummaryProps) {
  return (
    <header className="property-summary">
      <div className="property-summary__heading">
        <div className="property-summary__badges">
          <Badge>{property.propertyType}</Badge>
          <Badge tone={availabilityTone(property.availability)}>
            {formatPropertyAvailability(property.availability)}
          </Badge>
        </div>
        <h1>{property.title}</h1>
        <p>{property.location}</p>
      </div>

      <div className="property-summary__price">
        <strong>{formatMonthlyRent(property.price)}</strong>
      </div>

      <dl className="property-summary__facts">
        <div>
          <dt>Bedrooms</dt>
          <dd>{property.bedrooms}</dd>
        </div>
        <div>
          <dt>Bathrooms</dt>
          <dd>{property.bathrooms}</dd>
        </div>
      </dl>

      <p className="property-summary__description">{property.description}</p>
    </header>
  );
}
