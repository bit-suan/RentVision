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

export interface ExtractListingRequestDto {
  description: string;
}

export interface ExtractedPropertyListingDto {
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  monthly_rent: number | null;
  currency: string | null;
  neighborhood: string | null;
  city: string | null;
  amenities: string[];
  availability: string | null;
  title_suggestion: string | null;
  raw_description: string;
  unextracted_or_missing_fields: string[];
  confidence_notes: string | null;
}
