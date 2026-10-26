"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";
import { searchListings } from "@/lib/api";

const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LATITUDE || 9.010793);
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LONGITUDE || 38.761252);
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function formatPrice(listing: Listing): string {
  return `${listing.price.toLocaleString()} ${listing.currency}`;
}

export function MapExplorer() {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [radiusKm, setRadiusKm] = useState(6);
  const [propertyType, setPropertyType] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    searchListings({
      lat,
      lng,
      radiusKm,
      propertyType: propertyType || undefined,
    })
      .then((result) => {
        if (!cancelled) {
          setListings(result.items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Search failed");
          setListings([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, radiusKm, propertyType]);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let circle: import("leaflet").Circle | undefined;

    const start = async () => {
      const L = (await import("leaflet")).default;
      const el = document.getElementById("rentvision-map");
      if (!el) {
        return;
      }

      map = L.map(el).setView([lat, lng], 13);
      L.tileLayer(TILE_URL, {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      circle = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: "#0f6b3f",
        fillColor: "#0f6b3f",
        fillOpacity: 0.08,
      }).addTo(map);

      for (const listing of listings) {
        const marker = L.circleMarker([listing.latitude, listing.longitude], {
          radius: listing.listingId === selectedId ? 11 : 8,
          color: listing.listingId === selectedId ? "#c4a35a" : "#0a4c2d",
          fillColor: "#0f6b3f",
          fillOpacity: 0.9,
        }).addTo(map);
        marker.bindPopup(
          `<strong>${listing.title}</strong><br/>${formatPrice(listing)}`
        );
        marker.on("click", () => setSelectedId(listing.listingId));
      }

      map.on("click", (event) => {
        setLat(Number(event.latlng.lat.toFixed(6)));
        setLng(Number(event.latlng.lng.toFixed(6)));
      });
    };

    void start();

    return () => {
      circle?.remove();
      map?.remove();
    };
  }, [lat, lng, listings, radiusKm, selectedId]);

  const selected = useMemo(
    () => listings.find((item) => item.listingId === selectedId),
    [listings, selectedId]
  );

  return (
    <div className="explorer">
      <aside className="sidebar">
        <div className="controls">
          <label>
            Search radius ({radiusKm} km)
            <input
              type="range"
              min="1"
              max="20"
              value={radiusKm}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
            />
          </label>
          <label>
            Property type
            <select
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value)}
            >
              <option value="">Any</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="studio">Studio</option>
              <option value="villa">Villa</option>
            </select>
          </label>
          <p className="muted">
            Center: {lat.toFixed(4)}, {lng.toFixed(4)}. Click the map to move the
            search.
          </p>
        </div>
        {error ? (
          <p className="error">
            {error}. Start the local API on port 3001 to load live listings.
          </p>
        ) : null}
        {loading ? <p className="muted">Searching nearby homes...</p> : null}
        {listings.map((listing) => (
          <article
            key={listing.listingId}
            className="listing-card"
            onClick={() => setSelectedId(listing.listingId)}
          >
            <h2>{listing.title}</h2>
            <p className="price">{formatPrice(listing)}</p>
            <p>
              {listing.address.subcity}, {listing.address.city}
              {listing.distanceKm !== undefined
                ? ` · ${listing.distanceKm} km`
                : ""}
            </p>
            <div className="meta">
              <span className="chip">{listing.bedrooms} bed</span>
              <span className="chip">{listing.bathrooms} bath</span>
              <span className="chip">{listing.areaSqm} m²</span>
            </div>
            <div className="actions">
              <Link className="button" href={`/listings/${listing.listingId}`}>
                Details
              </Link>
              <Link
                className="button secondary"
                href={`/listings/${listing.listingId}/tour`}
              >
                360° tour
              </Link>
            </div>
          </article>
        ))}
        {selected ? (
          <p className="muted">Selected: {selected.title}</p>
        ) : null}
      </aside>
      <div className="map-pane">
        <div id="rentvision-map" className="leaflet-container" />
      </div>
    </div>
  );
}
