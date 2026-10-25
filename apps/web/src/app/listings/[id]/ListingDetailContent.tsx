"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getListing } from "@/lib/api";
import type { Listing } from "@/lib/types";

export default function ListingDetailContent() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("PropertyDetail");
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getListing(params.id)
      .then(setListing)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("unableToLoad"));
      });
  }, [params.id, t]);

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
        <p className="muted">{t("loading")}</p>
      </main>
    );
  }

  return (
    <main className="page">
      <article className="detail-card">
        <h1>{listing.title}</h1>
        <p className="price">
          {t("perMonth", {
            price: listing.price.toLocaleString(),
            currency: listing.currency,
          })}
        </p>
        <p>
          {listing.address.street}, {listing.address.subcity}, {listing.address.city}
        </p>
        <p>{listing.description}</p>
        <div className="meta">
          <span className="chip">{listing.propertyType}</span>
          <span className="chip">
            {listing.bedrooms} {t("bedrooms")}
          </span>
          <span className="chip">
            {listing.bathrooms} {t("bathrooms")}
          </span>
          <span className="chip">{listing.areaSqm} m²</span>
          {listing.amenities.map((amenity: string) => (
            <span className="chip" key={amenity}>
              {amenity}
            </span>
          ))}
        </div>
        <div className="actions">
          <Link className="button" href={`/listings/${listing.listingId}/tour`}>
            {t("openTour")}
          </Link>
          <Link
            className="button secondary"
            href={`/listings/${listing.listingId}/lease`}
          >
            {t("askTheLease")}
          </Link>
        </div>
      </article>
    </main>
  );
}
