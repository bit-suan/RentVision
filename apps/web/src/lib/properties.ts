import { mockProperties } from "@/lib/property-data";
import type { MockProperty } from "@/lib/property-data";

export type Property = MockProperty;
export type {
  PropertyAvailability,
  PropertyCoordinates,
  PropertyPanoramaConfig,
} from "@/lib/property-data";

export function getProperties(): Property[] {
  return mockProperties;
}

export function getProperty(id: string): Property | undefined {
  return getProperties().find((property) => property.id === id);
}
