import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  options: SelectOption[];
  hint?: string;
}

export default function Select({
  id,
  label,
  options,
  hint,
  className,
  ...selectProps
}: SelectProps) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <select
        {...selectProps}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={["form-field__control", className]
          .filter(Boolean)
          .join(" ")}
        id={id}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span className="form-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
