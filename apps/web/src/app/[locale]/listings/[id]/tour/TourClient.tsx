"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PanoramaViewer } from "@/components/PanoramaViewer";
import { getTour } from "@/lib/tours";

export default function TourClient() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("Tour");
  const tour = getTour(params.id);

  return (
    <main className="page">
      <p>
        <Link href={`/listings/${params.id}`}>{t("backToListing")}</Link>
      </p>
      <h1>{t("title")}</h1>
      <p className="muted">{t("description")}</p>
      <PanoramaViewer scenes={tour.scenes} defaultSceneId={tour.defaultSceneId} />
    </main>
  );
}
