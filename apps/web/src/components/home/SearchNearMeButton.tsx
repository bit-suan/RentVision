"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function SearchNearMeButton() {
  const t = useTranslations("Landing");
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearchNearMe = () => {
    if (isLocating) return;
    setIsLocating(true);
    setErrorMessage(null);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setErrorMessage("Geolocation is not supported by your browser. Showing rentals across Addis Ababa.");
      setTimeout(() => {
        router.push("/properties?lat=9.0054&lng=38.7832&radiusKm=10&nearMe=fallback");
      }, 1000);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);
        // Navigate to properties with user location and default 10 km radius
        router.push(
          `/properties?lat=${latitude.toFixed(5)}&lng=${longitude.toFixed(5)}&radiusKm=10&nearMe=true`
        );
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation permission error or timeout:", error);
        setErrorMessage(
          "Location access was denied. Showing available rentals across Addis Ababa."
        );
        // Graceful fallback to Addis Ababa central Bole coordinates
        setTimeout(() => {
          router.push(
            "/properties?lat=9.0054&lng=38.7832&radiusKm=15&nearMe=fallback"
          );
        }, 1200);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="search-near-me-wrap">
      <button
        type="button"
        onClick={handleSearchNearMe}
        disabled={isLocating}
        className="search-near-me-btn"
        aria-label={t("searchNearMe")}
      >
        {isLocating ? (
          <>
            <span className="search-near-me-spinner" aria-hidden="true" />
            <span className="search-near-me-label">{t("locating")}</span>
          </>
        ) : (
          <>
            <svg
              className="search-near-me-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
            <span className="search-near-me-label">{t("searchNearMe")}</span>
          </>
        )}
      </button>

      {errorMessage && (
        <div className="search-near-me-toast" role="status">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
