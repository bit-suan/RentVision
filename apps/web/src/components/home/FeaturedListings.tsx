"use client";

import { useEffect, useState } from "react";
import ListingGrid from "@/components/property/ListingGrid";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import { searchListings } from "@/lib/api";
import type { Listing } from "@/lib/types";

interface FeaturedListingsProps {
  limit?: number;
}

/** Newest approved listings from the API, shown in the home page "Featured Rentals" section. */
export default function FeaturedListings({ limit = 4 }: FeaturedListingsProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    searchListings({ limit })
      .then((result) => {
        if (!cancelled) {
          setListings(result.items);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listings");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (loading) {
    return <Spinner label="Loading featured rentals..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load rentals"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <ListingGrid listings={listings} />;
}
