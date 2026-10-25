import Badge from "@/components/ui/Badge";

interface PropertyTrustProps {
  status: string;
}

export default function PropertyTrust({ status }: PropertyTrustProps) {
  return (
    <section aria-labelledby="property-trust-heading" className="detail-panel">
      <h2 id="property-trust-heading">Trust information</h2>
      {status ? (
        <Badge tone="warning">{status}</Badge>
      ) : (
        <p>No trust information is available for this listing.</p>
      )}
    </section>
  );
}
