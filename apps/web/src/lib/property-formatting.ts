

/**
 * Formats a price with currency and locale-specific labels.
 * Can be called as:
 * - formatMonthlyRent(price, currency) - legacy HEAD usage
 * - formatMonthlyRent(price, locale) - other branch usage
 * - formatMonthlyRent(price, locale, currency) - combined usage
 */
export function formatMonthlyRent(
  price: number,
  arg2: string = "en",
  arg3?: string
): string {
  let locale = "en";
  let currency = "ETB";

  // Check if arg2 is a locale or currency
  if (arg2 === "en" || arg2 === "am") {
    locale = arg2;
    currency = arg3 || "ETB";
  } else {
    currency = arg2;
    locale = arg3 || "en";
  }

  const formattedNumber = price.toLocaleString(
    locale === "am" ? "am-ET" : "en-US"
  );

  if (locale === "am") {
    const currencyLabel = currency === "ETB" ? "ብር" : currency;
    return `${formattedNumber} ${currencyLabel} / በወር`;
  }

  return `${formattedNumber} ${currency} / month`;
}

export function formatPropertyAvailability(availability: string): string {
  return availability
    .toLocaleLowerCase()
    .split("_")
    .map((part: string) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}
