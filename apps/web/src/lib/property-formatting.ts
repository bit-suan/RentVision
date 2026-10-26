import type { PropertyAvailability } from "@/lib/property-data";

export function formatMonthlyRent(price: number, currency: string = "ETB"): string {
  return `${price.toLocaleString()} ${currency} / month`;
}

export function formatPropertyAvailability(
  availability: string,
): string {
  return availability
    .toLocaleLowerCase()
    .split("_")
    .map((part: string) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}
