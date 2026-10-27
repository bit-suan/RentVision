import { setRequestLocale } from "next-intl/server";
import LandlordSettings from "@/components/landlord/LandlordSettings";

interface LandlordSettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandlordSettingsPage({
  params,
}: LandlordSettingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandlordSettings />;
}
