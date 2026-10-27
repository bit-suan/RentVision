import { setRequestLocale } from "next-intl/server";
import LandlordProperties from "@/components/landlord/LandlordProperties";

interface LandlordPropertiesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandlordPropertiesPage({
  params,
}: LandlordPropertiesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandlordProperties />;
}
