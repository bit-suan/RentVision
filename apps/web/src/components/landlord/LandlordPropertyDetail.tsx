"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import Spinner from "@/components/ui/Spinner";
import ListingStatusBadge from "./ListingStatusBadge";
import { getDownloadUrl, getListing } from "@/lib/api";
import {
  COMMON_AMENITIES,
  formatListingAddress,
  normalizeStatus,
} from "@/lib/landlord";
import { formatMonthlyRent } from "@/lib/property-formatting";
import type { Listing } from "@/lib/types";

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Unable to load this property.";
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function PhotoGrid({ keys, title }: { keys: string[]; title: string }) {
  const t = useTranslations("Landlord.Property");
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (!keys.length) return;

    Promise.all(
      keys.map(async (key) => {
        try {
          const result = await getDownloadUrl(key);
          return [key, result.downloadUrl] as const;
        } catch {
          return [key, ""] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setUrls(Object.fromEntries(entries.filter(([, url]) => url)));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [keys]);

  if (!keys.length) {
    return <p className="muted">{t("mediaEmpty")}</p>;
  }

  return (
    <ul className="landlord-media-grid">
      {keys.map((key, index) => (
        <li className="landlord-media-tile" key={key}>
          {urls[key] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={t("photoAlt", { title, number: index + 1 })}
              src={urls[key]}
            />
          ) : (
            <div className="landlord-media-tile__pending">
              {t("mediaPending")}
            </div>
          )}
          {index === 0 ? (
            <span className="badge badge--success landlord-media-tile__badge">
              {t("coverPhoto")}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function LandlordPropertyDetail({
  listingId,
  saved = false,
}: {
  listingId: string;
  saved?: boolean;
}) {
  const t = useTranslations("Landlord.Property");
  const types = useTranslations("Landlord.PropertyType");
  const amenitiesT = useTranslations("Landlord.Amenities");
  const locale = useLocale();
  const [loadState, setLoadState] = useState<{
    listingId: string;
    listing: Listing | null;
    error: string | null;
  } | null>(null);
  const currentLoad =
    loadState?.listingId === listingId ? loadState : null;
  const loading = !currentLoad;
  const listing = currentLoad?.listing ?? null;
  const error = currentLoad?.error ?? null;

  useEffect(() => {
    let cancelled = false;

    getListing(listingId)
      .then((result) => {
        if (!cancelled) {
          setLoadState({ listingId, listing: result, error: null });
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setLoadState({
            listingId,
            listing: null,
            error: errorMessage(loadError),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (loading) {
    return (
      <div className="landlord-loading">
        <Spinner label={t("loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="landlord-page">
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
          title={t("loadErrorTitle")}
        />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="landlord-page">
        <ErrorState
          message={t("notFoundMessage")}
          title={t("notFoundTitle")}
        />
      </div>
    );
  }

  return (
    <div className="landlord-page">
      <nav aria-label={t("breadcrumbAria")} className="property-breadcrumb">
        <ol>
          <li>
            <Link className="property-breadcrumb__link" href="/landlord/properties">
              {t("breadcrumb")}
            </Link>
          </li>
          <li aria-current="page">{listing.title}</li>
        </ol>
      </nav>

      {saved ? (
        <div className="landlord-success" role="status">
          <strong>{t("savedTitle")}</strong>
          <p>{t("savedMessage")}</p>
        </div>
      ) : null}

      <header className="landlord-page-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <div className="landlord-detail-title">
            <h1>{listing.title}</h1>
            <ListingStatusBadge status={listing.status} />
          </div>
          <p className="muted">
            {formatListingAddress(listing) || t("noAddress")}
          </p>
        </div>
        <div className="landlord-page-header__actions">
          <Button href={`/landlord/properties/${listing.listingId}/edit`}>
            {t("edit")}
          </Button>
          <Button
            href={`/listings/${listing.listingId}`}
            variant="secondary"
          >
            {t("view")}
          </Button>
          {listing.panorama ? (
            <Button
              href={`/listings/${listing.listingId}/tour`}
              variant="secondary"
            >
              {t("openTour")}
            </Button>
          ) : null}
        </div>
      </header>

      <aside className="landlord-note">
        <strong>{t("statusNoteTitle")}</strong>
        <p>{t("statusNote")}</p>
        {normalizeStatus(listing.status) === "approved" ? (
          <p>{t("approvedNote")}</p>
        ) : null}
      </aside>

      <div className="landlord-detail-layout">
        <section
          aria-labelledby="property-details-heading"
          className="landlord-card"
        >
          <h2 id="property-details-heading">{t("detailsTitle")}</h2>
          <dl className="landlord-detail-list">
            <div>
              <dt>{t("price")}</dt>
              <dd>
                {formatMonthlyRent(listing.price, listing.currency, locale)}
              </dd>
            </div>
            <div>
              <dt>{t("propertyType")}</dt>
              <dd>{types(listing.propertyType)}</dd>
            </div>
            <div>
              <dt>{t("rooms")}</dt>
              <dd>
                {t("roomsValue", {
                  bedrooms: listing.bedrooms,
                  bathrooms: listing.bathrooms,
                })}
              </dd>
            </div>
            <div>
              <dt>{t("area")}</dt>
              <dd>{listing.areaSqm ? `${listing.areaSqm} m²` : t("notProvided")}</dd>
            </div>
            <div>
              <dt>{t("listingId")}</dt>
              <dd className="landlord-mono">{listing.listingId}</dd>
            </div>
            <div>
              <dt>{t("updated")}</dt>
              <dd>{formatDate(listing.updatedAt, locale)}</dd>
            </div>
          </dl>
          <h3>{t("descriptionLabel")}</h3>
          <p className="landlord-detail-description">{listing.description}</p>
        </section>

        <section
          aria-labelledby="property-location-heading"
          className="landlord-card"
        >
          <h2 id="property-location-heading">{t("locationTitle")}</h2>
          <dl className="landlord-detail-list">
            <div>
              <dt>{t("addressLabel")}</dt>
              <dd>{formatListingAddress(listing) || t("noAddress")}</dd>
            </div>
            <div>
              <dt>{t("woredaLabel")}</dt>
              <dd>{listing.address?.woreda || t("notProvided")}</dd>
            </div>
            <div>
              <dt>{t("coordinates")}</dt>
              <dd className="landlord-mono">
                {listing.latitude}, {listing.longitude}
              </dd>
            </div>
          </dl>
          <h3>{t("amenities")}</h3>
          {listing.amenities?.length ? (
            <ul className="amenities-list">
              {listing.amenities.map((amenity) => (
                <li key={amenity}>
                  {/* Known amenities are translated; custom ones are shown as entered. */}
                  {(
                    COMMON_AMENITIES as readonly string[]
                  ).includes(amenity)
                    ? amenitiesT(amenity as (typeof COMMON_AMENITIES)[number])
                    : amenity}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("noAmenities")}</p>
          )}
        </section>
      </div>

      <section aria-labelledby="property-media-heading" className="landlord-card">
        <div className="landlord-section__header">
          <div>
            <h2 id="property-media-heading">{t("mediaTitle")}</h2>
            <p className="muted">{t("mediaHint")}</p>
          </div>
        </div>
        <PhotoGrid keys={listing.mediaKeys ?? []} title={listing.title} />
      </section>

      <section aria-labelledby="property-tour-heading" className="landlord-card">
        <div className="landlord-section__header">
          <div>
            <h2 id="property-tour-heading">{t("tourTitle")}</h2>
            <p className="muted">{t("tourHint")}</p>
          </div>
          {listing.panorama ? (
            <Button
              href={`/listings/${listing.listingId}/tour`}
              variant="secondary"
            >
              {t("openTour")}
            </Button>
          ) : null}
        </div>
        {listing.panorama ? (
          <>
            <p className="muted">
              {t("sceneCount", { count: listing.panorama.scenes.length })}
            </p>
            <ul className="landlord-scene-grid">
              {listing.panorama.scenes.map((scene) => (
                <li className="landlord-scene-tile" key={scene.id}>
                  {scene.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={scene.title} src={scene.imageUrl} />
                  ) : (
                    <div className="landlord-scene-tile__pending">
                      {t("scenePending")}
                    </div>
                  )}
                  <div>
                    <h3>{scene.title}</h3>
                    <p className="muted">
                      {t("hotspotCount", { count: scene.hotspots.length })}
                    </p>
                    {scene.id === listing.panorama?.defaultSceneId ? (
                      <span className="badge">{t("defaultScene")}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">{t("tourEmpty")}</p>
        )}
      </section>

      <aside className="landlord-note">
        <strong>{t("manageNoteTitle")}</strong>
        <p>{t("manageNote")}</p>
      </aside>
    </div>
  );
}
