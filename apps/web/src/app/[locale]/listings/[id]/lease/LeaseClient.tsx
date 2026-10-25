"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { askLeaseQuestion } from "@/lib/api";
import type { LeaseQAResponse } from "@/lib/types";

export default function LeaseClient() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("Lease");
  const [question, setQuestion] = useState(t("defaultQuestion"));
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
      setError(err instanceof Error ? err.message : t("qaFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <p>
        <Link href={`/listings/${params.id}`}>{t("backToListing")}</Link>
      </p>
      <article className="detail-card">
        <h1>{t("title")}</h1>
        <p className="muted">{t("description")}</p>
        <form className="qa-form" onSubmit={onSubmit}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="button" type="submit" disabled={loading}>
            {loading ? t("readingLease") : t("ask")}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        {answer ? (
          <div className="answer">
            <p>{answer.answer}</p>
            <p className="muted">
              {t("confidence", {
                confidence: (answer.confidence * 100).toFixed(0),
              })}
              {answer.sourcePage
                ? t("pageNumber", { page: answer.sourcePage })
                : ""}
            </p>
          </div>
        ) : null}
      </article>
    </main>
  );
}
