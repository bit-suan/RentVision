"use client";

import type { Listing } from "@/lib/types";
import EmptyState from "@/components/ui/EmptyState";
import ListingCard from "@/components/property/ListingCard";
import Button from "@/components/ui/Button";

interface ListingGridProps {
  listings: Listing[];
}

export default function ListingGrid({ listings }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <EmptyState
        title="No properties found"
        message="Try changing your search or filters to see more rental options."
        action={
          <Button href="/properties" variant="secondary">
            Clear all filters
          </Button>
        }
      />
    );
  }

  return (
    <section aria-label="Property results" className="property-grid">
      {listings.map((listing) => (
        <ListingCard key={listing.listingId} listing={listing} />
      ))}
    </section>
  );
}
