"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";

const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LATITUDE || 9.010793);
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LONGITUDE || 38.761252);
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function formatPrice(listing: Listing): string {
  return `${listing.price.toLocaleString()} ${listing.currency}`;
}

interface PropertyMapProps {
  listings: Listing[];
  center?: { lat: number; lng: number };
  radiusKm?: number;
  onCenterChange?: (lat: number, lng: number) => void;
  selectedId?: string | null;
  onSelectListing?: (id: string | null) => void;
}

export function PropertyMap({
  listings,
  center,
  radiusKm,
  onCenterChange,
  selectedId,
  onSelectListing,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const lat = center?.lat ?? DEFAULT_LAT;
  const lng = center?.lng ?? DEFAULT_LNG;

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let circle: import("leaflet").Circle | undefined;

    const start = async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;

      map = L.map(mapRef.current).setView([lat, lng], 13);
      L.tileLayer(TILE_URL, {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      if (radiusKm) {
        circle = L.circle([lat, lng], {
          radius: radiusKm * 1000,
          color: "#0f6b3f",
          fillColor: "#0f6b3f",
          fillOpacity: 0.08,
        }).addTo(map);
      }

      for (const listing of listings) {
        if (listing.latitude === undefined || listing.longitude === undefined) continue;
        
        const isSelected = listing.listingId === selectedId;
        const marker = L.circleMarker([listing.latitude, listing.longitude], {
          radius: isSelected ? 12 : 8,
          color: isSelected ? "#c4a35a" : "#0a4c2d",
          fillColor: isSelected ? "#c4a35a" : "#0f6b3f",
          fillOpacity: 0.9,
          weight: isSelected ? 3 : 1,
        }).addTo(map);
        
        marker.bindPopup(
          `<strong>${listing.title}</strong><br/>${formatPrice(listing)}<br/><a href="/properties/${listing.listingId}" style="color: #0f6b3f; font-weight: 600;">View Details</a>`,
          { closeButton: false }
        );
        
        marker.on("click", () => {
          if (onSelectListing) onSelectListing(listing.listingId);
        });
      }

      map.on("click", (event) => {
        if (onCenterChange) {
          onCenterChange(
            Number(event.latlng.lat.toFixed(6)),
            Number(event.latlng.lng.toFixed(6))
          );
        }
      });
    };

    void start();

    return () => {
      circle?.remove();
      map?.remove();
    };
  }, [lat, lng, listings, radiusKm, selectedId, onCenterChange, onSelectListing]);

  return (
    <div 
      ref={mapRef}
      className="leaflet-container" 
      style={{ height: '100%', width: '100%' }} 
    />
  );
}

// Keep MapExplorer for backward compatibility if needed, but updated to use PropertyMap
export function MapExplorer() {
  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
    <p>Please use the <Link href="/properties">Discover</Link> page for the full map experience.</p>
  </div>;
}
