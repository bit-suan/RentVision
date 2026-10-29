import Button from "@/components/ui/Button";
import SearchNearMeButton from "@/components/home/SearchNearMeButton";
import FeaturedListings from "@/components/home/FeaturedListings";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}



const TRUST_HIGHLIGHTS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "100% Verified Listings",
    description: "Inspected properties with genuine photos and verified ownership in Addis Ababa.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    title: "360° Virtual Walkthroughs",
    description: "Inspect every room room-by-room before commuting across Addis Ababa traffic.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "Direct Landlord Rates",
    description: "Transparent pricing with no inflated fees or unexpected broker markups.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    title: "Prime Addis Locations",
    description: "Top-tier homes across Bole, Kazanchis, CMC, Sar Bet, and Old Airport.",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Search & Filter Addis Rentals",
    description:
      "Filter by neighborhood, price in ETB, bedrooms, and critical Addis essentials like backup generators and water reserve tanks.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Tour in 360° High Definition",
    description:
      "Walk room-by-room through properties right on your phone or laptop. Gauge true room dimensions, ceiling heights, and finishes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Connect & Move In Confidently",
    description:
      "Reach verified property owners directly, ask lease questions with our AI assistant, and finalize your tenancy with peace of mind.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Landing" });

  return (
    <div className="landing-page">
      {/* Full-width Hero Section without side image */}
      <section className="landing-hero landing-hero--full" aria-labelledby="home-heading">


        <h1 id="home-heading" className="landing-hero__title">
          Find a Home You Can Trust in Addis.
          <span className="landing-hero__title-accent">Walk Inside Before You Visit.</span>
        </h1>

        <p className="landing-hero__subtitle">
          Discover verified apartments, villas, and family residences across Addis Ababa.
          Experience true-to-scale 360° virtual tours with 100% transparent pricing and direct landlord contact.
        </p>

        {/* Unified Full-Width Search Panel */}
        <form
          action={`/${locale}/properties`}
          className="landing-search landing-search--wide"
          method="get"
        >
          <div className="landing-search__grid">
            <label className="search-field">
              <span className="search-field__label">Neighborhood or Location</span>
              <div className="search-field__control">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  name="q"
                  placeholder="Try Bole, Kazanchis, CMC..."
                  type="text"
                  list="addis-neighborhoods"
                />
                <datalist id="addis-neighborhoods">
                  <option value="Bole" />
                  <option value="Kazanchis" />
                  <option value="CMC" />
                  <option value="Sar Bet" />
                  <option value="Old Airport" />
                  <option value="4 Kilo" />
                </datalist>
              </div>
            </label>

            <label className="search-field">
              <span className="search-field__label">Property Type</span>
              <div className="search-field__control">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="16" height="20" x="4" y="2" rx="2" />
                  <path d="M9 22v-4h6v4" />
                </svg>
                <select defaultValue="" name="propertyType">
                  <option value="">Any Type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Condominium">Condominium</option>
                </select>
              </div>
            </label>

            <label className="search-field">
              <span className="search-field__label">Max Rent (ETB)</span>
              <div className="search-field__control">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <select defaultValue="" name="maximumPrice">
                  <option value="">Any Budget</option>
                  <option value="25000">Up to 25,000 ETB</option>
                  <option value="50000">Up to 50,000 ETB</option>
                  <option value="100000">Up to 100,000 ETB</option>
                  <option value="200000">Up to 200,000 ETB</option>
                </select>
              </div>
            </label>

            <label className="search-field">
              <span className="search-field__label">Bedrooms</span>
              <div className="search-field__control">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
                </svg>
                <select defaultValue="" name="minimumBedrooms">
                  <option value="">Any</option>
                  <option value="1">1+ Bed</option>
                  <option value="2">2+ Beds</option>
                  <option value="3">3+ Beds</option>
                  <option value="4">4+ Beds</option>
                </select>
              </div>
            </label>

            <div className="search-field search-field--action">
              <button className="landing-search__submit-btn" type="submit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search</span>
              </button>
            </div>
          </div>

          <div className="landing-search__trending">
            <span className="trending-title">Trending Areas:</span>
            <Link href="/properties?q=Bole" className="trending-chip">Bole</Link>
            <Link href="/properties?q=Kazanchis" className="trending-chip">Kazanchis</Link>
            <Link href="/properties?q=CMC" className="trending-chip">CMC</Link>
            <Link href="/properties?q=Sar+Bet" className="trending-chip">Sar Bet</Link>
            <Link href="/properties?q=Old+Airport" className="trending-chip">Old Airport</Link>
          </div>
        </form>

        <div className="landing-hero__quick-actions">
          <Button href="/properties" variant="secondary">
            {t("exploreProperties")}
          </Button>
          <SearchNearMeButton />
        </div>
      </section>

      {/* Why Us Section (matches Image 3) */}
      <section className="landing-trust-bar" id="why-us" aria-label="Why RentVision">
        <div className="landing-trust-bar__inner">
          {TRUST_HIGHLIGHTS.map((item) => (
            <div key={item.title} className="trust-highlight-item">
              <div className="trust-highlight-item__icon-wrap">{item.icon}</div>
              <div>
                <strong className="trust-highlight-item__title">{item.title}</strong>
                <p className="trust-highlight-item__desc">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="landing-section" aria-labelledby="featured-heading">
        <div className="landing-section__header">
          <div>
            <h2 id="featured-heading" className="landing-section__title">Featured Rentals</h2>
            <p className="landing-section__subtitle">
              Hand-picked, verified homes with backup power, water reserves, and 360° virtual tours.
            </p>
          </div>
          <Link className="section-cta-link" href="/properties">
            <span>View all rentals</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-icon">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <FeaturedListings limit={4} />
      </section>

      {/* 360 Virtual Tour Spotlight Section (Matches Screenshot 2) */}
      <section className="landing-section landing-tour-spotlight-section" aria-labelledby="tour-spotlight-heading">
        <div className="tour-spotlight-banner">
          <div className="tour-spotlight-banner__content">
            <div className="tour-spotlight__tag">
              <span className="sparkle">✦</span>
              <span>RENTVISION 360° TECHNOLOGY</span>
            </div>

            <h2 id="tour-spotlight-heading" className="tour-spotlight__title">
              Tour Properties Virtually — <br className="tour-title-br" />Save Hours of Commuting
            </h2>

            <p className="tour-spotlight__desc">
              Navigating traffic across Addis Ababa to inspect homes can take days. RentVision lets you walk through verified apartments and villas room-by-room in high definition from your phone or laptop.
            </p>

            <ul className="tour-spotlight__points">
              <li className="tour-spotlight__point">
                <span className="tour-point__check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="check-icon">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <strong>True-to-Scale Perspectives</strong>
                  <p>Accurate dimensions, natural daylight, and genuine room heights with zero lens distortion.</p>
                </div>
              </li>
              <li className="tour-spotlight__point">
                <span className="tour-point__check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="check-icon">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <strong>Inspect Finishes &amp; Utilities</strong>
                  <p>Check kitchen cabinetry, bathrooms, generator connections, and water tank systems.</p>
                </div>
              </li>
              <li className="tour-spotlight__point">
                <span className="tour-point__check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="check-icon">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <strong>Filter Confidently Before Visiting</strong>
                  <p>Visit only the properties you already love, saving up to 80% of your time.</p>
                </div>
              </li>
            </ul>

            <div className="tour-spotlight__actions">
              <Link href="/listings/listing-bole-loft/tour" className="tour-btn tour-btn--primary">
                Open Sample 360° Tour
              </Link>
              <Link href="/properties?hasTour=true" className="tour-btn tour-btn--secondary">
                Browse Tour-Enabled Homes
              </Link>
            </div>
          </div>

          <div className="tour-spotlight-banner__visual">
            <Link href="/listings/listing-bole-loft/tour" className="tour-visual-card" aria-label="Open 360 interactive tour preview">
              <div className="tour-visual-card__image-container">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80"
                  alt="360 Tour interactive walkthrough preview"
                  className="tour-visual-card__img"
                />
                <div className="tour-visual-card__overlay" />

                {/* 360 Interactive Panorama Badge */}
                <div className="tour-visual__badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="badge-compass-icon">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                  <span>360° Interactive Panorama</span>
                </div>

                {/* Hotspot Pins */}
                <div className="tour-hotspot-pin tour-hotspot-pin--living">
                  <span className="hotspot-dot" />
                  <span className="hotspot-label">Living Room</span>
                </div>

                <div className="tour-hotspot-pin tour-hotspot-pin--bedroom">
                  <span className="hotspot-dot" />
                  <span className="hotspot-label">Master Bedroom</span>
                </div>

                <div className="tour-hotspot-pin tour-hotspot-pin--balcony">
                  <span className="hotspot-dot" />
                  <span className="hotspot-label">Balcony View</span>
                </div>

                {/* Start Walkthrough Button */}
                <div className="tour-visual__cta-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="play-triangle">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Click to Start Walkthrough</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How RentVision Works */}
      <section className="landing-section landing-how-section" id="how-it-works" aria-labelledby="how-heading">
        <div className="landing-section__header-center">
          <span className="section-badge">SIMPLE &amp; TRANSPARENT</span>
          <h2 id="how-heading" className="landing-section__title">How RentVision Works</h2>
          <p className="landing-section__subtitle">
            Three simple steps to finding your ideal rental home in Addis Ababa without the headache.
          </p>
        </div>

        <div className="how-vision-grid">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <article className="how-vision-card" key={step.step}>
              <div className="how-vision-card__top">
                <span className="how-vision-card__step">{step.step}</span>
                <div className="how-vision-card__icon">{step.icon}</div>
              </div>
              <h3 className="how-vision-card__title">{step.title}</h3>
              <p className="how-vision-card__desc">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Landlord CTA Banner */}
      <section className="landing-section" aria-labelledby="landlord-heading">
        <div className="landing-landlord-banner">
          <div className="landlord-banner__content">
            <span className="landlord-banner__eyebrow">FOR PROPERTY OWNERS &amp; MANAGERS</span>
            <h2 id="landlord-heading" className="landlord-banner__title">
              Own Property in Addis Ababa? List on RentVision.
            </h2>
            <p className="landlord-banner__desc">
              Connect with high-intent, qualified tenants faster. Get verified listing status,
              complimentary 360° virtual tour staging, and a dedicated landlord dashboard.
            </p>
            <div className="landlord-banner__actions">
              <Button href="/landlord/properties/new" variant="primary">
                List Your Property
              </Button>
              <Link href="/landlord/properties" className="landlord-banner__link">
                <span>Go to Landlord Portal</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-icon">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
