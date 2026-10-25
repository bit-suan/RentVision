import type { PropertyCoordinates } from "@/lib/properties";
import { useTranslations } from "next-intl";

interface PropertyLocationProps {
  location: string;
  coordinates?: PropertyCoordinates;
}

export default function PropertyLocation({
  location,
  coordinates,
}: PropertyLocationProps) {
  const t = useTranslations("PropertyLocation");

  return (
    <section
      aria-labelledby="property-location-heading"
      className="detail-panel property-location"
    >
      <h2 id="property-location-heading">{t("heading")}</h2>
      <address>{location}</address>
      <div aria-live="polite" className="location-preview">
        {coordinates ? (
          <p>{t("mapPreviewAvailable")}</p>
        ) : (
          <p>{t("mapPreviewUnavailable")}</p>
        )}
      </div>
    </section>
  );
}
