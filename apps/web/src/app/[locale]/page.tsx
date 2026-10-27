import Button from "@/components/ui/Button";
import PropertyCard from "@/components/property/PropertyCard";
import { getProperties } from "@/lib/properties";
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

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Landing" });
  const properties = getProperties().slice(0, 4);

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="landing-hero" aria-labelledby="home-heading">
        <div className="landing-hero__content">
          <p className="eyebrow">RentVision · Addis Ababa</p>
          <h1 id="home-heading">Find a Place You Can Trust.</h1>
          <p className="landing-hero__tagline">
            {t("tagline") === "Find a place you can trust."
              ? "Discover rental homes across Addis Ababa."
              : t("tagline")}
          </p>
          <p className="landing-hero__description">
            Discover rental homes across Addis Ababa with detailed listings, virtual
            tours, and tools that help you make informed decisions.
          </p>

          <form
            action={`/${locale}/properties`}
            className="property-search-panel landing-search"
            method="get"
          >
            <div className="landing-search__row">
              <label className="form-field">
                <span>Neighborhood or location</span>
                <input name="q" placeholder="Try Bole or Kazanchis" type="text" />
              </label>
              <label className="form-field">
                <span>Property type</span>
                <select defaultValue="" name="propertyType">
                  <option value="">Any type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                </select>
              </label>
              <label className="form-field">
                <span>Min rent (ETB)</span>
                <input
                  min={0}
                  name="minimumPrice"
                  placeholder="0"
                  type="number"
                />
              </label>
              <label className="form-field">
                <span>Max rent (ETB)</span>
                <input
                  min={0}
                  name="maximumPrice"
                  placeholder="100000"
                  type="number"
                />
              </label>
              <label className="form-field">
                <span>Bedrooms</span>
                <select defaultValue="" name="minimumBedrooms">
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </label>
              <div className="landing-search__actions">
                <Button className="landing-search__submit" type="submit">
                  Search
                </Button>
                <Button
                  className="landing-search__reset"
                  type="reset"
                  variant="quiet"
                >
                  Reset
                </Button>
              </div>
            </div>
          </form>

          <div className="landing-hero__actions">
            <Button href="/properties" variant="secondary">
              {t("exploreProperties")}
            </Button>
            <Button href="/map" variant="quiet">
              {t("searchOnMap")}
            </Button>
          </div>
        </div>

        <div
          className="landing-hero__image"
          role="img"
          aria-label={t("heroAlt")}
        />
      </section>

      {/* Featured properties */}
      <section className="landing-section" aria-labelledby="featured-heading">
        <div className="landing-section__header">
          <h2 id="featured-heading">Featured rentals</h2>
          <Link className="button button--quiet" href="/properties">
            View all
          </Link>
        </div>
        <div className="property-grid">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      {/* Popular neighborhoods */}
      <section className="landing-section" aria-labelledby="neighborhoods-heading">
        <h2 id="neighborhoods-heading">Popular neighborhoods</h2>
        <p className="muted">Explore well-known areas across Addis Ababa.</p>
        <div className="neighborhood-grid">
          {["Bole", "Kazanchis", "CMC", "Sar Bet", "Old Airport", "4 Kilo"].map(
            (name) => (
              <Link
                className="neighborhood-card"
                href={`/properties?q=${encodeURIComponent(name)}`}
                key={name}
              >
                <span>{name}</span>
              </Link>
            )
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section" id="how-it-works" aria-labelledby="how-heading">
        <h2 id="how-heading">How RentVision works</h2>
        <div className="how-grid">
          <article className="how-card">
            <span className="how-card__step">1</span>
            <h3>Search</h3>
            <p>Filter by neighborhood, rent, bedrooms, and property type.</p>
          </article>
          <article className="how-card">
            <span className="how-card__step">2</span>
            <h3>Compare</h3>
            <p>Review photos, amenities, and location details.</p>
          </article>
          <article className="how-card">
            <span className="how-card__step">3</span>
            <h3>Tour</h3>
            <p>Open the 360° virtual tour where available.</p>
          </article>
        </div>
      </section>

      {/* Trust & safety */}
      <section className="landing-section" id="trust-safety" aria-labelledby="trust-heading">
        <h2 id="trust-heading">Trust &amp; Safety</h2>
        <div className="trust-grid">
          <article className="trust-card">
            <h3>Verified information</h3>
            <p>
              Listing status and trust signals are shown only when backed by
              backend data.
            </p>
          </article>
          <article className="trust-card">
            <h3>Duplicate detection</h3>
            <p>Suspicious listings are flagged for human review, not auto-rejected.</p>
          </article>
          <article className="trust-card">
            <h3>Secure media</h3>
            <p>Images and tours are delivered through signed URLs.</p>
          </article>
        </div>
      </section>

      {/* Virtual tour promotion */}
      <section
        className="landing-section landing-tour-promo"
        aria-labelledby="tour-promo-heading"
      >
        <div>
          <h2 id="tour-promo-heading">Explore with virtual tours</h2>
          <p className="muted">
            Walk through properties from anywhere with interactive 360° panoramas.
          </p>
          <Button href="/listings/listing-bole-loft/tour">Open a sample tour</Button>
        </div>
        <div className="tour-promo__image" role="img" aria-label="Virtual tour preview" />
      </section>

      {/* Landlord CTA */}
      <section
        className="landing-section landing-landlord-cta"
        aria-labelledby="landlord-heading"
      >
        <h2 id="landlord-heading">Are you a landlord?</h2>
        <p className="muted">List your property and reach renters across Addis Ababa.</p>
        <Button href="/properties">List your property</Button>
      </section>
    </div>
  );
}
