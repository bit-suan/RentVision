import Badge from "@/components/ui/Badge";
import { useTranslations } from "next-intl";

interface PropertyTrustProps {
  status: string;
}

export default function PropertyTrust({ status }: PropertyTrustProps) {
  const t = useTranslations("PropertyTrust");
  const tTrust = useTranslations("TrustStatus");

  const statusLabel = status
    ? (tTrust.has(status) ? tTrust(status) : status)
    : null;

  return (
    <section aria-labelledby="property-trust-heading" className="detail-panel">
      <h2 id="property-trust-heading">{t("heading")}</h2>
      {statusLabel ? (
        <Badge tone="warning">{statusLabel}</Badge>
      ) : (
        <p>{t("noInfo")}</p>
      )}
    </section>
  );
}
