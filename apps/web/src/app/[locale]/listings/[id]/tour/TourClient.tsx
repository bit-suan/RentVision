"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { PanoramaViewer } from "@/components/PanoramaViewer";
import ErrorState from "@/components/ui/ErrorState";
import Spinner from "@/components/ui/Spinner";
import { getListing } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { getTour, type TourScene } from "@/lib/tours";

function tourScenes(listing: Listing | null, listingId: string): TourScene[] {
  if (listing?.panorama?.scenes && listing.panorama.scenes.length > 0) {
    const valid = listing.panorama.scenes
      .filter((scene) => Boolean(scene.imageUrl))
      .map((scene) => ({
        id: scene.id,
        title: scene.title,
        imageUrl: scene.imageUrl as string,
        hotspots: scene.hotspots.map((hotspot) => ({
          id: hotspot.id,
          pitch: hotspot.pitch,
          yaw: hotspot.yaw,
          text: hotspot.text,
          targetSceneId: hotspot.targetSceneId,
        })),
      }));
    if (valid.length > 0) return valid;
  }
  return getTour(listingId).scenes;
}

export default function TourClient() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("Tour");
  const [loadState, setLoadState] = useState<{
    id: string;
    listing: Listing | null;
    error: string | null;
  } | null>(null);
  const currentLoad = loadState?.id === params.id ? loadState : null;
  const loading = !currentLoad;
  const listing = currentLoad?.listing ?? null;
  const error = currentLoad?.error ?? null;

  useEffect(() => {
    let cancelled = false;

    getListing(params.id)
      .then((result) => {
        if (!cancelled) {
          setLoadState({ id: params.id, listing: result, error: null });
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          console.warn("TourClient getListing fallback:", loadError);
          const fallbackTour = getTour(params.id);
          setLoadState({
            id: params.id,
            listing: {
              listingId: params.id,
              title: "360° Virtual Walkthrough",
              description: "Interactive room-by-room virtual inspection",
              price: 45000,
              currency: "ETB",
              propertyType: "apartment",
              status: "active",
              latitude: 9.01,
              longitude: 38.76,
              geohash: "",
              address: { street: "Cameroon St", city: "Addis Ababa", subcity: "Bole", woreda: "03" },
              bedrooms: 2,
              bathrooms: 2,
              areaSqm: 120,
              amenities: ["Generator", "Water Tank", "WiFi", "Parking"],
              mediaKeys: [],
              panoramaKeys: [],
              panorama: {
                defaultSceneId: fallbackTour.defaultSceneId,
                scenes: fallbackTour.scenes.map((s) => ({
                  id: s.id,
                  title: s.title,
                  s3Key: `panoramas/${s.id}.jpg`,
                  imageUrl: s.imageUrl,
                  hotspots: s.hotspots.map((h) => ({
                    id: h.id,
                    pitch: h.pitch,
                    yaw: h.yaw,
                    text: h.text,
                    targetSceneId: h.targetSceneId,
                  })),
                })),
              },
              landlordId: "landlord-hana",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            error: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, t]);

  const scenes = tourScenes(listing, params.id);
  const defaultSceneId =
    listing?.panorama?.defaultSceneId && scenes.some((s) => s.id === listing.panorama?.defaultSceneId)
      ? listing.panorama.defaultSceneId
      : scenes[0]?.id ?? "living";

  return (
    <main className="page tour-page">
      <p>
        <Link href={`/listings/${params.id}`}>{t("viewProperty")}</Link>
      </p>
      <h1>{listing?.title ?? t("title")}</h1>

      {loading ? (
        <div className="landlord-loading">
          <Spinner label={t("loading")} />
        </div>
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
          title={t("loadErrorTitle")}
        />
      ) : scenes.length === 0 ? (
        <section className="state-panel" role="status">
          <h2>{t("unavailableTitle")}</h2>
          <p>{t("unavailableMessage")}</p>
          <p style={{ marginTop: "1rem" }}>
            <Link
              className="button button--secondary"
              href={`/listings/${params.id}`}
            >
              {t("backToListing")}
            </Link>
          </p>
        </section>
      ) : (
        <>
          <p className="muted">{t("description")}</p>
          <PanoramaViewer
            defaultSceneId={defaultSceneId}
            scenes={scenes}
          />
          <p className="muted tour-source-note">{t("sourceNote")}</p>
        </>
      )}
    </main>
  );
}
