interface SpinnerProps {
  label?: string;
  className?: string;
}

export default function Spinner({
  label = "Loading",
  className,
}: SpinnerProps) {
  return (
    <span
      className={["spinner", className].filter(Boolean).join(" ")}
      role="status"
    >
      <span aria-hidden="true" className="spinner__icon" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
