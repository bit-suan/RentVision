import type { TextareaHTMLAttributes } from "react";

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export default function Textarea({
  id,
  label,
  hint,
  error,
  className,
  ...textareaProps
}: TextareaProps) {
  const descriptionId = hint || error ? `${id}-description` : undefined;

  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <textarea
        {...textareaProps}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={["form-field__control", "form-field__textarea", className]
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
