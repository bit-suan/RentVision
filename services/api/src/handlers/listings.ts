import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { encodeGeohash, getBoundingBoxGeohashes } from '../utils/geohash';
import { haversineDistance } from '../utils/distance';
import { errorResponse, successResponse, createResponse } from '../utils/response';
import { getActor, getRequestActor } from '../utils/request-actor';
import { canModifyListing, requireUser, isAdmin } from '../utils/auth';
import { validatePanorama } from '../utils/panorama-validation';

import {
  CreateListingRequest,
  Listing,
  ListingSearchResponse,
  ListingStatus,
  PropertyType,
  UpdateListingRequest,
} from '../types';
import {
  createDownloadUrl,
  getListing,
  listActiveListings,
  putListing,
  queryListingsByGeohash,
} from '../data';

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
    const pathParamId =
      event.pathParameters?.id || event.pathParameters?.listingId;

    if (
      method === 'GET' &&
      (segments[segments.length - 1] === 'search' ||
        event.resource === '/listings/search')
    ) {
      return await handleGeoSearch(event);
    }

    if (
      method === 'GET' &&
      ((segments.length >= 2 &&
        segments[0] === 'listings' &&
        segments[1] !== 'search') ||
        pathParamId)
    ) {
      const listingId = pathParamId || segments[1];
      return await handleGetListing(listingId, event);
    }

    if (
      method === 'PUT' &&
      ((segments.length >= 2 && segments[0] === 'listings') || pathParamId)
    ) {
      return await handleUpdateListing(pathParamId || segments[1], event);
    }

    if (
      method === 'PATCH' &&
      segments.length === 3 &&
      segments[0] === 'listings' &&
      segments[2] === 'status'
    ) {
      return await handleUpdateStatus(segments[1], event);
    }

    if (
      method === 'POST' &&
      segments.length === 3 &&
      segments[0] === 'listings' &&
      segments[2] === 'images'
    ) {
      return await handleAddImage(segments[1], event);
    }

    if (method === 'PUT' && pathParamId) {
      return await handleUpdateListing(pathParamId, event);
    }

    if (method === 'PATCH' && pathParamId && segments.includes('status')) {
      return await handleUpdateStatus(pathParamId, event);
    }

    if (method === 'POST' && pathParamId && segments.includes('images')) {
      return await handleAddImage(pathParamId, event);
    }

    if (method === 'GET' && segments.length === 1 && segments[0] === 'listings') {
      return await handleListListings(event);
    }

    if (method === 'POST' && segments.length === 1 && segments[0] === 'listings') {
      return await handleCreateListing(event);
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
    console.error('Unhandled error in listings handler:', err);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};

async function handleGetListing(
  listingId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!listingId) {
    return errorResponse('VALIDATION_ERROR', 'Listing ID is required', 400);
  }

  const item = await getListing(listingId);
  if (!item) {
    return errorResponse(
      'NOT_FOUND',
      `Listing with ID '${listingId}' not found`,
      404
    );
  }
  if (
    item.status !== ListingStatus.APPROVED &&
    !canModifyListing(item.landlordId, getActor(event))
  ) {
    return errorResponse('NOT_FOUND', `Listing with ID '${listingId}' not found`, 404);
  }


  if (!item.panorama) {
    return successResponse(item);
  }

  const scenes = await Promise.all(
    item.panorama.scenes.map(async (scene) => ({
      ...scene,
      imageUrl: await createDownloadUrl(scene.s3Key, 60 * 60),
    }))
  );

  return successResponse({
    ...item,
    panorama: {
      ...item.panorama,
      scenes,
    },
  });
}

async function handleUpdateListing(
  listingId: string | undefined,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const actor = getActor(event);
  requireUser(actor);

  if (!listingId) {
    return errorResponse('VALIDATION_ERROR', 'Listing ID is required', 400);
  }
  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let updates: UpdateListingRequest;
  try {
    updates = JSON.parse(event.body) as UpdateListingRequest;
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }

  const listing = await getListing(listingId);
  if (!listing) {
    return errorResponse('NOT_FOUND', `Listing with ID '${listingId}' not found`, 404);
  }
  if (!canModifyListing(listing.landlordId, actor)) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to update this listing', 403);
  }

  if (updates.panorama !== undefined) {
    try {
      validatePanorama(updates.panorama, listingId);
    } catch (error) {
      return errorResponse(
        'INVALID_PANORAMA',
        error instanceof Error ? error.message : 'Invalid panorama metadata',
        400
      );
    }
  }

  const updatedListing: Listing = {
    ...listing,
    ...updates,
    listingId, // Ensure ID cannot be changed
    panoramaKeys:
      updates.panorama !== undefined
        ? updates.panorama.scenes.map((scene) => scene.s3Key)
        : listing.panoramaKeys,
    updatedAt: new Date().toISOString(),
  };

  await putListing(updatedListing);
  return successResponse(updatedListing);
}

async function handleUpdateStatus(
  listingId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const actor = getActor(event);
  requireUser(actor);

  if (!isAdmin(actor)) {
    return errorResponse('FORBIDDEN', 'Only admins can update listing status', 403);
  }

  const existing = await getListing(listingId);
  if (!existing) {
    return errorResponse('NOT_FOUND', `Listing with ID '${listingId}' not found`, 404);
  }

  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let status: ListingStatus;
  try {
    const body = JSON.parse(event.body) as { status?: ListingStatus };
    if (!body.status || !Object.values(ListingStatus).includes(body.status)) {
      return errorResponse('INVALID_STATUS', 'Invalid listing status', 400);
    }
    status = body.status;
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }

  const updatedListing: Listing = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };

  await putListing(updatedListing);
  return successResponse(updatedListing);
}

async function handleAddImage(
  listingId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const actor = getActor(event);
  requireUser(actor);

  const existing = await getListing(listingId);
  if (!existing) {
    return errorResponse('NOT_FOUND', `Listing with ID '${listingId}' not found`, 404);
  }

  if (!canModifyListing(existing.landlordId, actor)) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to add images', 403);
  }

  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let body: any;
  try {
    body = JSON.parse(event.body);
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }

  const imageKey = body.s3Key || body.fileKey;
  if (!imageKey || typeof imageKey !== 'string') {
    return errorResponse('VALIDATION_ERROR', 's3Key or fileKey is required', 400);
  }

  if (!imageKey.startsWith(`listings/${listingId}/`)) {
    return errorResponse('INVALID_IMAGE', 's3Key must belong to this listing', 400);
  }

  const updatedListing: Listing = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };

  if (body.type === 'panorama') {
    updatedListing.panoramaKeys = [...(existing.panoramaKeys || []), imageKey];
  } else {
    updatedListing.mediaKeys = [...(existing.mediaKeys || []), imageKey];
  }

  await putListing(updatedListing);
  return successResponse(
    {
      image: { s3Key: imageKey, addedAt: updatedListing.updatedAt },
      warnings: [],
      listingStatus: updatedListing.status,
      note: 'Similarity checks are not configured yet.',
      listing: updatedListing,
    },
    201
  );
}


async function handleListListings(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const queryParams = event.queryStringParameters || {};
  const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 20;

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (queryParams.nextToken) {
    try {
      exclusiveStartKey = JSON.parse(
        Buffer.from(queryParams.nextToken, 'base64').toString('utf8')
      );
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Invalid nextToken parameter', 400);
    }
  }

  const result = await listActiveListings(
    Math.min(Math.max(1, limit), 100),
    exclusiveStartKey
  );

  const nextToken = result.lastKey
    ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64')
    : undefined;

  return successResponse({
    items: result.items,
    count: result.items.length,
    nextToken,
  });
}

async function handleCreateListing(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let body: CreateListingRequest;
  try {
    body = JSON.parse(event.body);
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }

  const actor = getRequestActor(event);
  let landlordId: string;
  try {
    landlordId = requireUser(actor);
  } catch (error) {
    return errorResponse(
      'UNAUTHENTICATED',
      error instanceof Error ? error.message : 'You must be signed in',
      401
    );
  }

  const requiredFields: (keyof CreateListingRequest)[] = [
    'title',
    'description',
    'price',
    'propertyType',
    'latitude',
    'longitude',
  ];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return errorResponse(
        'VALIDATION_ERROR',
        `Missing required field: '${field}'`,
        400
      );
    }
  }

  if (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Latitude must be a valid number between -90 and 90',
      400
    );
  }

  if (
    typeof body.longitude !== 'number' ||
    body.longitude < -180 ||
    body.longitude > 180
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Longitude must be a valid number between -180 and 180',
      400
    );
  }

  if (typeof body.price !== 'number' || body.price < 0) {
    return errorResponse('VALIDATION_ERROR', 'Price must be a positive number', 400);
  }

  const createdAt = new Date().toISOString();
  const listingId = uuidv4();
  const newListing: Listing = {
    listingId,
    title: body.title,
    description: body.description,
    price: body.price,
    currency: body.currency || 'ETB',
    propertyType: body.propertyType,
    status: ListingStatus.APPROVED,
    latitude: body.latitude,
    longitude: body.longitude,
    geohash: encodeGeohash(body.latitude, body.longitude, 5),
    address: body.address || {
      street: '',
      city: 'Addis Ababa',
      subcity: '',
      woreda: '',
    },
    bedrooms: body.bedrooms ?? 1,
    bathrooms: body.bathrooms ?? 1,
    areaSqm: body.areaSqm ?? 0,
    amenities: Array.isArray(body.amenities) ? body.amenities : [],
    mediaKeys: Array.isArray(body.mediaKeys) ? body.mediaKeys : [],
    panoramaKeys: Array.isArray(body.panoramaKeys) ? body.panoramaKeys : [],
    landlordId,
    createdAt,
    updatedAt: createdAt,
  };

  if (body.panorama !== undefined) {
    try {
      validatePanorama(body.panorama, listingId);
    } catch (error) {
      return errorResponse(
        'INVALID_PANORAMA',
        error instanceof Error ? error.message : 'Invalid panorama metadata',
        400
      );
    }

    newListing.panorama = body.panorama;
    newListing.panoramaKeys = body.panorama.scenes.map((scene) => scene.s3Key);
  }

  await putListing(newListing);
  return successResponse(newListing, 201);
}

async function handleGeoSearch(

  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const params = event.queryStringParameters || {};
  const latStr = params.lat || params.latitude;
  const lngStr = params.lng || params.longitude;
  const radiusStr = params.radiusKm || params.radius;

  // Filters shared by "browse" (no coordinates) and radius search.
  const propertyTypeParam = params.propertyType
    ? (params.propertyType.toLowerCase() as PropertyType)
    : undefined;
  const minPriceParam = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPriceParam = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
  const bedroomsParam = params.bedrooms ? parseInt(params.bedrooms, 10) : undefined;
  const limitParam = Math.min(
    Math.max(1, params.limit ? parseInt(params.limit, 10) || 50 : 50),
    100
  );
  const offsetParam = Math.max(0, params.offset ? parseInt(params.offset, 10) || 0 : 0);

  // No coordinates: browse all approved listings (newest first) with filters,
  // instead of rejecting the request.
  if (!latStr && !lngStr) {
    const all = await listActiveListings(100);
    const filtered = all.items.filter(
      (item) =>
        (!propertyTypeParam || item.propertyType === propertyTypeParam) &&
        (minPriceParam === undefined || item.price >= minPriceParam) &&
        (maxPriceParam === undefined || item.price <= maxPriceParam) &&
        (bedroomsParam === undefined || item.bedrooms === bedroomsParam)
    );
    const page = filtered.slice(offsetParam, offsetParam + limitParam);
    const browseResponse: ListingSearchResponse = {
      items: page,
      count: filtered.length,
    };
    return successResponse(browseResponse);
  }

  if (!latStr || !lngStr) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Query parameters latitude (or lat) and longitude (or lng) must be provided together',
      400
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const radiusKm = radiusStr ? parseFloat(radiusStr) : 10;

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return errorResponse('VALIDATION_ERROR', 'Latitude must be between -90 and 90', 400);
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Longitude must be between -180 and 180',
      400
    );
  }
  if (isNaN(radiusKm) || radiusKm <= 0) {
    return errorResponse('VALIDATION_ERROR', 'radiusKm must be a positive number', 400);
  }

  const propertyType = propertyTypeParam;
  const minPrice = minPriceParam;
  const maxPrice = maxPriceParam;
  const limit = limitParam;

  const candidateGeohashes = getBoundingBoxGeohashes(lat, lng, radiusKm, 5);
  const candidateMap = new Map<string, Listing>();

  for (const gh of candidateGeohashes) {
    const items = await queryListingsByGeohash(gh);
    for (const item of items) {
      candidateMap.set(item.listingId, item);
    }
  }

  const matchingListings: (Listing & { distanceKm: number })[] = [];

  for (const item of candidateMap.values()) {
    if (item.status && item.status !== ListingStatus.APPROVED) {
      continue;
    }
    if (propertyType && item.propertyType !== propertyType) {
      continue;
    }
    if (minPrice !== undefined && item.price < minPrice) {
      continue;
    }
    if (maxPrice !== undefined && item.price > maxPrice) {
      continue;
    }
    if (bedroomsParam !== undefined && item.bedrooms !== bedroomsParam) {
      continue;
    }

    const distance = haversineDistance(lat, lng, item.latitude, item.longitude);
    if (distance <= radiusKm) {
      matchingListings.push({
        ...item,
        distanceKm: Math.round(distance * 100) / 100,
      });
    }
  }

  matchingListings.sort((a, b) => a.distanceKm - b.distanceKm);
  const paginatedListings = matchingListings.slice(offsetParam, offsetParam + Math.max(1, limit));

  const response: ListingSearchResponse = {
    items: paginatedListings,
    count: paginatedListings.length,
  };

  return successResponse(response);
}
