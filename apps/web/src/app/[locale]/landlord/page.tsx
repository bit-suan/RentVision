import { setRequestLocale } from "next-intl/server";
import LandlordDashboard from "@/components/landlord/LandlordDashboard";

interface LandlordDashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandlordDashboardPage({
  params,
}: LandlordDashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandlordDashboard />;
}
