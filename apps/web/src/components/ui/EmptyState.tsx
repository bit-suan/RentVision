import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <section aria-live="polite" className="state-panel">
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <div style={{ marginTop: '1.5rem' }}>{action}</div>}
    </section>
  );
}
