"use client";

import { Suspense, FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { askLeaseQuestion, getListing } from "@/lib/api";
import type { LeaseQAResponse, Listing } from "@/lib/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

function LeaseContent() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<LeaseQAResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingListing, setFetchingListing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getListing(params.id)
      .then(setListing)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load property")
      )
      .finally(() => setFetchingListing(false));
  }, [params.id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await askLeaseQuestion(params.id, question);
      setAnswer(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Q&A failed");
    } finally {
      setLoading(false);
    }
  }

  if (fetchingListing) return <div style={{ padding: "8rem", textAlign: "center" }}><Spinner label="Loading property details..." /></div>;
  if (!listing) return <ErrorState message="Property not found" />;

  return (
    <main className="page">
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <p style={{ marginBottom: "1rem" }}>
          <Link href={`/properties/${params.id}`}>← Back to property</Link>
        </p>

        <article className="detail-card">
          <h1>Lease Q&amp;A</h1>
          <p className="muted">
            Ask about rent, deposit, notice period, or utilities. The AI analyzes the lease agreement for <strong>{listing.title}</strong> to provide answers.
          </p>

          <form className="qa-form" onSubmit={onSubmit} style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g., How much is the security deposit? Is water included in the rent?"
              style={{
                width: "100%",
                minHeight: "120px",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" disabled={loading || !question.trim()}>
                {loading ? "Analyzing Lease..." : "Ask Question"}
              </Button>
            </div>
          </form>

          {error && (
            <div style={{ marginTop: "2rem" }}>
              <ErrorState message={error} />
            </div>
          )}

          {answer && (
            <div className="answer" style={{ marginTop: "2.5rem", padding: "2rem", background: "#f9f9f9", borderRadius: "12px", borderLeft: "4px solid #0f6b3f" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Answer</h3>
              <p style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>{answer.answer}</p>
              <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  fontSize: "0.85rem",
                  padding: "4px 8px",
                  background: answer.confidence > 0.7 ? "#e6f4ea" : "#fff9e6",
                  color: answer.confidence > 0.7 ? "#0f6b3f" : "#856404",
                  borderRadius: "4px",
                  fontWeight: "600",
                }}>
                  Confidence: {(answer.confidence * 100).toFixed(0)}%
                </span>
                {answer.sourcePage && (
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    Source: Page {answer.sourcePage}
                  </span>
                )}
              </div>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}

export default function LeasePage() {
  return (
    <Suspense fallback={<div style={{ padding: "8rem", textAlign: "center" }}><Spinner label="Loading..." /></div>}>
      <ProtectedRoute>
        <LeaseContent />
      </ProtectedRoute>
    </Suspense>
  );
}
