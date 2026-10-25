import Button from "@/components/ui/Button";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

function FeatureIcon({ name }: { name: "search" | "shield" | "brain" }) {
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

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Landing" });

  const features = [
    {
      title: t("features.discover.title"),
      description: t("features.discover.description"),
      imagePosition: "bedroom",
      alt: t("features.discover.alt"),
      icon: "search" as const,
    },
    {
      title: t("features.trust.title"),
      description: t("features.trust.description"),
      imagePosition: "bathroom",
      alt: t("features.trust.alt"),
      icon: "shield" as const,
    },
    {
      title: t("features.understand.title"),
      description: t("features.understand.description"),
      imagePosition: "living-room",
      alt: t("features.understand.alt"),
      icon: "brain" as const,
    },
  ];

  return (
    <div className="landing-page">
      <section aria-labelledby="home-heading" className="landing-hero">
        <div
          aria-label={t("heroAlt")}
          className="landing-hero__image"
          role="img"
        />
        <div className="landing-hero__content">
          <h1 id="home-heading">{t("title")}</h1>
          <p className="landing-hero__tagline">{t("tagline")}</p>
          <p className="landing-hero__description">{t("description")}</p>
          <div className="landing-hero__actions">
            <Button className="landing-cta landing-cta--primary" href="/properties">
              {t("exploreProperties")}
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M4 12h15m-6-6 6 6-6 6" />
              </svg>
            </Button>
            <Button className="landing-cta landing-cta--secondary" href="/map" variant="secondary">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M19 10.2c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.3" />
              </svg>
              {t("searchOnMap")}
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="capabilities-heading" className="landing-capabilities">
        <h2 id="capabilities-heading">{t("whyRentVision")}</h2>
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
