"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Listing } from "@/lib/types";
import { getDownloadUrl } from "@/lib/api";
import {
  formatMonthlyRent,
  formatPropertyAvailability,
} from "@/lib/property-formatting";

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (listing.mediaKeys && listing.mediaKeys.length > 0) {
      let isMounted = true;
      getDownloadUrl(listing.mediaKeys[0])
        .then((res) => {
          if (isMounted) setImageUrl(res.downloadUrl);
        })
        .catch((err) => console.error("Failed to load image", err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return () => { isMounted = false; };
    }
  }, [listing.mediaKeys]);

  return (
    <article className="property-card">
      <div className="property-card__image-container" style={{ position: 'relative', height: '240px', width: '100%' }}>
        {imageUrl ? (
          <Image
            alt={listing.title}
            className="property-card__image"
            fill
            src={imageUrl}
            unoptimized
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
          />
        ) : (
          <div className="property-card__image-placeholder" style={{ height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? "Loading image..." : "No image available"}
          </div>
        )}
      </div>

      <div className="property-card__body">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <Badge>{listing.propertyType}</Badge>
          <Badge tone={listing.status === 'active' ? 'success' : 'neutral'}>
            {formatPropertyAvailability(listing.status)}
          </Badge>
        </div>
        <h2>{listing.title}</h2>
        <p>{listing.address.subcity}, {listing.address.city}</p>
        <p>
          {listing.bedrooms} bedrooms {"\u00b7"} {listing.bathrooms} bathrooms {"\u00b7"} {listing.areaSqm} m²
        </p>
        
        {listing.amenities && listing.amenities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px', marginBottom: '8px' }}>
            {listing.amenities.slice(0, 3).map(amenity => (
              <span key={amenity} style={{ fontSize: '0.75rem', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                {amenity}
              </span>
            ))}
            {listing.amenities.length > 3 && (
              <span style={{ fontSize: '0.75rem', color: '#666' }}>+{listing.amenities.length - 3} more</span>
            )}
          </div>
        )}

        <strong className="property-card__price">
          {formatMonthlyRent(listing.price, listing.currency)}
        </strong>
        <div className="property-card__actions" style={{ marginTop: '16px' }}>
          <Button href={`/properties/${listing.listingId}`} variant="secondary">
            View details
          </Button>
        </div>
      </div>
    </article>
  );
}
