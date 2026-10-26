import { redirect } from "next/navigation";

const DEMO_IDS = [
  "listing-bole-loft",
  "listing-kazanchis-studio",
  "listing-sarbet-villa",
  "listing-old-airport-family",
  "listing-cmc-condo",
];

export function generateStaticParams() {
  return DEMO_IDS.map((id) => ({ id }));
}

interface LeaseRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function LeaseRedirect({ params }: LeaseRedirectProps) {
  const { id } = await params;
  redirect(`/en/listings/${id}/lease`);
}
