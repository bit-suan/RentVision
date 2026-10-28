import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { errorResponse, successResponse, createResponse } from '../utils/response';
import {
  Lease,
  LeaseQAQuery,
  LeaseQAResponse,
  LeaseUploadRequest,
  LeaseUploadResponse,
} from '../types';
import { createUploadUrl, getLease, getListing, putLease } from '../data';
import { getActor } from '../utils/request-actor';
import { canModifyListing, isAdmin, requireUser } from '../utils/auth';

const AI_SERVICE_HOST = process.env.AI_SERVICE_HOST || '127.0.0.1';
const AI_SERVICE_PORT = process.env.AI_SERVICE_PORT || '8000';

export const MAX_LEASE_FILE_SIZE_BYTES = 25 * 1024 * 1024;

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
    const pathParamId = event.pathParameters?.id || event.pathParameters?.leaseId;

    if (
      method === 'POST' &&
      (segments[segments.length - 1] === 'upload-url' ||
        event.resource === '/leases/upload-url')
    ) {
      return await handleGenerateUploadUrl(event);
    }

    if (
      method === 'POST' &&
      ((segments.length >= 3 && segments[0] === 'leases' && segments[2] === 'qa') ||
        (pathParamId && event.resource?.endsWith('/qa')))
    ) {
      const leaseId = pathParamId || segments[1];
      return await handleLeaseQA(leaseId, event);
    }

    if (
      method === 'GET' &&
      ((segments.length >= 2 &&
        segments[0] === 'leases' &&
        segments[1] !== 'upload-url') ||
        pathParamId)
    ) {
      const leaseId = pathParamId || segments[1];
      return await handleGetLease(leaseId, event);
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
    console.error('Unhandled error in leases handler:', err);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};

async function handleGenerateUploadUrl(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let body: LeaseUploadRequest;
  try {
    body = JSON.parse(event.body);
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }

  const { listingId, fileName, mimeType, fileSize } = body;

  const actor = getActor(event);
  const userId = requireUser(actor);

  if (!listingId || typeof listingId !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'listingId is required', 400);
  }

  const listing = await getListing(listingId);
  if (!listing) {
    return errorResponse('NOT_FOUND', 'Listing not found', 404);
  }
  if (!fileName || typeof fileName !== 'string') {
    return errorResponse('VALIDATION_ERROR', 'fileName is required', 400);
  }
  if (mimeType !== 'application/pdf') {
    return errorResponse(
      'VALIDATION_ERROR',
      "Only PDF documents are supported ('application/pdf')",
      400
    );
  }
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'fileSize must be a positive number in bytes',
      400
    );
  }
  if (fileSize > MAX_LEASE_FILE_SIZE_BYTES) {
    return errorResponse(
      'VALIDATION_ERROR',
      `File size exceeds maximum allowed 25MB limit (${fileSize} bytes)`,
      400
    );
  }

  const leaseId = uuidv4();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey = `leases/${listingId}/${leaseId}_${sanitizedFileName}`;
  const expiresIn = 15 * 60;
  const uploadUrl = await createUploadUrl(
    'leases',
    fileKey,
    'application/pdf',
    expiresIn
  );

  const createdAt = new Date().toISOString();
  const newLease: Lease = {
    leaseId,
    listingId,
    fileName,
    fileKey,
    fileSize,
    mimeType: 'application/pdf',
    status: 'uploaded',
    uploadedBy: userId,
    createdAt,
    updatedAt: createdAt,
  };

  await putLease(newLease);

  const response: LeaseUploadResponse = {
    leaseId,
    uploadUrl,
    fileKey,
  };

  return successResponse(response, 201);
}

async function handleGetLease(
  leaseId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!leaseId) {
    return errorResponse('VALIDATION_ERROR', 'Lease ID is required', 400);
  }

  const actor = getActor(event);
  requireUser(actor);

  const item = await getLease(leaseId);
  if (!item) {
    return errorResponse('NOT_FOUND', `Lease with ID '${leaseId}' not found`, 404);
  }

  if (!(await canAccessLease(item, event))) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to view this lease', 403);
  }

  return successResponse(item);
}

async function canAccessLease(
  lease: Lease,
  event: APIGatewayProxyEvent
): Promise<boolean> {
  const actor = getActor(event);
  if (!actor.userId) return false;
  if (lease.uploadedBy === actor.userId || isAdmin(actor)) return true;

  const listing = await getListing(lease.listingId);
  return Boolean(listing && canModifyListing(listing.landlordId, actor));
}

function queryAiService(
  host: string,
  port: string | number,
  leaseId: string,
  question: string
): Promise<{ answer: string; confidence: number; sourcePage?: number }> {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ question });
    const req = http.request(
      {
        hostname: host,
        port: Number(port),
        path: `/api/v1/leases/${leaseId}/qa`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              answer:
                parsed.answer ||
                `Lease ${leaseId} does not include an extracted answer for "${question}".`,
              confidence:
                typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
              sourcePage: parsed.sourcePage ?? parsed.source_page,
            });
          } catch {
            resolve({
              answer: `The AI service returned an unreadable response for "${question}".`,
              confidence: 0.2,
            });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.warn(
        `AI Service connection to ${host}:${port} unavailable (${err.message}).`
      );
      resolve({
        answer: `The lease Q&A service is unavailable. Start services/ai to answer "${question}".`,
        confidence: 0,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        answer: `The lease Q&A service timed out while answering "${question}".`,
        confidence: 0,
      });
    });

    req.write(postData);
    req.end();
  });
}

async function handleLeaseQA(
  leaseId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!leaseId) {
    return errorResponse('VALIDATION_ERROR', 'Lease ID is required', 400);
  }
  if (!event.body) {
    return errorResponse('VALIDATION_ERROR', 'Request body is required', 400);
  }

  let body: LeaseQAQuery;
  try {
    body = JSON.parse(event.body);
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON payload', 400);
  }

  const { question } = body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return errorResponse('VALIDATION_ERROR', 'question is required', 400);
  }

  const lease = await getLease(leaseId);
  if (!lease) {
    return errorResponse('NOT_FOUND', `Lease with ID '${leaseId}' not found`, 404);
  }

  if (!(await canAccessLease(lease, event))) {
    return errorResponse('UNAUTHORIZED', 'Not authorized to access this lease', 403);
  }

  const aiResult = await queryAiService(
    AI_SERVICE_HOST,
    AI_SERVICE_PORT,
    leaseId,
    question
  );

  const qaResponse: LeaseQAResponse = {
    leaseId,
    question,
    answer: aiResult.answer,
    confidence: aiResult.confidence,
    sourcePage: aiResult.sourcePage,
  };

  return successResponse(qaResponse, 200);
}
