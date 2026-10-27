import { setRequestLocale } from "next-intl/server";
import ListingWizard from "@/components/landlord/ListingWizard";

export const instant = false;

interface NewListingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewListingPage({ params }: NewListingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ListingWizard />;
}
