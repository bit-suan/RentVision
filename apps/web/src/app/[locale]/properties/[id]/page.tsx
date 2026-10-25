import { Suspense } from "react";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import PropertyAmenities from "@/components/property/PropertyAmenities";
import PropertyGallery from "@/components/property/PropertyGallery";
import PropertyLocation from "@/components/property/PropertyLocation";
import PropertySummary from "@/components/property/PropertySummary";
import PropertyTrust from "@/components/property/PropertyTrust";
import PanoramaViewer from "@/components/panorama/PanoramaViewer";
import { getProperties, getProperty } from "@/lib/properties";
import { formatMonthlyRent } from "@/lib/property-formatting";
import { notFound } from "next/navigation";
import { Link, routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const instant = false;

export function generateStaticParams() {
  const all = getProperties();
  return routing.locales.flatMap((locale: string) =>
    all.map((property) => ({ locale, id: property.id }))
  );
}

interface PropertyDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "PropertyDetail" });

  return (
    <Suspense
      fallback={
        <div className="detail-panel" role="status">
          <Spinner label={t("loading")} />
        </div>
      }
    >
      <PropertyDetails params={params} />
    </Suspense>
  );
}

async function PropertyDetails({
  params,
}: PropertyDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const property = getProperty(id);

  if (!property) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "PropertyDetail" });

  return (
    <article className="property-detail">
      <nav aria-label={t("breadcrumbAria")} className="property-breadcrumb">
        <ol>
          <li>
            <Link href="/properties" className="property-breadcrumb__link">
              {t("breadcrumb")}
            </Link>
          </li>
          <li aria-current="page">{property.title}</li>
        </ol>
      </nav>

      <PropertyGallery
        galleryImages={property.galleryImages}
        imageUrl={property.imageUrl}
        title={property.title}
      />

      <div className="property-detail__layout">
        <div className="property-detail__main">
          <PropertySummary property={property} />

          <PropertyAmenities amenities={property.amenities} />

          <PropertyLocation
            coordinates={property.coordinates}
            location={property.location}
          />

          <section
            aria-labelledby="property-panorama-heading"
            className="detail-panel property-panorama-panel"
          >
            <h2 id="property-panorama-heading">{t("virtualTourHeading")}</h2>
            <PanoramaViewer config={property.panorama} />
          </section>
        </div>

        <aside className="property-detail__sidebar">
          <div className="property-sticky-sidebar">
            <div className="property-booking-card">
              <div className="property-booking-card__price">
                <span className="property-booking-card__price-label">
                  {formatMonthlyRent(property.price, locale)}
                </span>
              </div>

              <div className="property-booking-card__trust">
                <PropertyTrust status={property.trustStatus} />
              </div>

              <div className="property-booking-card__lease">
                <h3 className="property-booking-card__lease-title">
                  {t("leaseHeading")}
                </h3>
                <p className="property-booking-card__lease-desc">
                  {t("leaseDescription")}
                </p>
                <Button
                  className="button--primary property-booking-card__cta"
                  href={`/renter/lease?propertyId=${encodeURIComponent(property.id)}`}
                >
                  {t("askAboutLease")}
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
