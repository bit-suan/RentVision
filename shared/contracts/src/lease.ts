/**
 * Processing status of a lease agreement document.
 */
export type LeaseStatus = 'uploaded' | 'processing' | 'extracted' | 'failed';

/**
 * Structured lease metadata extracted by OCR and LLM analysis.
 */
export interface LeaseExtractedData {
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  deposit?: number;
  terms?: string[];
  landlordName?: string;
  tenantName?: string;
}

/**
 * Lease document record stored in DynamoDB.
 */
export interface Lease {
  leaseId: string;
  listingId: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  status: LeaseStatus;
  uploadedBy: string;
  extractedData?: LeaseExtractedData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload to initiate a lease document upload.
 */
export interface LeaseUploadRequest {
  listingId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
}

/**
 * Response payload containing presigned S3 upload URL.
 */
export interface LeaseUploadResponse {
  leaseId: string;
  uploadUrl: string;
  fileKey: string;
}

/**
 * Query payload asking a question against an analyzed lease document.
 */
export interface LeaseQAQuery {
  leaseId: string;
  question: string;
}

/**
 * Response payload containing the AI-generated answer to a lease question.
 */
export interface LeaseQAResponse {
  leaseId: string;
  question: string;
  answer: string;
  confidence: number;
  sourcePage?: number;
}
