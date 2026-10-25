"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PanoramaViewer } from "@/components/PanoramaViewer";
import { getTour } from "@/lib/tours";

export default function TourPage() {
  const params = useParams<{ id: string }>();
  const tour = getTour(params.id);

  return (
    <main className="page">
      <p>
        <Link href={`/listings/${params.id}`}>Back to listing</Link>
      </p>
      <h1>Virtual inspection</h1>
      <p className="muted">
        Click the hotspots to walk between rooms. This uses equirectangular 360°
        scenes.
      </p>
      <PanoramaViewer scenes={tour.scenes} defaultSceneId={tour.defaultSceneId} />
    </main>
  );
}
