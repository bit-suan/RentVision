"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { getListing, getDownloadUrl } from "@/lib/api";
import type { Listing } from "@/lib/types";

export default function ListingDetailClient() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("PropertyDetail");
  const [listing, setListing] = useState<Listing | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getListing(params.id)
      .then((data) => {
        setListing(data);
        if (data.mediaKeys?.length) {
          getDownloadUrl(data.mediaKeys[0])
            .then((res) => setImageUrl(res.downloadUrl))
            .catch(() => setImageUrl(null));
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("unableToLoad"));
      });
  }, [params.id, t]);

  if (error) {
    return (
      <main className="page">
        <div className="state-panel state-panel--error" role="alert">
          <h2>{t("unableToLoad")}</h2>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="page">
        <div className="detail-panel" role="status">
          <p className="muted">{t("loading")}</p>
        </div>
      </main>
    );
  }

  const tourScene = listing.panorama?.scenes.find((scene) => scene.imageUrl);

  return (
    <main className="page">
      <article className="property-detail">
        <nav aria-label={t("breadcrumbAria")} className="property-breadcrumb">
          <ol>
            <li>
              <Link href="/properties" className="property-breadcrumb__link">
                {t("breadcrumb")}
              </Link>
            </li>
            <li aria-current="page">{listing.title}</li>
          </ol>
        </nav>

        <div className="property-gallery">
          {imageUrl ? (
            <Image
              alt={listing.title}
              className="property-gallery__primary"
              height={460}
              src={imageUrl}
              unoptimized
              width={900}
              style={{ width: "100%", height: "auto", objectFit: "cover", borderRadius: "var(--radius-card)" }}
            />
          ) : (
            <div className="property-card__image-placeholder" style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
              No image available
            </div>
          )}
        </div>

        <div className="property-detail__layout">
          <div className="property-detail__main">
            <header className="property-summary">
              <div className="property-summary__badges">
                <span className="badge">{listing.propertyType}</span>
                <span className="badge badge--success">{listing.status}</span>
              </div>
              <h1>{listing.title}</h1>
              <p>{listing.address.street}, {listing.address.subcity}, {listing.address.city}</p>
              <p className="property-summary__description">{listing.description}</p>
              <dl className="property-summary__facts">
                <div>
                  <dt>{t("bedrooms")}</dt>
                  <dd>{listing.bedrooms}</dd>
                </div>
                <div>
                  <dt>{t("bathrooms")}</dt>
                  <dd>{listing.bathrooms}</dd>
                </div>
                <div>
                  <dt>Area</dt>
                  <dd>{listing.areaSqm} m²</dd>
                </div>
              </dl>
              {listing.amenities?.length ? (
                <ul className="amenities-list">
                  {listing.amenities.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : null}
            </header>

            <section
              aria-labelledby="listing-panorama-heading"
              className="detail-panel property-panorama-panel"
            >
              <h2 id="listing-panorama-heading">{t("virtualTourHeading")}</h2>
              {tourScene ? (
                <>
                  <Link
                    className="property-panorama-preview"
                    href={`/listings/${listing.listingId}/tour`}
                  >
                    <Image
                      alt={t("tourPreviewAlt", { title: listing.title })}
                      height={320}
                      src={tourScene.imageUrl as string}
                      style={{ width: "100%", height: "auto", objectFit: "cover" }}
                      unoptimized
                      width={640}
                    />
                  </Link>
                  <p className="muted">{t("tourPreviewHint")}</p>
                  <Link
                    className="button button--secondary"
                    href={`/listings/${listing.listingId}/tour`}
                  >
                    {t("openTour")}
                  </Link>
                </>
              ) : (
                <p className="muted">{t("tourUnavailable")}</p>
              )}
            </section>
          </div>

          <aside className="property-detail__sidebar">
            <div className="property-booking-card">
              <div className="property-booking-card__price">
                <span className="property-booking-card__price-label">
                  {listing.price.toLocaleString()} {listing.currency} / month
                </span>
              </div>
              <div className="property-booking-card__actions" style={{ display: "grid", gap: 8, marginTop: 16 }}>
                {tourScene ? (
                  <Link className="button button--primary" href={`/listings/${listing.listingId}/tour`}>
                    {t("openTour")}
                  </Link>
                ) : null}
                <Link className="button button--secondary" href={`/listings/${listing.listingId}/lease`}>
                  {t("askTheLease")}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}