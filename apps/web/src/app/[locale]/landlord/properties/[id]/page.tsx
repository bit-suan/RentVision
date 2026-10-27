import { setRequestLocale } from "next-intl/server";
import LandlordPropertyDetail from "@/components/landlord/LandlordPropertyDetail";

export const instant = false;

interface LandlordPropertyPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function LandlordPropertyPage({
  params,
  searchParams,
}: LandlordPropertyPageProps) {
  const { locale, id } = await params;
  const { saved } = await searchParams;
  setRequestLocale(locale);

  return <LandlordPropertyDetail listingId={id} saved={saved === "1"} />;
}
