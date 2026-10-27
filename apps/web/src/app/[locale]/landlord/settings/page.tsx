import { setRequestLocale } from "next-intl/server";
import LandlordSettings from "@/components/landlord/LandlordSettings";

export const instant = false;

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
