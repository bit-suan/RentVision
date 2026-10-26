import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { encodeGeohash, getBoundingBoxGeohashes } from '../utils/geohash';
import { haversineDistance } from '../utils/distance';
import { errorResponse, successResponse, createResponse } from '../utils/response';
import { getActor } from '../utils/request-actor';
import { canModifyListing, requireUser } from '../utils/auth';
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
    !canModifyListing(item.landlordId, getRequestActor(event))
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
  listingId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const actor = getActor(event);
  requireUser(actor);

  const existing = await getListing(listingId);
  if (!existing) {
    return errorResponse('NOT_FOUND', 'Listing not found', 404);
  }

  if (!canModifyListing(existing.landlordId, actor)) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to update this listing', 403);
  }

  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  const updates = JSON.parse(event.body);
  const updatedListing: Listing = {
    ...existing,
    ...updates,
    listingId, // Ensure ID cannot be changed
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

  const existing = await getListing(listingId);
  if (!existing) {
    return errorResponse('NOT_FOUND', 'Listing not found', 404);
  }

  if (!canModifyListing(existing.landlordId, actor)) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to update status', 403);
  }

  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  const { status } = JSON.parse(event.body);
  if (!status || !Object.values(ListingStatus).includes(status)) {
    return errorResponse('VALIDATION_ERROR', 'Invalid status', 400);
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
    return errorResponse('NOT_FOUND', 'Listing not found', 404);
  }

  if (!canModifyListing(existing.landlordId, actor)) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to add images', 403);
  }

  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  const { fileKey, type } = JSON.parse(event.body);
  if (!fileKey) {
    return errorResponse('VALIDATION_ERROR', 'fileKey is required', 400);
  }

  const updatedListing: Listing = { ...existing };
  if (type === 'panorama') {
    updatedListing.panoramaKeys = [...(existing.panoramaKeys || []), fileKey];
  } else {
    updatedListing.mediaKeys = [...(existing.mediaKeys || []), fileKey];
  }
  updatedListing.updatedAt = new Date().toISOString();

  await putListing(updatedListing);
  return successResponse(updatedListing);
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

async function handleUpdateListing(
  listingId: string | undefined,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
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
  if (!canModifyListing(listing.landlordId, getRequestActor(event))) {
    return errorResponse('FORBIDDEN', 'You are not allowed to modify this listing', 403);
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

  const updated: Listing = {
    ...listing,
    ...updates,
    panoramaKeys:
      updates.panorama !== undefined
        ? updates.panorama.scenes.map((scene) => scene.s3Key)
        : listing.panoramaKeys,
    updatedAt: new Date().toISOString(),
  };

  await putListing(updated);
  return successResponse(updated);
}

async function handleUpdateStatus(
  listingId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!isAdmin(getRequestActor(event))) {
    return errorResponse('FORBIDDEN', 'Only admins can update listing status', 403);
  }
  const listing = await getListing(listingId);
  if (!listing) {
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

  const updated = { ...listing, status, updatedAt: new Date().toISOString() };
  await putListing(updated);
  return successResponse(updated);
}

async function handleAddImage(
  listingId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const listing = await getListing(listingId);
  if (!listing) {
    return errorResponse('NOT_FOUND', `Listing with ID '${listingId}' not found`, 404);
  }
  if (!canModifyListing(listing.landlordId, getRequestActor(event))) {
    return errorResponse('FORBIDDEN', 'You are not allowed to modify this listing', 403);
  }
  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let body: { s3Key?: string };
  try {
    body = JSON.parse(event.body) as { s3Key?: string };
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }
  if (
    typeof body.s3Key !== 'string' ||
    !body.s3Key.startsWith(`listings/${listingId}/`)
  ) {
    return errorResponse('INVALID_IMAGE', 's3Key must belong to this listing', 400);
  }

  const updated: Listing = {
    ...listing,
    mediaKeys: [...listing.mediaKeys, body.s3Key],
    updatedAt: new Date().toISOString(),
  };
  await putListing(updated);
  return successResponse(
    {
      image: { s3Key: body.s3Key, addedAt: updated.updatedAt },
      warnings: [],
      listingStatus: updated.status,
      note: 'Similarity checks are not configured yet.',
      listing: updated,
    },
    201
  );
}

async function handleGeoSearch(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const params = event.queryStringParameters || {};
  const latStr = params.lat || params.latitude;
  const lngStr = params.lng || params.longitude;
  const radiusStr = params.radiusKm || params.radius;

  if (!latStr || !lngStr) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Query parameters latitude (or lat) and longitude (or lng) are required',
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

  const propertyType = params.propertyType as PropertyType | undefined;
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
  const limit = params.limit ? parseInt(params.limit, 10) : 50;

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

    const distance = haversineDistance(lat, lng, item.latitude, item.longitude);
    if (distance <= radiusKm) {
      matchingListings.push({
        ...item,
        distanceKm: Math.round(distance * 100) / 100,
      });
    }
  }

  matchingListings.sort((a, b) => a.distanceKm - b.distanceKm);
  const paginatedListings = matchingListings.slice(0, Math.max(1, limit));

  const response: ListingSearchResponse = {
    items: paginatedListings,
    count: paginatedListings.length,
  };

  return successResponse(response);
}
