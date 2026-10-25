import type { PropertyCoordinates } from "@/lib/properties";

interface PropertyLocationProps {
  location: string;
  coordinates?: PropertyCoordinates;
}

export default function PropertyLocation({
  location,
  coordinates,
}: PropertyLocationProps) {
  return (
    <section
      aria-labelledby="property-location-heading"
      className="detail-panel property-location"
    >
      <h2 id="property-location-heading">Location</h2>
      <address>{location}</address>
      <div aria-live="polite" className="location-preview">
        {coordinates ? (
          <p>A map preview will be available in the map integration phase.</p>
        ) : (
          <p>
            Map preview is unavailable because this listing does not include
            geographic coordinates yet.
          </p>
        )}
      </div>
    </section>
  );
}
