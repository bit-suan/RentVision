import { useTranslations } from "next-intl";

interface PanoramaFallbackProps {
  message?: string;
}

export default function PanoramaFallback({ message }: PanoramaFallbackProps) {
  const t = useTranslations("Panorama");
  const displayMessage = message ?? t("unavailable");

  return (
    <div className="tour-placeholder" role="status">
      <p>{displayMessage}</p>
    </div>
  );
}
