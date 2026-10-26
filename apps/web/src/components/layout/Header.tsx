import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";

export default function Header() {
  const t = useTranslations("Header");

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link aria-label={t("brandAria")} className="site-brand" href="/">
          {/* Logo SVG — deep indigo R + house icon */}
          <svg
            aria-hidden="true"
            className="site-brand__logo"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* R background square with rounded corners */}
            <rect width="56" height="56" rx="12" fill="#2D2B6B" />
            {/* House silhouette inside the R */}
            <path
              d="M14 28L28 16L42 28"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 25V39C18 39.55 18.45 40 19 40H24V33H32V40H37C37.55 40 38 39.55 38 39V25"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Window */}
            <rect x="25" y="25" width="6" height="6" rx="1" stroke="#C4B8E8" strokeWidth="1.8" />
            {/* Lavender wave at bottom */}
            <ellipse cx="28" cy="44" rx="12" ry="3" fill="#9B8EC4" opacity="0.55" />
          </svg>

          {/* Split wordmark: "Rent" dark, "Vision" lavender */}
          <span className="site-brand__wordmark">
            <span className="site-brand__rent">Rent</span>
            <span className="site-brand__vision">Vision</span>
          </span>
        </Link>

        <nav aria-label={t("navAria")} className="site-nav">
          <Link href="/">
            {t("home")}
          </Link>
          <Link href="/properties">
            {t("properties")}
          </Link>
          <Link href="/map">
            {t("map")}
          </Link>
          <UserMenu />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
