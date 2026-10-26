import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { errorResponse, successResponse, createResponse } from '../utils/response';
import { getActor } from '../utils/request-actor';
import { requireUser, canModifyListing } from '../utils/auth';
import {
  MediaType,
  PresignedUrlRequest,
  PresignedUrlResponse,
  MediaDownloadResponse,
} from '../types';
import { createDownloadUrl, createUploadUrl, getListing } from '../data';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_MEDIA_TYPES = new Set<MediaType>(['photo', 'panorama', 'document']);

export const MAX_MEDIA_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function getPathSegments(event: APIGatewayProxyEvent): string[] {
  const rawPath =
    event.path ||
    (event.requestContext as unknown as { http?: { path?: string } })?.http
      ?.path ||
    event.resource ||
    '';
  return rawPath
    .replace(/^\/+|\/+$/g, '')
    .replace(/^api\/v1\//, '')
    .split('/')
    .filter(Boolean);
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const method = (
      event.httpMethod ||
      (event.requestContext as unknown as { http?: { method?: string } })?.http
        ?.method ||
      ''
    ).toUpperCase();

    if (method === 'OPTIONS') {
      return createResponse(200, { ok: true });
    }

    const segments = getPathSegments(event);

    if (
      method === 'POST' &&
      (segments[segments.length - 1] === 'upload-url' ||
        event.resource === '/media/upload-url')
    ) {
      return await handleGenerateUploadUrl(event);
    }

    if (
      method === 'GET' &&
      (segments[segments.length - 1] === 'download-url' ||
        event.resource === '/media/download-url')
    ) {
      return await handleGenerateDownloadUrl(event);
    }

    return errorResponse(
      'NOT_FOUND',
      `Resource not found for ${method} /${segments.join('/')}`,
      404
    );
  } catch (err: any) {
    if (err.code === 'UNAUTHENTICATED') {
      return errorResponse('UNAUTHENTICATED', err.message, 401);
    }
    if (err.code === 'UNAUTHORIZED') {
      return errorResponse('UNAUTHORIZED', err.message, 403);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Unhandled error in media handler:', err);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};

async function handleGenerateUploadUrl(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const actor = getActor(event);
  requireUser(actor);

  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let body: PresignedUrlRequest;
  try {
    body = JSON.parse(event.body);
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }

  const { listingId, fileName, mediaType, contentType } = body;
  const listing = await getListing(listingId);

  if (!listingId || typeof listingId !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'listingId is required', 400);
  }

  // Authorization check: User must own the listing to upload media to it
  const listing = await getListing(listingId);
  if (!listing) {
    return errorResponse('NOT_FOUND', 'Listing not found', 404);
  }
  if (!canModifyListing(listing.landlordId, actor)) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to upload media for this listing', 403);
  }

  if (!fileName || typeof fileName !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'fileName is required', 400);
  }
  if (!mediaType || !ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'mediaType must be one of: photo, panorama, document',
      400
    );
  }
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `contentType must be one of: ${Array.from(ALLOWED_CONTENT_TYPES).join(', ')}`,
      400
    );
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folder = mediaType.endsWith('s') ? mediaType : `${mediaType}s`;
  const fileKey = `listings/${listingId}/${folder}/${uuidv4()}_${sanitizedFileName}`;
  const expiresIn = 15 * 60;

  const uploadUrl = await createUploadUrl('media', fileKey, contentType, expiresIn);
  const response: PresignedUrlResponse = {
    uploadUrl,
    fileKey,
    expiresIn,
  };

  return successResponse(response, 200);
}

async function handleGenerateDownloadUrl(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const actor = getActor(event);
  requireUser(actor);

  const queryParams = event.queryStringParameters || {};
  const fileKey = queryParams.fileKey || queryParams.key;

  if (!fileKey) {
    return errorResponse('VALIDATION_ERROR', 'Query parameter fileKey is required', 400);
  }

  // Basic authorization: user must be authenticated to download media
  // (In a more restrictive setup, we might check if they have access to the specific listing)

  const expiresIn = 60 * 60;
  const downloadUrl = await createDownloadUrl(fileKey, expiresIn);
  const response: MediaDownloadResponse = {
    downloadUrl,
    expiresIn,
  };

  return successResponse(response, 200);
}
