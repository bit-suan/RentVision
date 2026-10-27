"use client";

import { useLocale, useTranslations } from "next-intl";
import ListingStatusBadge from "@/components/landlord/ListingStatusBadge";
import type { ListingFormState } from "@/lib/landlord";
import type { PhotoItem, SceneItem } from "./types";

export default function ReviewStep({
  form,
  photos,
  scenes,
  removeTour,
  mode,
  currentStatus,
  accepted,
  onAcceptedChange,
  onEditStep,
}: {
  form: ListingFormState;
  photos: PhotoItem[];
  scenes: SceneItem[];
  removeTour: boolean;
  mode: "create" | "edit";
  currentStatus?: string;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onEditStep: (step: number) => void;
}) {
  const t = useTranslations("Landlord.Wizard.Review");
  const types = useTranslations("Landlord.PropertyType");
  const locale = useLocale();
  const price = Number(form.price);
  const formattedPrice = Number.isFinite(price)
    ? new Intl.NumberFormat(locale).format(price)
    : form.price;

  return (
    <section aria-labelledby="wizard-review-heading" className="wizard-panel">
      <header className="wizard-panel__header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="wizard-review-heading">
          {mode === "edit" ? t("titleEdit") : t("title")}
        </h2>
        <p className="muted">{t("description")}</p>
      </header>

      {mode === "edit" && currentStatus ? (
        <div className="review-status">
          <span>{t("currentStatus")}</span>
          <ListingStatusBadge status={currentStatus} />
        </div>
      ) : null}

      <div className="review-grid">
        <article className="review-card">
          <div className="review-card__header">
            <h3>{t("basics")}</h3>
            <button className="landlord-text-link" onClick={() => onEditStep(0)} type="button">
              {t("edit")}
            </button>
          </div>
          <dl className="review-list">
            <div>
              <dt>{t("titleLabel")}</dt>
              <dd>{form.title}</dd>
            </div>
            <div>
              <dt>{t("priceLabel")}</dt>
              <dd>
                {formattedPrice} {form.currency}
              </dd>
            </div>
            <div>
              <dt>{t("typeLabel")}</dt>
              <dd>{types(form.propertyType)}</dd>
            </div>
            <div>
              <dt>{t("descriptionLabel")}</dt>
              <dd>{form.description}</dd>
            </div>
          </dl>
        </article>

        <article className="review-card">
          <div className="review-card__header">
            <h3>{t("location")}</h3>
            <button className="landlord-text-link" onClick={() => onEditStep(1)} type="button">
              {t("edit")}
            </button>
          </div>
          <dl className="review-list">
            <div>
              <dt>{t("addressLabel")}</dt>
              <dd>
                {[form.address.street, form.address.subcity, form.address.woreda, form.address.city]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt>{t("coordinatesLabel")}</dt>
              <dd>
                {form.latitude}, {form.longitude}
              </dd>
            </div>
          </dl>
        </article>

        <article className="review-card">
          <div className="review-card__header">
            <h3>{t("details")}</h3>
            <button className="landlord-text-link" onClick={() => onEditStep(2)} type="button">
              {t("edit")}
            </button>
          </div>
          <dl className="review-list">
            <div>
              <dt>{t("roomsLabel")}</dt>
              <dd>
                {t("rooms", {
                  bedrooms: form.bedrooms,
                  bathrooms: form.bathrooms,
                })}
              </dd>
            </div>
            <div>
              <dt>{t("areaLabel")}</dt>
              <dd>{form.areaSqm ? `${form.areaSqm} m²` : t("notProvided")}</dd>
            </div>
            <div>
              <dt>{t("amenitiesLabel")}</dt>
              <dd>
                {form.amenities.length ? form.amenities.join(", ") : t("noAmenities")}
              </dd>
            </div>
          </dl>
        </article>

        <article className="review-card">
          <div className="review-card__header">
            <h3>{t("media")}</h3>
            <button className="landlord-text-link" onClick={() => onEditStep(3)} type="button">
              {t("edit")}
            </button>
          </div>
          <dl className="review-list">
            <div>
              <dt>{t("photosLabel")}</dt>
              <dd>{t("photoCount", { count: photos.length })}</dd>
            </div>
            <div>
              <dt>{t("tourLabel")}</dt>
              <dd>
                {removeTour
                  ? t("tourRemoved")
                  : scenes.length
                    ? t("sceneCount", { count: scenes.length })
                    : t("noTour")}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <aside className="wizard-callout wizard-callout--warning">
        <strong>{t("publishTitle")}</strong>
        <p>{t("publishNotice")}</p>
        <p>{t("verificationNotice")}</p>
      </aside>

      <label className="review-confirm">
        <input
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
          type="checkbox"
        />
        <span>{t("confirm")}</span>
      </label>
    </section>
  );
}
