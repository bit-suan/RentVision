"use client";

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

function countStatus(items: Listing[], status: string): number {
  return items.filter((item) => normalizeStatus(item.status) === status).length;
}

export default function LandlordDashboard() {
  const t = useTranslations("Landlord.Dashboard");
  const locale = useLocale();
  const { items, loading, error, reload } = useMyListings();

  const stats = [
    { key: "totalListings", value: items.length, tone: "neutral" },
    { key: "approved", value: countStatus(items, "approved"), tone: "success" },
    { key: "pending", value: countStatus(items, "pending"), tone: "warning" },
    { key: "rejected", value: countStatus(items, "rejected"), tone: "danger" },
  ] as const;

  const recent = [...items]
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, 5);

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
      ) : (
        <>
          <section aria-label={t("statsAria")} className="landlord-stats">
            {stats.map((stat) => (
              <article
                className={`landlord-stat landlord-stat--${stat.tone}`}
                key={stat.key}
              >
                <span className="landlord-stat__label">{t(stat.key)}</span>
                <strong className="landlord-stat__value">{stat.value}</strong>
              </article>
            ))}
          </section>

          <section
            aria-labelledby="landlord-recent-heading"
            className="landlord-section"
          >
            <div className="landlord-section__header">
              <div>
                <h2 id="landlord-recent-heading">{t("recentTitle")}</h2>
                <p className="muted">{t("recentDescription")}</p>
              </div>
              {items.length > 0 ? (
                <Link className="landlord-text-link" href="/landlord/properties">
                  {t("viewAll")}
                </Link>
              ) : null}
            </div>

            {recent.length === 0 ? (
              <EmptyState
                action={
                  <Button href="/landlord/properties/new">
                    {t("addProperty")}
                  </Button>
                }
                message={t("emptyMessage")}
                title={t("emptyTitle")}
              />
            ) : (
              <ul className="landlord-recent-list">
                {recent.map((listing) => (
                  <li className="landlord-recent" key={listing.listingId}>
                    <ListingCover
                      alt={listing.title}
                      className="landlord-recent__cover"
                      emptyLabel={t("noPhoto")}
                      mediaKeys={listing.mediaKeys}
                    />
                    <div className="landlord-recent__body">
                      <div className="landlord-recent__title-row">
                        <h3>{listing.title}</h3>
                        <ListingStatusBadge status={listing.status} />
                      </div>
                      <p className="muted">
                        {formatListingAddress(listing) || t("noAddress")}
                      </p>
                      <p className="landlord-recent__price">
                        {formatMonthlyRent(listing.price, listing.currency, locale)}
                      </p>
                    </div>
                    <div className="landlord-recent__actions">
                      <Link
                        className="landlord-text-link"
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="landlord-note">
            <strong>{t("statusNoteTitle")}</strong>
            <p>{t("statusNote")}</p>
          </aside>
        </>
      )}
    </div>
  );
}
