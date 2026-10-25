interface SpinnerProps {
  label?: string;
}

export default function Spinner({ label = "Loading" }: SpinnerProps) {
  return (
    <span className="spinner" role="status">
      <span aria-hidden="true" className="spinner__icon" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
