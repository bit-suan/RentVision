"use client";

import { useEffect, useRef, useState } from "react";
import "pannellum/build/pannellum.css";
import PanoramaFallback from "@/components/panorama/PanoramaFallback";
import Spinner from "@/components/ui/Spinner";
import type { PropertyPanoramaConfig } from "@/lib/properties";

interface PanoramaViewerProps {
  config?: PropertyPanoramaConfig;
}

export default function PanoramaViewer({ config }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Pannellum.Viewer | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    let isCancelled = false;
    let viewer: Pannellum.Viewer | null = null;
    setHasError(false);
    setIsLoading(true);

    // Pannellum is published as a browser-only UMD script with global typings.
    // @ts-expect-error Its declaration file intentionally has no module exports.
    import("pannellum")
      .then(() => {
        if (isCancelled || !containerRef.current) return;

        viewer = window.pannellum.viewer(containerRef.current, {
          type: "equirectangular",
          panorama: config.deliveryUrl,
          title: config.title,
          yaw: config.initialView?.yaw,
          pitch: config.initialView?.pitch,
          hfov: config.initialView?.hfov,
          hotSpots: config.hotspots?.map((hotspot) => ({
            id: hotspot.id,
            pitch: hotspot.pitch,
            yaw: hotspot.yaw,
            text: hotspot.text,
            type: hotspot.type === "SCENE" ? "scene" : "info",
            sceneId: hotspot.targetPanoramaId,
          })),
          autoLoad: true,
          escapeHTML: true,
        });
        viewerRef.current = viewer;
        viewer.on("load", () => setIsLoading(false));
        viewer.on("error", () => {
          viewer?.destroy();
          viewerRef.current = null;
          setHasError(true);
          setIsLoading(false);
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      viewer?.destroy();
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
  }, [config]);

  if (!config) {
    return <PanoramaFallback />;
  }

  if (hasError) {
    return (
      <PanoramaFallback message="The 360-degree view could not be loaded. The property photo gallery is still available above." />
    );
  }

  return (
    <div className="panorama-viewer">
      {isLoading ? (
        <div className="panorama-viewer__loading">
          <Spinner label="Loading 360-degree view" />
        </div>
      ) : null}
      <div
        aria-label={config.title ?? "Interactive 360-degree property view"}
        className="panorama-viewer__canvas"
        ref={containerRef}
      />
    </div>
  );
}
