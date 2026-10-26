import type { PropertyCoordinates } from "@/lib/properties";
import type { Listing } from "@/lib/types";
import { PropertyMap } from "../MapExplorer";

interface PropertyLocationProps {
  location: string;
  coordinates?: PropertyCoordinates;
  listing?: Listing;
}

export default function PropertyLocation({
  location,
  coordinates,
  listing,
}: PropertyLocationProps) {
  return (
    <section
      aria-labelledby="property-location-heading"
      className="detail-panel property-location"
    >
      <h2 id="property-location-heading">Location</h2>
      <address style={{ marginBottom: '1rem', display: 'block', fontStyle: 'normal' }}>{location}</address>
      <div aria-live="polite" className="location-preview" style={{ height: '300px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
        {coordinates ? (
          <PropertyMap 
            listings={listing ? [listing] : []}
            center={coordinates}
            radiusKm={0.5}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', color: '#666' }}>
            <p>
              Map preview is unavailable because this listing does not include
              geographic coordinates yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
