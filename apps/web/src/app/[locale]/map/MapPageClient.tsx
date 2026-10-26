"use client";

import dynamic from "next/dynamic";
import Spinner from "@/components/ui/Spinner";

// Leaflet must be loaded client-side only
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
    <main
      className="page"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - var(--header-height, 64px))",
        padding: 0,
      }}
    >
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--border, #e5e7eb)",
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
          Explore on Map
        </h1>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Browse available properties across Addis Ababa
        </p>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <PropertyMap listings={[]} />
      </div>
    </main>
  );
}
