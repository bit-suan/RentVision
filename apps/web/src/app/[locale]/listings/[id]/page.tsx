import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import ListingDetailClient from "./ListingDetailClient";

export const instant = false;

const DEMO_IDS = [
  "listing-bole-loft",
  "listing-kazanchis-studio",
  "listing-sarbet-villa",
  "listing-old-airport-family",
  "listing-cmc-condo",
];

export function generateStaticParams() {
  return routing.locales.flatMap((locale: string) =>
    DEMO_IDS.map((id) => ({ locale, id }))
  );
}

interface ListingDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <main className="page">
          <p className="muted">Loading listing...</p>
        </main>
      }
    >
      <ListingDetailClient />
    </Suspense>
  );
}
