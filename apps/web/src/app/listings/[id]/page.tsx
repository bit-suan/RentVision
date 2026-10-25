"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getListing } from "@/lib/api";
import type { Listing } from "@/lib/types";

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getListing(params.id)
      .then(setListing)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load listing");
      });
  }, [params.id]);

  if (error) {
    return (
      <main className="page">
        <p className="error">{error}</p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="page">
        <p className="muted">Loading listing...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <article className="detail-card">
        <h1>{listing.title}</h1>
        <p className="price">
          {listing.price.toLocaleString()} {listing.currency} / month
        </p>
        <p>
          {listing.address.street}, {listing.address.subcity}, {listing.address.city}
        </p>
        <p>{listing.description}</p>
        <div className="meta">
          <span className="chip">{listing.propertyType}</span>
          <span className="chip">{listing.bedrooms} bedrooms</span>
          <span className="chip">{listing.bathrooms} bathrooms</span>
          <span className="chip">{listing.areaSqm} m²</span>
          {listing.amenities.map((amenity) => (
            <span className="chip" key={amenity}>
              {amenity}
            </span>
          ))}
        </div>
        <div className="actions">
          <Link className="button" href={`/listings/${listing.listingId}/tour`}>
            Open 360° tour
          </Link>
          <Link
            className="button secondary"
            href={`/listings/${listing.listingId}/lease`}
          >
            Ask the lease
          </Link>
        </div>
      </article>
    </main>
  );
}
