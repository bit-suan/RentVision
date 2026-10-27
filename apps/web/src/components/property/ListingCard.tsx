"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Listing } from "@/lib/types";
import { getDownloadUrl } from "@/lib/api";
import { formatMonthlyRent } from "@/lib/property-formatting";

interface ListingCardProps {
  listing: Listing;
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

function matchesAny(amenities: string[], keywords: string[]): boolean {
  return amenities.some((a) =>
    keywords.some((k) => a.toLowerCase().includes(k.toLowerCase()))
  );
}

export default function ListingCard({ listing }: ListingCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (listing.mediaKeys && listing.mediaKeys.length > 0) {
      let isMounted = true;
      getDownloadUrl(listing.mediaKeys[0])
        .then((res) => {
          if (isMounted) setImageUrl(res.downloadUrl);
        })
        .catch(() => {
          // fallback to image key if it's already a URL
          if (isMounted && listing.mediaKeys[0]?.startsWith("http")) {
            setImageUrl(listing.mediaKeys[0]);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [listing.mediaKeys]);

  const amenities = listing.amenities ?? [];
  const hasGenerator = matchesAny(amenities, ["generator", "backup-power", "ጄነሬተር"]);
  const hasWaterTank = matchesAny(amenities, ["water tank", "water-tank", "water reserve", "የውሃ ታንከር"]);
  const hasTour = Boolean(listing.panorama || (listing.panoramaKeys && listing.panoramaKeys.length > 0));

  const locationText =
    listing.address?.subcity && listing.address?.city
      ? `${listing.address.subcity}, ${listing.address.city}`
      : listing.address?.street || "Addis Ababa";

  const resolvedImageUrl =
    imageUrl ||
    listing.mediaKeys?.[0] ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267";

  return (
    <article className="property-card">
      <div className="property-card__image-wrap">
        <Image
          alt={listing.title}
          className="property-card__image"
          height={320}
          src={resolvedImageUrl}
          unoptimized
          width={500}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {hasTour && (
          <div className="property-card__tour-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tour-badge-icon">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span>360° Tour</span>
          </div>
        )}
      </div>

      <div className="property-card__body">
        <div className="property-card__top">
          <Badge>{listing.propertyType.charAt(0).toUpperCase() + listing.propertyType.slice(1)}</Badge>
          <strong className="property-card__price">
            {formatMonthlyRent(listing.price, listing.currency || "ETB")}
          </strong>
        </div>

        <h2 className="property-card__title">{listing.title}</h2>
        <p className="property-card__location">
          <span>{locationText}</span>
          {listing.distanceKm !== undefined && (
            <span className="property-card__distance-chip">
              📍 {listing.distanceKm} km away
            </span>
          )}
        </p>

        <div className="property-card__specs">
          <span className="property-card__spec">
            <BedIcon />
            <span>{listing.bedrooms} beds</span>
          </span>
          <span className="property-card__spec">
            <BathIcon />
            <span>{listing.bathrooms} baths</span>
          </span>
          {hasGenerator && (
            <span className="property-card__spec" title="Generator">
              <GeneratorIcon />
              <span>Generator</span>
            </span>
          )}
          {hasWaterTank && (
            <span className="property-card__spec" title="Water Tank">
              <WaterTankIcon />
              <span>Water Tank</span>
            </span>
          )}
        </div>

        <Button href={`/properties/${listing.listingId}`} variant="secondary">
          View property
        </Button>
      </div>
    </article>
  );
}
