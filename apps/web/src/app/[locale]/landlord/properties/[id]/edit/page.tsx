import { setRequestLocale } from "next-intl/server";
import ListingWizard from "@/components/landlord/ListingWizard";

export const instant = false;

interface EditListingPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ListingWizard listingId={id} />;
}
