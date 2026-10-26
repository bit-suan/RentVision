"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { getListing } from "@/lib/api";
import type { Listing } from "@/lib/types";

export default function InquiryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "8rem", textAlign: "center" }}><Spinner label="Loading..." /></div>}>
      <ProtectedRoute>
        <InquiryForm />
      </ProtectedRoute>
    </Suspense>
  );
}

function InquiryForm() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    getListing(params.id)
      .then(setListing)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load property")
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.warn("Backend has no inquiry endpoint. This is a UI integration boundary.");
      setError(
        "The inquiry service is currently unavailable (Backend API endpoint missing). Please contact the landlord directly if contact information is available."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: "8rem", textAlign: "center" }}><Spinner label="Loading property details..." /></div>;
  if (!listing) return <ErrorState message="Property not found" />;

  return (
    <main className="page">
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <p style={{ marginBottom: "1rem" }}>
          <Link href={`/properties/${listing.listingId}`}>← Back to property</Link>
        </p>

        <article className="detail-card">
          <h1>Express Interest</h1>
          <p className="muted">
            You are inquiring about: <strong>{listing.title}</strong>
          </p>
          <p className="price">
            {listing.price.toLocaleString()} {listing.currency} / month
          </p>

          {submitted ? (
            <div style={{ padding: "2rem", textAlign: "center", background: "#e6f4ea", borderRadius: "8px", marginTop: "2rem" }}>
              <h2 style={{ color: "#0f6b3f" }}>Inquiry Sent!</h2>
              <p>The landlord has been notified of your interest. They will contact you via your registered email.</p>
              <div style={{ marginTop: "1rem" }}>
                <Button href="/properties">Browse more properties</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Input
                id="inquiry-message"
                label="Your Message"
                name="message"
                placeholder="I am interested in this property. When can I schedule a viewing?"
                required
              />
              <div style={{ padding: "1rem", background: "#fff9e6", borderRadius: "8px", border: "1px solid #ffeeba", fontSize: "0.9rem" }}>
                <strong>Note:</strong> Your contact information from your RentVision account will be shared with the landlord.
              </div>

              {error && <p style={{ color: "#d93025", fontSize: "0.9rem" }}>{error}</p>}

              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Submit Inquiry"}
              </Button>
            </form>
          )}
        </article>
      </div>
    </main>
  );
}
