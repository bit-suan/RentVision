import type { InputHTMLAttributes } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export default function Input({
  id,
  label,
  hint,
  error,
  className,
  ...inputProps
}: InputProps) {
  const descriptionId = hint || error ? `${id}-description` : undefined;

  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <input
        {...inputProps}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={[
          "form-field__control",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        id={id}
      />
      {error ? (
        <span className="form-field__error" id={descriptionId}>
          {error}
        </span>
      ) : hint ? (
        <span className="form-field__hint" id={descriptionId}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
