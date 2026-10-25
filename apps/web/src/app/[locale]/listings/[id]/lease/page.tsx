import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import LeaseClient from "./LeaseClient";

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

interface LeasePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function LeasePage({ params }: LeasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <main className="page">
          <p className="muted">Loading lease...</p>
        </main>
      }
    >
      <LeaseClient />
    </Suspense>
  );
}
