import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const t = useTranslations("Header");

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link aria-label={t("brandAria")} className="site-brand" href="/">
          <span aria-hidden="true" className="site-brand__mark">
            R
          </span>
          RentVision
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
          <Link href="/login">
            {t("login")}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
