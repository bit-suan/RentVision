interface EmptyStateProps {
  title: string;
  message: string;
}

export default function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <section aria-live="polite" className="state-panel">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
