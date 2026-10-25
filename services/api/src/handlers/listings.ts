import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { encodeGeohash, getBoundingBoxGeohashes } from '../utils/geohash';
import { haversineDistance } from '../utils/distance';
import { errorResponse, successResponse, createResponse } from '../utils/response';
import {
  CreateListingRequest,
  Listing,
  ListingSearchResponse,
  ListingStatus,
  PropertyType,
} from '../types';
import {
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
      return await handleGetListing(listingId);
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Unhandled error in listings handler:', err);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};

async function handleGetListing(listingId: string): Promise<APIGatewayProxyResult> {
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

  return successResponse(item);
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

  const requiredFields: (keyof CreateListingRequest)[] = [
    'title',
    'description',
    'price',
    'propertyType',
    'latitude',
    'longitude',
    'landlordId',
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
    status: ListingStatus.ACTIVE,
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
    landlordId: body.landlordId,
    createdAt,
    updatedAt: createdAt,
  };

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
    if (item.status && item.status !== ListingStatus.ACTIVE) {
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
