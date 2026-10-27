import { setRequestLocale } from "next-intl/server";
import LandlordInquiries from "@/components/landlord/LandlordInquiries";

export const instant = false;

interface LandlordInquiriesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandlordInquiriesPage({
  params,
}: LandlordInquiriesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandlordInquiries />;
}
