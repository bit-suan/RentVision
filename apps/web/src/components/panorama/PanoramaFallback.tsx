interface PanoramaFallbackProps {
  message?: string;
}

export default function PanoramaFallback({
  message = "A 360-degree view is not available for this property yet. The property photo gallery is still available above.",
}: PanoramaFallbackProps) {
  return (
    <div className="tour-placeholder" role="status">
      <p>{message}</p>
    </div>
  );
}
