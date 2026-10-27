"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import type { Address, ListingFormState } from "@/lib/landlord";

const LocationPicker = dynamic(
  () => import("@/components/landlord/LocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="location-picker location-picker--loading">
        <Spinner label="Loading map" />
      </div>
    ),
  }
);

export default function LocationStep({
  form,
  errors,
  onChange,
  onAddressChange,
}: {
  form: ListingFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<ListingFormState>) => void;
  onAddressChange: (patch: Partial<Address>) => void;
}) {
  const t = useTranslations("Landlord.Wizard.Location");
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const validCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return (
    <section aria-labelledby="wizard-location-heading" className="wizard-panel">
      <header className="wizard-panel__header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="wizard-location-heading">{t("title")}</h2>
        <p className="muted">{t("description")}</p>
      </header>

      <div className="wizard-fields">
        <Input
          error={errors.street}
          id="address-street"
          label={t("street")}
          onChange={(event) => onAddressChange({ street: event.target.value })}
          placeholder={t("streetPlaceholder")}
          required
          value={form.address.street}
        />
        <div className="wizard-field-row">
          <Input
            error={errors.subcity}
            id="address-subcity"
            label={t("subcity")}
            onChange={(event) => onAddressChange({ subcity: event.target.value })}
            placeholder={t("subcityPlaceholder")}
            required
            value={form.address.subcity}
          />
          <Input
            id="address-woreda"
            label={t("woreda")}
            onChange={(event) => onAddressChange({ woreda: event.target.value })}
            placeholder={t("woredaPlaceholder")}
            value={form.address.woreda}
          />
        </div>
        <Input
          id="address-city"
          label={t("city")}
          onChange={(event) => onAddressChange({ city: event.target.value })}
          required
          value={form.address.city}
        />

        <div className="wizard-field-row">
          <Input
            error={errors.latitude}
            id="listing-latitude"
            label={t("latitude")}
            onChange={(event) => onChange({ latitude: event.target.value })}
            required
            step="any"
            type="number"
            value={form.latitude}
          />
          <Input
            error={errors.longitude}
            id="listing-longitude"
            label={t("longitude")}
            onChange={(event) => onChange({ longitude: event.target.value })}
            required
            step="any"
            type="number"
            value={form.longitude}
          />
        </div>

        <div className="wizard-map">
          <div className="wizard-map__header">
            <h3>{t("mapTitle")}</h3>
            <p className="muted">{t("mapHint")}</p>
          </div>
          {validCoordinates ? (
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(nextLat, nextLng) =>
                onChange({
                  latitude: nextLat.toFixed(6),
                  longitude: nextLng.toFixed(6),
                })
              }
            />
          ) : (
            <p className="form-field__hint">{t("mapUnavailable")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
