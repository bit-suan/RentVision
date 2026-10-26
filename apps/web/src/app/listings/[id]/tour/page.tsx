import { redirect } from "next/navigation";

export const instant = false;

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

interface TourRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function TourRedirect({ params }: TourRedirectProps) {
  const { id } = await params;
  redirect(`/en/listings/${id}/tour`);
}
