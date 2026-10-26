import { Suspense } from "react";
import Spinner from "@/components/ui/Spinner";
import ListingDiscovery from "@/components/property/ListingDiscovery";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

interface PropertiesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PropertiesPage({
  params,
}: PropertiesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="detail-panel" role="status">
          <Spinner label="Loading..." />
        </div>
      }
    >
      <ListingDiscovery />
    </Suspense>
  );
}
