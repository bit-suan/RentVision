/**
 * Media asset categories supported by RentVision storage.
 */
export type MediaType = 'photo' | 'panorama' | 'document';

/**
 * Request payload to request an S3 pre-signed upload URL.
 */
export interface PresignedUrlRequest {
  listingId: string;
  fileName: string;
  mediaType: MediaType;
  contentType: string;
}

/**
 * Response payload containing an S3 pre-signed upload URL and destination key.
 */
export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Request payload to get an S3 pre-signed download URL.
 */
export interface MediaDownloadRequest {
  fileKey: string;
}

/**
 * Response payload with an S3 pre-signed download URL.
 */
export interface MediaDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
}
