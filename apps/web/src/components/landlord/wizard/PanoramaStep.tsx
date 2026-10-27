"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { SceneItem } from "./types";

export default function PanoramaStep({
  scenes,
  defaultSceneId,
  sceneErrors,
  sceneWarnings,
  globalError,
  existingTour,
  removeTour,
  onAddScene,
  onRemoveScene,
  onUpdateScene,
  onReplaceSceneFile,
  onAddHotspot,
  onUpdateHotspot,
  onRemoveHotspot,
  onDefaultScene,
  onToggleRemoveTour,
}: {
  scenes: SceneItem[];
  defaultSceneId: string;
  sceneErrors: Record<string, string>;
  sceneWarnings: Record<string, string>;
  globalError?: string;
  existingTour: boolean;
  removeTour: boolean;
  onAddScene: (file: File) => void;
  onRemoveScene: (id: string) => void;
  onUpdateScene: (id: string, patch: Partial<SceneItem>) => void;
  onReplaceSceneFile: (id: string, file: File) => void;
  onAddHotspot: (sceneId: string) => void;
  onUpdateHotspot: (
    sceneId: string,
    hotspotId: string,
    patch: Record<string, string>
  ) => void;
  onRemoveHotspot: (sceneId: string, hotspotId: string) => void;
  onDefaultScene: (id: string) => void;
  onToggleRemoveTour: (remove: boolean) => void;
}) {
  const t = useTranslations("Landlord.Wizard.Panorama");
  const maxScenes = 10;

  return (
    <section aria-labelledby="wizard-panorama-heading" className="wizard-panel">
      <header className="wizard-panel__header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="wizard-panorama-heading">{t("title")}</h2>
        <p className="muted">{t("description")}</p>
      </header>

      <aside className="wizard-callout">
        <strong>{t("requirementTitle")}</strong>
        <p>{t("requirement")}</p>
        <p>{t("cannotVerify")}</p>
      </aside>

      {existingTour ? (
        <label className="wizard-toggle">
          <input
            checked={removeTour}
            onChange={(event) => onToggleRemoveTour(event.target.checked)}
            type="checkbox"
          />
          <span>{t("removeExisting")}</span>
        </label>
      ) : null}

      {removeTour ? (
        <div className="photo-empty">
          <p>{t("removedTitle")}</p>
          <p className="muted">{t("removedMessage")}</p>
        </div>
      ) : (
        <>
          <div className="panorama-toolbar">
            <label className="button button--secondary">
              {t("addScene")}
              <input
                accept="image/jpeg,image/png,image/webp"
                className="visually-hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onAddScene(file);
                }}
                type="file"
              />
            </label>
            <span className="muted">
              {t("sceneCount", { count: scenes.length, max: maxScenes })}
            </span>
          </div>

          {globalError ? (
            <p className="auth-error" role="alert">
              {globalError}
            </p>
          ) : null}

          {scenes.length === 0 ? (
            <div className="photo-empty">
              <p>{t("emptyTitle")}</p>
              <p className="muted">{t("emptyMessage")}</p>
            </div>
          ) : null}

          <div className="scene-list">
            {scenes.map((scene, index) => (
              <article className="scene-card" key={scene.id}>
                <div className="scene-card__header">
                  <div>
                    <h3>{t("sceneNumber", { number: index + 1 })}</h3>
                    {scene.kind === "new" ? (
                      <span className="badge">{t("newScene")}</span>
                    ) : (
                      <span className="badge">{t("savedScene")}</span>
                    )}
                  </div>
                  <Button
                    onClick={() => onRemoveScene(scene.id)}
                    type="button"
                    variant="quiet"
                  >
                    {t("removeScene")}
                  </Button>
                </div>

                <div className="scene-card__body">
                  {scene.previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      alt={scene.title}
                      className="scene-card__preview"
                      src={scene.previewUrl}
                    />
                  ) : (
                    <div className="scene-card__preview scene-card__preview--empty">
                      {t("noPreview")}
                    </div>
                  )}

                  <div className="scene-card__fields">
                    <Input
                      id={`scene-title-${scene.id}`}
                      label={t("sceneTitle")}
                      onChange={(event) =>
                        onUpdateScene(scene.id, { title: event.target.value })
                      }
                      value={scene.title}
                    />

                    <label className="wizard-toggle">
                      <input
                        checked={defaultSceneId === scene.id}
                        name="default-scene"
                        onChange={() => onDefaultScene(scene.id)}
                        type="radio"
                      />
                      <span>{t("defaultScene")}</span>
                    </label>

                    <label className="wizard-file-replace">
                      <span>{t("replaceImage")}</span>
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) onReplaceSceneFile(scene.id, file);
                        }}
                        type="file"
                      />
                    </label>

                    {sceneErrors[scene.id] ? (
                      <p className="form-field__error" role="alert">
                        {sceneErrors[scene.id]}
                      </p>
                    ) : null}
                    {sceneWarnings[scene.id] ? (
                      <p className="form-field__hint">{sceneWarnings[scene.id]}</p>
                    ) : null}
                  </div>
                </div>

                <div className="scene-card__hotspots">
                  <div className="scene-card__hotspots-header">
                    <h4>{t("hotspotsTitle")}</h4>
                    <p className="muted">{t("hotspotsHint")}</p>
                  </div>
                  {scene.hotspots.length === 0 ? (
                    <p className="form-field__hint">{t("noHotspots")}</p>
                  ) : (
                    <ul className="hotspot-list">
                      {scene.hotspots.map((hotspot) => (
                        <li className="hotspot-row" key={hotspot.id}>
                          <Input
                            id={`hotspot-text-${hotspot.id}`}
                            label={t("hotspotText")}
                            onChange={(event) =>
                              onUpdateHotspot(scene.id, hotspot.id, {
                                text: event.target.value,
                              })
                            }
                            placeholder={t("hotspotTextPlaceholder")}
                            value={hotspot.text}
                          />
                          <label className="form-field">
                            <span>{t("hotspotTarget")}</span>
                            <select
                              className="form-field__control"
                              onChange={(event) =>
                                onUpdateHotspot(scene.id, hotspot.id, {
                                  targetSceneId: event.target.value,
                                })
                              }
                              value={hotspot.targetSceneId}
                            >
                              <option value="">{t("hotspotInfo")}</option>
                              {scenes
                                .filter((other) => other.id !== scene.id)
                                .map((other) => (
                                  <option key={other.id} value={other.id}>
                                    {other.title || other.id}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <Input
                            id={`hotspot-yaw-${hotspot.id}`}
                            label={t("yaw")}
                            onChange={(event) =>
                              onUpdateHotspot(scene.id, hotspot.id, {
                                yaw: event.target.value,
                              })
                            }
                            step="any"
                            type="number"
                            value={hotspot.yaw}
                          />
                          <Input
                            id={`hotspot-pitch-${hotspot.id}`}
                            label={t("pitch")}
                            onChange={(event) =>
                              onUpdateHotspot(scene.id, hotspot.id, {
                                pitch: event.target.value,
                              })
                            }
                            step="any"
                            type="number"
                            value={hotspot.pitch}
                          />
                          <Button
                            onClick={() => onRemoveHotspot(scene.id, hotspot.id)}
                            type="button"
                            variant="quiet"
                          >
                            {t("removeHotspot")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    onClick={() => onAddHotspot(scene.id)}
                    type="button"
                    variant="secondary"
                  >
                    {t("addHotspot")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
