"use client";

import { useEffect, useRef } from "react";
import type { TourScene } from "@/lib/tours";

type PannellumViewer = { destroy: () => void };

export function PanoramaViewer({
  scenes,
  defaultSceneId,
}: {
  scenes: TourScene[];
  defaultSceneId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let viewer: PannellumViewer | undefined;
    let cancelled = false;

    const start = async () => {
      // @ts-ignore
      await import("pannellum/src/js/libpannellum.js");
      // @ts-ignore
      await import("pannellum");
      if (cancelled || !containerRef.current) {
        return;
      }

      const pannellum = (
        window as unknown as {
          pannellum: {
            viewer: (target: HTMLElement, config: Record<string, unknown>) => PannellumViewer;
          };
        }
      ).pannellum;

      const sceneConfig: Record<string, unknown> = {};
      for (const scene of scenes) {
        sceneConfig[scene.id] = {
          title: scene.title,
          type: "equirectangular",
          panorama: scene.imageUrl,
          hotSpots: scene.hotspots.map((hotspot) => ({
            pitch: hotspot.pitch,
            yaw: hotspot.yaw,
            type: hotspot.targetSceneId ? "scene" : "info",
            text: hotspot.text,
            sceneId: hotspot.targetSceneId,
          })),
        };
      }

      viewer = pannellum.viewer(el, {
        default: {
          firstScene: defaultSceneId,
          sceneFadeDuration: 800,
          autoLoad: true,
        },
        scenes: sceneConfig,
      });
    };

    void start();

    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [defaultSceneId, scenes]);

  return <div ref={containerRef} className="tour-frame" />;
}
