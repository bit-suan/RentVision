import Button from "@/components/ui/Button";

export default function PropertyNotFound() {
  return (
    <section className="property-not-found state-panel">
      <p className="eyebrow">Property unavailable</p>
      <h1>Property not found</h1>
      <p>
        This listing may have been removed or the address may be incorrect.
      </p>
      <Button href="/properties" variant="secondary">
        Back to properties
      </Button>
    </section>
  );
}
