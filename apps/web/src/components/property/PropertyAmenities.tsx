import EmptyState from "@/components/ui/EmptyState";
import { useTranslations } from "next-intl";

interface PropertyAmenitiesProps {
  amenities: string[];
}

export default function PropertyAmenities({
  amenities,
}: PropertyAmenitiesProps) {
  const t = useTranslations("PropertyAmenities");

  return (
    <section
      aria-labelledby="property-amenities-heading"
      className="detail-panel property-amenities-panel"
    >
      <h2 id="property-amenities-heading">{t("heading")}</h2>
      {amenities.length > 0 ? (
        <ul className="amenities-list">
          {amenities.map((amenity) => (
            <li key={amenity}>{amenity}</li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={t("noAmenitiesTitle")}
          message={t("noAmenitiesMessage")}
        />
      )}
    </section>
  );
}
