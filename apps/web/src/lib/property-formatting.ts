import type { PropertyAvailability } from "@/lib/property-data";

export function formatMonthlyRent(price: number): string {
  return `${price.toLocaleString()} ETB / month`;
}

export function formatPropertyAvailability(
  availability: PropertyAvailability,
): string {
  return availability
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}
