// Property listing contracts and DTOs

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'studio'
  | 'condominium'
  | 'townhouse'
  | 'commercial'
  | 'other'
  | 'unknown';

export type FurnishingStatus =
  | 'furnished'
  | 'semi_furnished'
  | 'unfurnished';

export type ExtractionStatus =
  | 'success'
  | 'partial'
  | 'unsupported';

import type { SupportedLocale } from './locale';

export interface ExtractListingRequestDto {
  description: string;
  locale?: SupportedLocale;
}

export interface ExtractedPropertyListingDto {
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  monthly_rent: number | null;
  currency: string | null;
  security_deposit: number | null;
  deposit_months: number | null;
  utilities_included: boolean | null;
  furnishing_status: FurnishingStatus | null;
  neighborhood: string | null;
  city: string | null;
  amenities: string[];
  availability: string | null;
  title_suggestion: string | null;
  raw_description: string;
  extraction_status: ExtractionStatus;
  unextracted_or_missing_fields: string[];
  confidence_notes: string | null;
  detected_language?: SupportedLocale;
}
