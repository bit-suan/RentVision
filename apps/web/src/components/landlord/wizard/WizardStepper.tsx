"use client";

import { useTranslations } from "next-intl";

const STEPS = ["basics", "location", "details", "photos", "tour", "review"] as const;

export default function WizardStepper({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick: (index: number) => void;
}) {
  const t = useTranslations("Landlord.Wizard.Steps");

  return (
    <ol aria-label={t("aria")} className="wizard-stepper">
      {STEPS.map((step, index) => {
        const state =
          index === current ? "current" : index < current ? "complete" : "upcoming";
        return (
          <li className={`wizard-stepper__item is-${state}`} key={step}>
            <button
              aria-current={index === current ? "step" : undefined}
              className="wizard-stepper__button"
              disabled={index >= current}
              onClick={() => onStepClick(index)}
              type="button"
            >
              <span aria-hidden="true" className="wizard-stepper__number">
                {index < current ? "✓" : index + 1}
              </span>
              <span className="wizard-stepper__label">{t(step)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
