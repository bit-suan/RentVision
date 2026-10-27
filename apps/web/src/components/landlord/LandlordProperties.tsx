"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Spinner from "@/components/ui/Spinner";
import ListingCover from "./ListingCover";
import ListingStatusBadge from "./ListingStatusBadge";
import { useMyListings } from "./useMyListings";
import { formatListingAddress, normalizeStatus } from "@/lib/landlord";
import { formatMonthlyRent } from "@/lib/property-formatting";
import type { Listing } from "@/lib/types";

type FilterKey = "all" | "approved" | "pending" | "rejected";

const FILTERS: FilterKey[] = ["all", "approved", "pending", "rejected"];

function matchesSearch(listing: Listing, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  const haystack = [
    listing.title,
    listing.description,
    listing.address?.street,
    listing.address?.subcity,
    listing.address?.city,
    listing.address?.woreda,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(needle);
}

export default function LandlordProperties() {
  const t = useTranslations("Landlord.Properties");
  const types = useTranslations("Landlord.PropertyType");
  const locale = useLocale();
  const { items, loading, error, reload } = useMyListings();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      items.filter((listing) => {
        const statusMatches =
          filter === "all" || normalizeStatus(listing.status) === filter;
        return statusMatches && matchesSearch(listing, query);
      }),
    [filter, items, query]
  );

  return (
    <div className="landlord-page">
      <header className="landlord-page-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="muted">{t("description")}</p>
        </div>
        <Button href="/landlord/properties/new">{t("addProperty")}</Button>
      </header>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => void reload()}
          title={t("loadErrorTitle")}
        />
      ) : loading ? (
        <div className="landlord-loading">
          <Spinner label={t("loading")} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          action={
            <Button href="/landlord/properties/new">{t("addProperty")}</Button>
          }
          message={t("emptyMessage")}
          title={t("emptyTitle")}
        />
      ) : (
        <>
          <div className="landlord-toolbar">
            <div
              aria-label={t("filterLabel")}
              className="landlord-filter-tabs"
              role="group"
            >
              {FILTERS.map((key) => (
                <button
                  aria-pressed={filter === key}
                  className={`landlord-filter-tabs__button${
                    filter === key ? " is-active" : ""
                  }`}
                  key={key}
                  onClick={() => setFilter(key)}
                  type="button"
                >
                  {t(`filter_${key}`)}
                  <span className="landlord-filter-tabs__count">
                    {key === "all"
                      ? items.length
                      : items.filter(
                          (listing) => normalizeStatus(listing.status) === key
                        ).length}
                  </span>
                </button>
              ))}
            </div>

            <label className="landlord-search">
              <span className="visually-hidden">{t("searchLabel")}</span>
              <input
                className="form-field__control"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                type="search"
                value={query}
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              message={t("noMatchesMessage")}
              title={t("noMatchesTitle")}
            />
          ) : (
            <ul className="landlord-property-grid">
              {filtered.map((listing) => (
                <li className="landlord-property-card" key={listing.listingId}>
                  <ListingCover
                    alt={listing.title}
                    className="landlord-property-card__cover"
                    emptyLabel={t("noPhoto")}
                    mediaKeys={listing.mediaKeys}
                  />
                  <div className="landlord-property-card__body">
                    <div className="landlord-property-card__badges">
                      <ListingStatusBadge status={listing.status} />
                      <span className="badge">
                        {types(listing.propertyType)}
                      </span>
                      {listing.panorama ? (
                        <span className="badge badge--success">
                          {t("tourAvailable")}
                        </span>
                      ) : null}
                    </div>
                    <h2>{listing.title}</h2>
                    <p className="muted">
                      {formatListingAddress(listing) || t("noAddress")}
                    </p>
                    <p className="landlord-property-card__price">
                      {formatMonthlyRent(listing.price, listing.currency, locale)}
                    </p>
                    <p className="landlord-property-card__facts">
                      {t("bedrooms", { count: listing.bedrooms })} ·{" "}
                      {t("bathrooms", { count: listing.bathrooms })} ·{" "}
                      {t("area", { area: listing.areaSqm })}
                    </p>
                    <div className="landlord-property-card__actions">
                      <Link
                        className="button button--secondary"
                        href={`/landlord/properties/${listing.listingId}`}
                      >
                        {t("manage")}
                      </Link>
                      <Link
                        className="landlord-text-link"
                        href={`/landlord/properties/${listing.listingId}/edit`}
                      >
                        {t("edit")}
                      </Link>
                      <Link
                        className="landlord-text-link"
                        href={`/listings/${listing.listingId}`}
                      >
                        {t("view")}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
