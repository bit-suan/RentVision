import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Property } from "@/lib/properties";
import {
  formatMonthlyRent,
  formatPropertyAvailability,
} from "@/lib/property-formatting";

interface PropertyCardProps {
  property: Property;
}

function availabilityTone(availability: Property["availability"]) {
  if (availability === "AVAILABLE") return "success";
  if (availability === "COMING_SOON") return "warning";
  return "neutral";
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="property-card">
      <Image
        alt={property.title}
        className="property-card__image"
        height={400}
        src={property.imageUrl}
        unoptimized
        width={600}
        sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
      />

      <div className="property-card__body">
        <Badge>{property.propertyType}</Badge>
        <h2>{property.title}</h2>
        <p>{property.location}</p>
        <p>
          {property.bedrooms} bedrooms {"\u00b7"} {property.bathrooms} bathrooms
        </p>
        <strong className="property-card__price">
          {formatMonthlyRent(property.price)}
        </strong>
        <div className="property-card__statuses">
          <Badge tone={availabilityTone(property.availability)}>
            {formatPropertyAvailability(property.availability)}
          </Badge>
          <Badge tone="warning">{property.trustStatus}</Badge>
        </div>
        <Button href={`/properties/${property.id}`} variant="secondary">
          View property
        </Button>
      </div>
    </article>
  );
}
