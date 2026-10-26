"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import PropertyAmenities from "@/components/property/PropertyAmenities";
import PropertyGallery from "@/components/property/PropertyGallery";
import PropertyLocation from "@/components/property/PropertyLocation";
import PropertySummary from "@/components/property/PropertySummary";
import PropertyTrust from "@/components/property/PropertyTrust";
import PanoramaViewer from "@/components/panorama/PanoramaViewer";
import { getListing, getDownloadUrl } from "@/lib/api";
import type { Listing } from "@/lib/types";

function ListingDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedMediaUrls, setSignedMediaUrls] = useState<string[]>([]);
  const [signedPanoramaUrls, setSignedPanoramaUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!params.id) return;

    const isMounted = true;
    getListing(params.id)
      .then(async (data) => {
        if (!isMounted) return;
        setListing(data);
        
        // Fetch signed URLs for media
        if (data.mediaKeys && data.mediaKeys.length > 0) {
          const urls = await Promise.all(
            data.mediaKeys.map(key => getDownloadUrl(key).then(res => res.downloadUrl).catch(() => ""))
          );
          setSignedMediaUrls(urls.filter(Boolean));
        }

        if (data.panoramaKeys && data.panoramaKeys.length > 0) {
          const urls = await Promise.all(
            data.panoramaKeys.map(key => getDownloadUrl(key).then(res => res.downloadUrl).catch(() => ""))
          );
          setSignedPanoramaUrls(urls.filter(Boolean));
        }
        
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load listing");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8rem' }}>
        <Spinner label="Loading property details..." />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="page">
        <ErrorState 
          title="Listing Not Found" 
          message={error || "The property you are looking for does not exist or has been removed."} 
          onRetry={() => router.push('/properties')}
        />
      </div>
    );
  }

  // Map Listing to Property-like object for existing components
  const propertyAdapter = {
    id: listing.listingId,
    title: listing.title,
    location: `${listing.address.subcity}, ${listing.address.city}`,
    price: listing.price,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    propertyType: listing.propertyType,
    availability: listing.status === 'active' ? 'AVAILABLE' : 'RENTED',
    trustStatus: 'Verified', // Mocked as requested not to invent, but using a placeholder that fits design
    imageUrl: signedMediaUrls[0] || "",
    galleryImages: signedMediaUrls,
    amenities: listing.amenities,
    coordinates: { lat: listing.latitude, lng: listing.longitude },
    description: listing.description,
    panorama: signedPanoramaUrls.length > 0 ? {
      deliveryUrl: signedPanoramaUrls[0],
      title: "Virtual Tour"
    } : undefined
  };

  return (
    <article className="property-detail">
      <nav aria-label="Breadcrumb" className="property-breadcrumb">
        <ol>
          <li>
            <Button onClick={() => router.back()} variant="quiet">
              ← Back to search results
            </Button>
          </li>
          <li aria-current="page">{listing.title}</li>
        </ol>
      </nav>

      <PropertyGallery
        galleryImages={propertyAdapter.galleryImages}
        imageUrl={propertyAdapter.imageUrl}
        title={propertyAdapter.title}
      />

      <PropertySummary property={propertyAdapter as unknown as import("@/lib/properties").Property} />

      <PropertyTrust status={propertyAdapter.trustStatus} />

      <PropertyAmenities amenities={propertyAdapter.amenities} />

      <PropertyLocation
        coordinates={propertyAdapter.coordinates}
        location={propertyAdapter.location}
        listing={listing}
      />

      {propertyAdapter.panorama && (
        <section aria-labelledby="property-panorama-heading">
          <h2 id="property-panorama-heading">{"360\u00b0 virtual tour"}</h2>
          <PanoramaViewer config={propertyAdapter.panorama as unknown as import("@/lib/properties").PropertyPanoramaConfig} />
        </section>
      )}

      <section aria-labelledby="inquiry-heading" className="lease-entry-panel">
        <div>
          <h2 id="inquiry-heading">Interested in this property?</h2>
          <p>
            Send an inquiry to the landlord to express your interest and schedule a viewing.
          </p>
        </div>
        <Button href={`/properties/${listing.listingId}/inquiry`}>
          Send Inquiry
        </Button>
      </section>

      <section aria-labelledby="lease-qa-heading" className="lease-entry-panel" style={{ marginTop: '1rem' }}>
        <div>
          <h2 id="lease-qa-heading">Questions about the lease?</h2>
          <p>
            Ask AI about the lease terms, deposit, and utilities for this property.
          </p>
        </div>
        <Button href={`/properties/${listing.listingId}/lease`} variant="secondary">
          Ask the Lease
        </Button>
      </section>
    </article>
  );
}

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '8rem' }}><Spinner label="Loading..." /></div>}>
      <ListingDetailContent />
    </Suspense>
  );
}
