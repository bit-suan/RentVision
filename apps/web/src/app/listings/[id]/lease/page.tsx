"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { askLeaseQuestion } from "@/lib/api";
import type { LeaseQAResponse } from "@/lib/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

export default function LeasePage() {
  return (
    <ProtectedRoute>
      <LeaseContent />
    </ProtectedRoute>
  );
}

function LeaseContent() {
  const params = useParams<{ id: string }>();
  const [question, setQuestion] = useState("What is the monthly rent and when is it due?");
  const [answer, setAnswer] = useState<LeaseQAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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

  return (
    <main className="page">
      <p>
        <Link href={`/listings/${params.id}`}>Back to listing</Link>
      </p>
      <article className="detail-card">
        <h1>Lease Q&A</h1>
        <p className="muted">
          Ask about rent, deposit, notice period, or utilities. The API forwards
          the question to the Python extraction service.
        </p>
        <form className="qa-form" onSubmit={onSubmit}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Reading lease..." : "Ask"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        {answer ? (
          <div className="answer">
            <p>{answer.answer}</p>
            <p className="muted">
              Confidence {(answer.confidence * 100).toFixed(0)}%
              {answer.sourcePage ? ` · page ${answer.sourcePage}` : ""}
            </p>
          </div>
        ) : null}
      </article>
    </main>
  );
}
