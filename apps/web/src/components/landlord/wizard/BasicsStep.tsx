"use client";

import { useTranslations } from "next-intl";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import type { ListingFormState } from "@/lib/landlord";

export default function BasicsStep({
  form,
  errors,
  onChange,
}: {
  form: ListingFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<ListingFormState>) => void;
}) {
  const t = useTranslations("Landlord.Wizard.Basics");
  const types = useTranslations("Landlord.PropertyType");

  return (
    <section aria-labelledby="wizard-basics-heading" className="wizard-panel">
      <header className="wizard-panel__header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="wizard-basics-heading">{t("title")}</h2>
        <p className="muted">{t("description")}</p>
      </header>

      <div className="wizard-fields">
        <Input
          error={errors.title}
          hint={t("titleHint")}
          id="listing-title"
          label={t("listingTitle")}
          maxLength={120}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder={t("titlePlaceholder")}
          required
          value={form.title}
        />

        <Textarea
          error={errors.description}
          hint={t("descriptionHint")}
          id="listing-description"
          label={t("listingDescription")}
          maxLength={2000}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={t("descriptionPlaceholder")}
          required
          rows={6}
          value={form.description}
        />

        <div className="wizard-field-row">
          <Input
            error={errors.price}
            id="listing-price"
            inputMode="numeric"
            label={t("monthlyRent")}
            min={0}
            onChange={(event) => onChange({ price: event.target.value })}
            placeholder="45000"
            required
            type="number"
            value={form.price}
          />
          <Select
            id="listing-currency"
            label={t("currency")}
            onChange={(event) =>
              onChange({ currency: event.target.value as ListingFormState["currency"] })
            }
            options={[
              { label: "ETB", value: "ETB" },
              { label: "USD", value: "USD" },
            ]}
            value={form.currency}
          />
        </div>

        <Select
          id="listing-property-type"
          label={t("propertyType")}
          onChange={(event) =>
            onChange({
              propertyType: event.target.value as ListingFormState["propertyType"],
            })
          }
          options={[
            { label: types("apartment"), value: "apartment" },
            { label: types("house"), value: "house" },
            { label: types("studio"), value: "studio" },
            { label: types("villa"), value: "villa" },
            { label: types("commercial"), value: "commercial" },
          ]}
          value={form.propertyType}
        />
      </div>
    </section>
  );
}
