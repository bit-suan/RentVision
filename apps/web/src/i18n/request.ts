import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";
import { createGetMessageFallback, createOnError } from "./fallback";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;
  const fallbackMessages =
    locale !== "en"
      ? (await import("../../messages/en.json")).default
      : undefined;

  return {
    locale,
    messages,
    onError: createOnError(locale),
    getMessageFallback: createGetMessageFallback(locale, fallbackMessages),
  };
});
