import EmptyState from "@/components/ui/EmptyState";

interface PropertyAmenitiesProps {
  amenities: string[];
}

export default function PropertyAmenities({
  amenities,
}: PropertyAmenitiesProps) {
  return (
    <section aria-labelledby="property-amenities-heading">
      <h2 id="property-amenities-heading">Amenities</h2>
      {amenities.length > 0 ? (
        <ul className="amenities-list">
          {amenities.map((amenity) => (
            <li key={amenity}>{amenity}</li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No amenities listed"
          message="Amenity details have not been added for this property."
        />
      )}
    </section>
  );
}
