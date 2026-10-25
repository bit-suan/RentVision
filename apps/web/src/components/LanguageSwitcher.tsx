"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "../i18n/routing";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleSwitch(nextLocale: "en" | "am") {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className="language-switcher" role="group" aria-label={t("label")}>
      <button
        type="button"
        className={`language-switcher__btn ${locale === "en" ? "is-active" : ""}`}
        onClick={() => handleSwitch("en")}
        aria-pressed={locale === "en"}
        aria-label={t("switchToEn")}
        disabled={isPending}
      >
        {t("shortEn")}
      </button>
      <span className="language-switcher__divider" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        className={`language-switcher__btn ${locale === "am" ? "is-active" : ""}`}
        onClick={() => handleSwitch("am")}
        aria-pressed={locale === "am"}
        aria-label={t("switchToAm")}
        disabled={isPending}
      >
        {t("shortAm")}
      </button>
    </div>
  );
}
