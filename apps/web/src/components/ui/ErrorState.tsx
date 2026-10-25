interface ErrorStateProps {
  title?: string;
  message: string;
}

export default function ErrorState({
  title = "Something went wrong",
  message,
}: ErrorStateProps) {
  return (
    <section aria-live="assertive" className="state-panel state-panel--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
