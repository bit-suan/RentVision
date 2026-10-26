import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import Spinner from "@/components/ui/Spinner";
import MapPageClient from "./MapPageClient";

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

interface MapPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MapPage({ params }: MapPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="detail-panel" role="status">
          <Spinner label="Loading map..." />
        </div>
      }
    >
      <MapPageClient />
    </Suspense>
  );
}
