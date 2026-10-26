"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PanoramaViewer } from "@/components/PanoramaViewer";
import { getTour } from "@/lib/tours";

function TourContent() {
  const params = useParams<{ id: string }>();
  const tour = getTour(params.id);

  if (!tour) {
    return <main className="page"><p>Tour not found.</p></main>;
  }

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

export default function TourPage() {
  return (
    <Suspense fallback={<main className="page"><p className="muted">Loading tour...</p></main>}>
      <TourContent />
    </Suspense>
  );
}
