"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import ListingCard from "@/components/property/ListingCard";
import Spinner from "@/components/ui/Spinner";
import { searchListings } from "@/lib/api";
import type { Listing } from "@/lib/types";

export default function Home() {
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchListings({ limit: 3 })
      .then((res) => setFeaturedListings(res.items))
      .catch((err) => console.error("Failed to load featured listings", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <section className="hero" style={{ 
        padding: '6rem 2rem', 
        background: 'linear-gradient(rgba(10, 76, 45, 0.8), rgba(10, 76, 45, 0.9)), url("/images/landing/modern-home.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: '800' }}>
            Find your next home in Addis Ababa
          </h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '2.5rem', opacity: 0.9 }}>
            AI-assisted property discovery with 360° virtual tours and verified lease details.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Button href="/properties" variant="primary">
              Browse Properties
            </Button>
            <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid white', borderRadius: '8px' }}>
              <Button href="/properties?viewMode=map" variant="secondary">
                Explore on Map
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>Featured Rentals</h2>
            <p className="muted">Hand-picked properties across the city</p>
          </div>
          <Link href="/properties" style={{ color: '#0f6b3f', fontWeight: '600' }}>
            View all properties →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Spinner label="Loading featured properties..." />
          </div>
        ) : (
          <div className="property-grid">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.listingId} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <section style={{ padding: '5rem 2rem', background: '#f4f4f4' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Smart Search</h3>
            <p>Search by neighborhood, price range, and amenities. Our AI helps you find the perfect match for your lifestyle.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Virtual Tours</h3>
            <p>Save time by exploring properties in immersive 360° before you visit. See every corner from the comfort of your home.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Lease AI</h3>
            <p>Get instant answers to complex lease questions. Our AI reads the fine print so you don&apos;t have to.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
