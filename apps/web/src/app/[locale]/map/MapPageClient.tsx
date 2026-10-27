"use client";

import dynamic from "next/dynamic";
import Spinner from "@/components/ui/Spinner";

const PropertyMap = dynamic(
  () => import("@/components/MapExplorer").then((m) => m.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Spinner label="Loading map..." />
      </div>
    ),
  }
);

export default function MapPageClient() {
  return (
    <div className="map-page">
      <div className="map-page__header">
        <h1>Explore on map</h1>
        <p className="muted">Browse available properties across Addis Ababa</p>
      </div>
      <div className="map-page__canvas">
        <PropertyMap listings={[]} />
      </div>
    </div>
  );
}