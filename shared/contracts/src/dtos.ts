import type { SupportedLocale } from './locale';

export type FurnishingStatus =
  | 'furnished'
  | 'semi_furnished'
  | 'unfurnished';

export type ExtractionStatus =
  | 'success'
  | 'partial'
  | 'unsupported';

export interface ExtractListingRequestDto {
  description: string;
  locale?: SupportedLocale;
}

export interface ExtractedPropertyListingDto {
  property_type: string;
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

export type EvidenceSupportStatus =
  | 'supported'
  | 'partially_supported'
  | 'unsupported'
  | 'conflicting';

export interface SourceCitationDto {
  page_number: number;
  excerpt: string;
  chunk_id: string | null;
}

export interface LeaseChunkDto {
  chunk_id: string;
  page_number: number;
  text: string;
  char_start: number;
  char_end: number;
}

export interface LeaseQARequestDto {
  question: string;
  pdf_base64?: string | null;
  document_text?: string | null;
  top_k?: number;
  locale?: SupportedLocale;
}

export interface LeaseQAResponseDto {
  question: string;
  answer: string;
  status: EvidenceSupportStatus;
  citations: SourceCitationDto[];
  retrieved_passages_count: number;
  has_sufficient_evidence: boolean;
  confidence_notes: string | null;
  response_language?: SupportedLocale;
}

export type ListingAvailability = 'AVAILABLE' | 'COMING_SOON' | 'OCCUPIED';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface PanoramaHotspotConfig {
  id: string;
  pitch: number;
  yaw: number;
  text?: string;
  type?: 'SCENE' | 'INFO';
  targetPanoramaId?: string;
}

export interface PanoramaConfig {
  deliveryUrl: string;
  title?: string;
  initialView?: {
    yaw?: number;
    pitch?: number;
    hfov?: number;
  };
  hotspots?: PanoramaHotspotConfig[];
}
