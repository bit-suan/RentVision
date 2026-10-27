"use client";

import { useCallback, useEffect, useState } from "react";
import { listMyListings } from "@/lib/api";
import type { Listing } from "@/lib/types";

interface MyListingsState {
  items: Listing[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unable to load your listings.";
}

/**
 * Loads the signed-in landlord's listings from the API. There is no mock
 * fallback here on purpose: the landlord portal must never display invented
 * portfolio data.
 */
export function useMyListings(): MyListingsState {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(() => listMyListings(), []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchListings();
      setItems(result.items);
    } catch (loadError) {
      setError(toMessage(loadError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchListings]);

  useEffect(() => {
    let cancelled = false;

    fetchListings()
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(toMessage(loadError));
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchListings]);

  return { items, loading, error, reload };
}
