"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";

export default function Header() {
  const t = useTranslations("Header");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "";
  const isProperties = pathname.startsWith("/properties");
  const isListProperty = pathname.startsWith("/landlord/properties/new");

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link aria-label={t("brandAria")} className="site-brand" href="/">
          <Image
            alt="RentVision"
            className="site-brand__logo"
            height={40}
            priority
            src="/images/rentvision-logo.png"
            width={40}
          />
          <span className="site-brand__wordmark">
            <span className="site-brand__rent">Rent</span>
            <span className="site-brand__vision">Vision</span>
          </span>
        </Link>

        <button
          type="button"
          className="site-header__menu-toggle"
          aria-expanded={menuOpen}
          aria-label={t("navAria")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? "X" : "Menu"}</span>
        </button>

        <nav
          aria-label={t("navAria")}
          className={`site-nav ${menuOpen ? "is-open" : ""}`}
        >
          <Link
            className={`site-nav__link ${isHome ? "site-nav__link--active" : ""}`}
            href="/"
            onClick={() => setMenuOpen(false)}
          >
            {t("home")}
          </Link>
          <Link
            className={`site-nav__link ${isProperties ? "site-nav__link--active" : ""}`}
            href="/properties"
            onClick={() => setMenuOpen(false)}
          >
            {t("properties")}
          </Link>
          <Link
            className={`site-nav__link site-nav__link--cta ${isListProperty ? "site-nav__link--active" : ""}`}
            href="/landlord/properties/new"
            onClick={() => setMenuOpen(false)}
          >
            {t("listProperty")}
          </Link>
          <UserMenu />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
