"use client";

import { useEffect, useRef, useState } from "react";
import "pannellum/build/pannellum.css";
import type { TourScene } from "@/lib/tours";

type PannellumViewer = {
  destroy: () => void;
  loadScene: (sceneId: string) => void;
  getScene: () => string;
  on: (event: string, handler: (sceneId?: string) => void) => void;
};

const ROOM_ICONS: Record<string, string> = {
  living: "🛋️",
  bedroom: "🛏️",
  kitchen: "🍳",
  dining: "🍽️",
  balcony: "🌅",
};

export function PanoramaViewer({
  scenes,
  defaultSceneId,
}: {
  scenes: TourScene[];
  defaultSceneId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  const [activeScene, setActiveScene] = useState<string>(defaultSceneId || scenes[0]?.id || "living");

  useEffect(() => {
    const el = containerRef.current;
    if (!el || scenes.length === 0) {
      return;
    }

    let viewer: PannellumViewer | undefined;
    let cancelled = false;

    const start = async () => {
      // @ts-expect-error pannellum script does not provide a module declaration
      await import("pannellum/src/js/libpannellum.js");
      // @ts-expect-error @types/pannellum defines ambient globals rather than a module
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
          autoLoad: true,
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
          firstScene: defaultSceneId || scenes[0]?.id,
          sceneFadeDuration: 600,
          autoLoad: true,
          showZoomCtrl: true,
          showFullscreenCtrl: true,
          compass: true,
        },
        scenes: sceneConfig,
      });

      viewerRef.current = viewer;

      viewer.on("scenechange", (sceneId?: string) => {
        if (sceneId) {
          setActiveScene(sceneId);
        } else {
          try {
            const current = viewer?.getScene();
            if (current) setActiveScene(current);
          } catch {
            // ignore
          }
        }
      });
    };

    void start();

    return () => {
      cancelled = true;
      viewer?.destroy();
      viewerRef.current = null;
    };
  }, [defaultSceneId, scenes]);

  const switchScene = (sceneId: string) => {
    setActiveScene(sceneId);
    try {
      viewerRef.current?.loadScene(sceneId);
    } catch (e) {
      console.warn("Failed to switch scene:", e);
    }
  };

  return (
    <div className="tour-wrapper">
      {/* Interactive Room Navigation Bar */}
      {scenes.length > 1 && (
        <nav aria-label="Room navigation" className="tour-room-bar">
          <span className="tour-room-bar__label">Explore Rooms:</span>
          <div className="tour-room-bar__pills">
            {scenes.map((scene) => {
              const isActive = activeScene === scene.id;
              const icon = ROOM_ICONS[scene.id] || "📍";
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => switchScene(scene.id)}
                  className={`tour-room-pill ${isActive ? "tour-room-pill--active" : ""}`}
                >
                  <span className="tour-room-pill__icon">{icon}</span>
                  <span>{scene.title}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Pannellum 360 viewer frame */}
      <div ref={containerRef} className="tour-frame" />
    </div>
  );
}
