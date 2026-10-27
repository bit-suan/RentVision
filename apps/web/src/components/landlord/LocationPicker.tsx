"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current).setView([latitude, longitude], 15);
      L.tileLayer(TILE_URL, {
        attribution:
          process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
          "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const marker = L.circleMarker([latitude, longitude], {
        radius: 10,
        color: "#172F70",
        fillColor: "#1689E8",
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(map);

      map.on("click", (event) => {
        onChangeRef.current(
          Number(event.latlng.lat.toFixed(6)),
          Number(event.latlng.lng.toFixed(6))
        );
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 0);
    };

    void start();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is initialized once. Coordinate updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    mapRef.current.setView([latitude, longitude]);
    markerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude, ready]);

  return <div className="location-picker" ref={containerRef} />;
}
