import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Property } from "@/lib/properties";
import { formatMonthlyRent } from "@/lib/property-formatting";
import { useLocale, useTranslations } from "next-intl";

interface PropertyCardProps {
  property: Property;
}

function availabilityTone(availability: Property["availability"]) {
  if (availability === "AVAILABLE") return "success";
  if (availability === "COMING_SOON") return "warning";
  return "neutral";
}

function BedIcon() {
  return (
    <svg
      aria-hidden="true"
      className="spec-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
    </svg>
  );
}

function BathIcon() {
  return (
    <svg
      aria-hidden="true"
      className="spec-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M9 6h6a2 2 0 0 1 2 2v2H7V8a2 2 0 0 1 2-2Z" />
      <path d="M4 11h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z" />
      <path d="M6 19v2M18 19v2" />
    </svg>
  );
}

function GeneratorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="spec-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function WaterTankIcon() {
  return (
    <svg
      aria-hidden="true"
      className="spec-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.7c-3.2 4-6 8.5-6 12.3a6 6 0 0 0 12 0c0-3.8-2.8-8.3-6-12.3Z" />
    </svg>
  );
}

function ParkingIcon() {
  return (
    <svg
      aria-hidden="true"
      className="spec-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="18" rx="4" width="18" x="3" y="3" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}

function matchesAny(amenities: string[], keywords: string[]): boolean {
  return amenities.some((a) =>
    keywords.some((k) => a.toLowerCase().includes(k.toLowerCase()))
  );
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const t = useTranslations("PropertyCard");
  const tAvail = useTranslations("Availability");
  const tType = useTranslations("PropertyTypes");
  const tTrust = useTranslations("TrustStatus");
  const locale = useLocale();

  const propertyTypeLabel = tType.has(property.propertyType)
    ? tType(property.propertyType)
    : property.propertyType;

  const availabilityLabel = tAvail.has(property.availability)
    ? tAvail(property.availability)
    : property.availability;

  const trustStatusLabel = tTrust.has(property.trustStatus)
    ? tTrust(property.trustStatus)
    : property.trustStatus;

  // The critical essentials in Ethiopia: Power (Generator) & Water (Water Tank)
  const amenities = property.amenities ?? [];
  const hasGenerator = matchesAny(amenities, ["generator", "ጄነሬተር"]);
  const hasWaterTank = matchesAny(amenities, ["water tank", "water reserve", "የውሃ ታንከር"]);
  const hasParking = matchesAny(amenities, ["parking", "garage", "ፓርኪንግ"]);

  // Limit to top 2 essential amenities so the card has EXACTLY 4 core items (Beds, Baths, + 2 Essentials)
  const essentials: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
  if (hasGenerator) {
    essentials.push({
      key: "generator",
      label: t("generator"),
      icon: <GeneratorIcon />,
    });
  }
  if (hasWaterTank) {
    essentials.push({
      key: "waterTank",
      label: t("waterTank"),
      icon: <WaterTankIcon />,
    });
  }
  if (essentials.length < 2 && hasParking) {
    essentials.push({
      key: "parking",
      label: t("parking"),
      icon: <ParkingIcon />,
    });
  }
  const topEssentials = essentials.slice(0, 2);

  return (
    <article className="property-card">
      <div className="property-card__image-wrap">
        <Image
          alt={property.title}
          className="property-card__image"
          height={320}
          src={property.imageUrl}
          unoptimized
          width={500}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      <div className="property-card__body">
        <div className="property-card__top">
          <Badge>{propertyTypeLabel}</Badge>
          <strong className="property-card__price">
            {formatMonthlyRent(property.price, locale)}
          </strong>
        </div>

        <h2 className="property-card__title">{property.title}</h2>
        <p className="property-card__location">{property.location}</p>

        {/* Exactly 4 items total: Beds, Baths, and the top 2 essentials (Generator, Water Tank) */}
        <div
          aria-label={t("bedroomsAndBathrooms", {
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
          })}
          className="property-card__specs"
        >
          <span className="property-card__spec">
            <BedIcon />
            <span>{t("beds", { count: property.bedrooms })}</span>
          </span>
          <span className="property-card__spec">
            <BathIcon />
            <span>{t("baths", { count: property.bathrooms })}</span>
          </span>
          {topEssentials.map((item) => (
            <span
              className="property-card__spec"
              key={item.key}
              title={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </span>
          ))}
        </div>

        <div className="property-card__statuses">
          <Badge tone={availabilityTone(property.availability)}>
            {availabilityLabel}
          </Badge>
          <Badge tone="warning">{trustStatusLabel}</Badge>
        </div>

        <Button href={`/properties/${property.id}`} variant="secondary">
          {t("viewProperty")}
        </Button>
      </div>
    </article>
  );
}
