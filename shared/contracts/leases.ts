// Lease document and Q&A contracts

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

import type { SupportedLocale } from './locale';

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
