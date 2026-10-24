import Button from "@/components/ui/Button";

const features = [
  {
    title: "Discover",
    description: "Search properties",
    imagePosition: "bedroom",
    alt: "Warm, naturally lit bedroom with a neatly made bed",
    icon: "search",
  },
  {
    title: "Trust",
    description: "Duplicate detection",
    imagePosition: "bathroom",
    alt: "Modern bathroom with shower, vanity, and mirror",
    icon: "shield",
  },
  {
    title: "Understand",
    description: "AI lease insights",
    imagePosition: "living-room",
    alt: "Warm, naturally lit living room with a sofa",
    icon: "brain",
  },
] as const;

function FeatureIcon({ name }: { name: (typeof features)[number]["icon"] }) {
  if (name === "search") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <circle cx="10.8" cy="10.8" r="7.1" />
        <path d="m16 16 5 5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path d="M12 3 20 6v5.5c0 4.8-3.2 7.8-8 9.5-4.8-1.7-8-4.7-8-9.5V6l8-3Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M10 4.2a3 3 0 0 0-5.3 2A3.2 3.2 0 0 0 3 11.5a3 3 0 0 0 1.7 5.2A3 3 0 0 0 10 19V4.2ZM14 4.2a3 3 0 0 1 5.3 2 3.2 3.2 0 0 1 1.7 5.3 3 3 0 0 1-1.7 5.2A3 3 0 0 1 14 19V4.2Z" />
      <path d="M7 9h1m-1 5h1m8-5h1m-1 5h1M10 7h4m-4 10h4" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="landing-page">
      <section aria-labelledby="home-heading" className="landing-hero">
        <div
          aria-label="Modern home with warm lighting and landscaped garden"
          className="landing-hero__image"
          role="img"
        />
        <div className="landing-hero__content">
          <h1 id="home-heading">RentVision</h1>
          <p className="landing-hero__tagline">Find a place you can trust.</p>
          <p className="landing-hero__description">
            Discover rental properties with location-aware search,
            <br className="landing-hero__desktop-break" /> verified listings, and
            AI-powered lease insights.
          </p>
          <div className="landing-hero__actions">
            <Button className="landing-cta landing-cta--primary" href="/properties">
              Explore properties
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M4 12h15m-6-6 6 6-6 6" />
              </svg>
            </Button>
            <Button className="landing-cta landing-cta--secondary" href="/map" variant="secondary">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M19 10.2c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.3" />
              </svg>
              Search on map
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="capabilities-heading" className="landing-capabilities">
        <h2 id="capabilities-heading">Why RentVision?</h2>
        <span aria-hidden="true" className="landing-capabilities__rule" />
        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-feature" key={feature.title}>
              <div
                aria-label={feature.alt}
                className={`landing-feature__image landing-feature__image--${feature.imagePosition}`}
                role="img"
              />
              <div className="landing-feature__body">
                <span className="landing-feature__icon">
                  <FeatureIcon name={feature.icon} />
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
