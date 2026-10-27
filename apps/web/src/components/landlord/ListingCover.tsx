"use client";

import { useEffect, useState } from "react";
import { getDownloadUrl } from "@/lib/api";

/**
 * Resolves a short-lived signed URL for a listing's first photo. Media keys
 * are never rendered directly because the bucket is private.
 */
export default function ListingCover({
  mediaKeys,
  alt,
  emptyLabel,
  className = "landlord-cover",
}: {
  mediaKeys: string[] | undefined;
  alt: string;
  emptyLabel: string;
  className?: string;
}) {
  const key = mediaKeys?.[0];
  const [resolved, setResolved] = useState<{
    key: string;
    url: string | null;
  } | null>(null);
  const current = key && resolved?.key === key ? resolved : null;
  const url = current?.url ?? null;
  const loading = Boolean(key) && !current;

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    getDownloadUrl(key)
      .then((result) => {
        if (!cancelled) setResolved({ key, url: result.downloadUrl });
      })
      .catch(() => {
        if (!cancelled) setResolved({ key, url: null });
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  if (key && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} className={className} src={url} />
    );
  }

  return (
    <div className={`${className} ${className}--empty`}>
      {loading ? "" : emptyLabel}
    </div>
  );
}
