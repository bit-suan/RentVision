import { Suspense } from "react";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import PropertyAmenities from "@/components/property/PropertyAmenities";
import PropertyGallery from "@/components/property/PropertyGallery";
import PropertyLocation from "@/components/property/PropertyLocation";
import PropertySummary from "@/components/property/PropertySummary";
import PropertyTrust from "@/components/property/PropertyTrust";
import PanoramaViewer from "@/components/panorama/PanoramaViewer";
import { getProperty } from "@/lib/properties";
import { notFound } from "next/navigation";

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="detail-panel" role="status">
          <Spinner label="Loading property details" />
        </div>
      }
    >
      <PropertyDetails params={params} />
    </Suspense>
  );
}

async function PropertyDetails({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const property = getProperty(id);

  if (!property) {
    notFound();
  }

  return (
    <article className="property-detail">
      <nav aria-label="Breadcrumb" className="property-breadcrumb">
        <ol>
          <li>
            <Button href="/properties" variant="quiet">
              Properties
            </Button>
          </li>
          <li aria-current="page">{property.title}</li>
        </ol>
      </nav>

      <PropertyGallery
        galleryImages={property.galleryImages}
        imageUrl={property.imageUrl}
        title={property.title}
      />

      <PropertySummary property={property} />

      <PropertyTrust status={property.trustStatus} />

      <PropertyAmenities amenities={property.amenities} />

      <PropertyLocation
        coordinates={property.coordinates}
        location={property.location}
      />

      <section aria-labelledby="property-panorama-heading">
        <h2 id="property-panorama-heading">{"360\u00b0 virtual tour"}</h2>
        <PanoramaViewer config={property.panorama} />
      </section>

      <section aria-labelledby="lease-qa-heading" className="lease-entry-panel">
        <div>
          <h2 id="lease-qa-heading">Questions about the lease?</h2>
          <p>
            Lease questions will be available in the renter portal. This
            property is included as context for the future Q&amp;A flow.
          </p>
        </div>
        <Button href={`/renter/lease?propertyId=${encodeURIComponent(property.id)}`}>
          Ask about the lease
        </Button>
      </section>
    </article>
  );
}
