import type { PropertyAvailability } from "@/lib/property-data";

export function formatMonthlyRent(price: number, locale: string = "en"): string {
  const formattedNumber = price.toLocaleString(locale === "am" ? "am-ET" : "en-US");
  return locale === "am"
    ? `${formattedNumber} ብር / በወር`
    : `${formattedNumber} ETB / month`;
}

export function formatPropertyAvailability(
  availability: PropertyAvailability,
): string {
  return availability
    .toLocaleLowerCase()
    .split("_")
    .map((part: string) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}
