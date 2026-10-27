"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ListingGrid from "@/components/property/ListingGrid";
import ListingSearchControls from "@/components/property/ListingSearchControls";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { searchListings } from "@/lib/api";
import type { Listing, ListingSearchQuery } from "@/lib/types";
import { PropertyMap } from "@/components/MapExplorer";

export default function ListingDiscovery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
const mapCenterTimeout = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(
    (searchParams.get("viewMode") as 'grid' | 'map') || 'grid'
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = useMemo(() => {
    const params: ListingSearchQuery = {};
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radiusKm = searchParams.get("radiusKm");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const bedrooms = searchParams.get("bedrooms");
    const propertyType = searchParams.get("propertyType");
    const hasTour = searchParams.get("hasTour");
    const offset = searchParams.get("offset");

    if (lat) params.lat = Number(lat);
    if (lng) params.lng = Number(lng);
    if (radiusKm) params.radiusKm = Number(radiusKm);
    if (minPrice) params.minPrice = Number(minPrice);
    if (maxPrice) params.maxPrice = Number(maxPrice);
    if (bedrooms) params.bedrooms = Number(bedrooms);
    if (propertyType) params.propertyType = propertyType;
    if (hasTour === "true" || hasTour === "1") params.hasTour = true;
    if (offset) params.offset = Number(offset);
    params.limit = 12; // Default page size

    return params;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    
    searchListings(filters)
      .then((result) => {
        if (!cancelled) {
          setListings(result.items);
          setTotalCount(result.count);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listings");
          setListings([]);
          setTotalCount(0);
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
  }, [filters]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextOffset = (filters.offset || 0) + (filters.limit || 12);
    
    searchListings({ ...filters, offset: nextOffset })
      .then((result) => {
        setListings(prev => [...prev, ...result.items]);
        const params = new URLSearchParams(searchParams.toString());
        params.set("offset", String(nextOffset));
        router.replace(`/properties?${params.toString()}`, { scroll: false });
      })
      .catch((err) => {
        console.error("Failed to load more", err);
      })
      .finally(() => {
        setLoadingMore(false);
      });
  };

  const handleFilterChange = useCallback((newFilters: ListingSearchQuery) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });
    router.push(`/properties?${params.toString()}`);
  }, [router]);

  // Debounced map center change to avoid excessive API requests
  const handleMapCenterChange = useCallback((lat: number, lng: number) => {
    if (mapCenterTimeout.current) {
      clearTimeout(mapCenterTimeout.current);
    }
    mapCenterTimeout.current = setTimeout(() => {
      handleFilterChange({ ...filters, lat, lng });
    }, 800);
  }, [filters, handleFilterChange]);

  if (error) {
    return (
      <div className="properties-page">
        <ErrorState 
          title="Search Error" 
          message={error} 
          onRetry={() => window.location.reload()} 
        />
      </div>
    );
  }

  return (
    <div className="properties-page">
      <header className="page-intro">
        <p className="eyebrow">Property discovery</p>
        <h1>Discover rental properties</h1>
        <p>
          Explore rental homes across Addis Ababa. Search by location, compare
          prices, and narrow the results to find a place that fits your needs.
        </p>
      </header>

      {filters.lat !== undefined && filters.lng !== undefined && (
        <div className="near-me-banner">
          <div className="near-me-banner__content">
            <span className="near-me-banner__badge"> Proximity Search</span>
            <span className="near-me-banner__text">
              Showing rentals within {filters.radiusKm || 10} km of your location
            </span>
          </div>
          <div className="near-me-banner__actions">
            <label className="near-me-banner__label">
              <span>Radius:</span>
              <select
                className="near-me-radius-select"
                value={filters.radiusKm || 10}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("radiusKm", e.target.value);
                  params.delete("offset");
                  router.replace(`/properties?${params.toString()}`);
                }}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="15">15 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </select>
            </label>
            <button
              type="button"
              className="near-me-clear-btn"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("lat");
                params.delete("lng");
                params.delete("radiusKm");
                params.delete("nearMe");
                params.delete("offset");
                router.replace(`/properties?${params.toString()}`);
              }}
            >
              Clear location
            </button>
          </div>
        </div>
      )}

      <div className="discovery-controls-wrapper" style={{ marginBottom: '2rem' }}>
        <ListingSearchControls 
          filters={filters} 
          onFilterChange={handleFilterChange} 
        />
        
        <div className="view-switcher" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#f4f4f4', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '6px', 
                border: 'none', 
                background: viewMode === 'grid' ? 'white' : 'transparent',
                boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              List View
            </button>
            <button 
              onClick={() => setViewMode('map')}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '6px', 
                border: 'none', 
                background: viewMode === 'map' ? 'white' : 'transparent',
                boxShadow: viewMode === 'map' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              Map View
            </button>
          </div>
        </div>
      </div>

      <section aria-live="polite" className="property-results">
        <div className="property-results__heading" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Rental properties</h2>
            <p className="muted" style={{ margin: 0 }}>
              {loading ? "Searching..." : `${listings.length} ${listings.length === 1 ? "property" : "properties"} found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner label="Loading listings..." />
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <>
                <ListingGrid listings={listings} />
                {listings.length < totalCount && (
                  <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      onClick={handleLoadMore} 
                      disabled={loadingMore}
                      variant="secondary"
                    >
                      {loadingMore ? "Loading..." : `Load more (${totalCount - listings.length} remaining)`}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ height: '600px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ddd' }}>
                <PropertyMap 
                  listings={listings} 
                  center={filters.lat && filters.lng ? { lat: filters.lat, lng: filters.lng } : undefined}
                  radiusKm={filters.radiusKm}
                  selectedId={selectedId}
                  onSelectListing={setSelectedId}
                  onCenterChange={handleMapCenterChange}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
