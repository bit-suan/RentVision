import { redirect } from "next/navigation";

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

export function generateStaticParams() {
  return DEMO_IDS.map((id) => ({ id }));
}

interface LeaseRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function LeaseRedirect({ params }: LeaseRedirectProps) {
  const { id } = await params;
  redirect(`/en/listings/${id}/lease`);
}
