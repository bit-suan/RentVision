import { Suspense } from "react";
import PropertyGrid from "@/components/property/PropertyGrid";
import PropertySearchControls from "@/components/property/PropertySearchControls";
import Spinner from "@/components/ui/Spinner";
import { getProperties } from "@/lib/properties";
import {
  parsePropertySearchFilters,
  searchProperties,
} from "@/lib/property-search";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

type PropertiesSearchParams = Record<
  string,
  string | string[] | undefined
>;

interface PropertiesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PropertiesSearchParams>;
}

export default async function PropertiesPage({
  params,
  searchParams,
}: PropertiesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Properties" });

  return (
    <Suspense
      fallback={
        <div className="detail-panel" role="status">
          <Spinner label={t("loading")} />
        </div>
      }
    >
      <PropertyResults params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PropertyResults({
  params,
  searchParams,
}: PropertiesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Properties" });
  const rawParams = await searchParams;
  const filters = parsePropertySearchFilters(rawParams);
  const allProperties = getProperties();
  const properties = searchProperties(allProperties, filters);
  const locations = [...new Set(allProperties.map((property) => property.location))].sort();
  const propertyTypes = [
    ...new Set(allProperties.map((property) => property.propertyType)),
  ].sort();

  return (
    <div className="properties-page">
      <header className="page-intro">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </header>

      <PropertySearchControls
        key={JSON.stringify(filters)}
        filters={filters}
        locations={locations}
        propertyTypes={propertyTypes}
      />

      <section aria-live="polite" className="property-results">
        <div className="property-results__heading">
          <h2>{t("heading")}</h2>
          <p>
            {t(properties.length === 1 ? "count_one" : "count_other", {
              count: properties.length,
            })}
          </p>
        </div>
        <PropertyGrid properties={properties} />
      </section>
    </div>
  );
}
