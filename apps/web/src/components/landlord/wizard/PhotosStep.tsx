"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { MAX_PHOTOS } from "@/lib/landlord";
import type { PhotoItem } from "./types";

export default function PhotosStep({
  items,
  errors,
  globalError,
  onAddFiles,
  onRemove,
}: {
  items: PhotoItem[];
  errors: Record<string, string>;
  globalError?: string;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("Landlord.Wizard.Photos");

  return (
    <section aria-labelledby="wizard-photos-heading" className="wizard-panel">
      <header className="wizard-panel__header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="wizard-photos-heading">{t("title")}</h2>
        <p className="muted">{t("description")}</p>
      </header>

      <div
        className="photo-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onAddFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <label className="button button--secondary photo-dropzone__button">
          {t("choosePhotos")}
          <input
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              onAddFiles(files);
            }}
            type="file"
          />
        </label>
        <p className="muted">{t("dropHint")}</p>
        <p className="form-field__hint">
          {t("limits", { count: MAX_PHOTOS })} · {t("coverHint")}
        </p>
      </div>

      {globalError ? (
        <p className="auth-error" role="alert">
          {globalError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="photo-empty">
          <p>{t("emptyTitle")}</p>
          <p className="muted">{t("emptyMessage")}</p>
        </div>
      ) : (
        <ul className="photo-grid">
          {items.map((item, index) => (
            <li className="photo-card" key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={item.name} className="photo-card__image" src={item.previewUrl} />
              <div className="photo-card__meta">
                <span className="photo-card__name" title={item.name}>
                  {item.name}
                </span>
                <span className="photo-card__badges">
                  {index === 0 ? (
                    <span className="badge badge--success">{t("cover")}</span>
                  ) : null}
                  <span className="badge">
                    {item.kind === "new" ? t("new") : t("saved")}
                  </span>
                </span>
              </div>
              {errors[item.id] ? (
                <p className="form-field__error" role="alert">
                  {errors[item.id]}
                </p>
              ) : null}
              <Button
                onClick={() => onRemove(item.id)}
                type="button"
                variant="quiet"
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
