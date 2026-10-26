import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <section aria-live="assertive" className="state-panel state-panel--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <div style={{ marginTop: '1rem' }}>
          <Button onClick={onRetry} variant="secondary">
            Retry
          </Button>
        </div>
      )}
    </section>
  );
}
