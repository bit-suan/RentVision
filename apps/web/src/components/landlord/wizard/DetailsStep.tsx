"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  COMMON_AMENITIES,
  type ListingFormState,
} from "@/lib/landlord";

export default function DetailsStep({
  form,
  errors,
  onChange,
}: {
  form: ListingFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<ListingFormState>) => void;
}) {
  const t = useTranslations("Landlord.Wizard.Details");
  const amenityT = useTranslations("Landlord.Amenities");
  const [customAmenity, setCustomAmenity] = useState("");

  const allAmenities = Array.from(
    new Set([...COMMON_AMENITIES, ...form.amenities])
  );

  function toggleAmenity(value: string) {
    const next = form.amenities.includes(value)
      ? form.amenities.filter((item) => item !== value)
      : [...form.amenities, value];
    onChange({ amenities: next });
  }

  function addCustomAmenity() {
    const value = customAmenity.trim();
    if (!value) return;
    if (!form.amenities.includes(value)) {
      onChange({ amenities: [...form.amenities, value] });
    }
    setCustomAmenity("");
  }

  return (
    <section aria-labelledby="wizard-details-heading" className="wizard-panel">
      <header className="wizard-panel__header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="wizard-details-heading">{t("title")}</h2>
        <p className="muted">{t("description")}</p>
      </header>

      <div className="wizard-fields">
        <div className="wizard-field-row wizard-field-row--three">
          <Input
            error={errors.bedrooms}
            id="listing-bedrooms"
            label={t("bedrooms")}
            min={0}
            onChange={(event) => onChange({ bedrooms: event.target.value })}
            required
            type="number"
            value={form.bedrooms}
          />
          <Input
            error={errors.bathrooms}
            id="listing-bathrooms"
            label={t("bathrooms")}
            min={0}
            onChange={(event) => onChange({ bathrooms: event.target.value })}
            required
            type="number"
            value={form.bathrooms}
          />
          <Input
            error={errors.areaSqm}
            id="listing-area"
            label={t("area")}
            min={0}
            onChange={(event) => onChange({ areaSqm: event.target.value })}
            placeholder="120"
            required
            type="number"
            value={form.areaSqm}
          />
        </div>

        <fieldset className="wizard-fieldset">
          <legend>{t("amenities")}</legend>
          <p className="form-field__hint">{t("amenitiesHint")}</p>
          <div className="amenity-picker">
            {allAmenities.map((amenity) => {
              const isCommon = (COMMON_AMENITIES as readonly string[]).includes(
                amenity
              );
              const label = isCommon ? amenityT(amenity) : amenity;
              return (
                <label className="amenity-picker__option" key={amenity}>
                  <input
                    checked={form.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="wizard-inline-add">
          <Input
            id="custom-amenity"
            label={t("customAmenity")}
            onChange={(event) => setCustomAmenity(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomAmenity();
              }
            }}
            placeholder={t("customAmenityPlaceholder")}
            value={customAmenity}
          />
          <Button onClick={addCustomAmenity} type="button" variant="secondary">
            {t("addAmenity")}
          </Button>
        </div>
      </div>
    </section>
  );
}
