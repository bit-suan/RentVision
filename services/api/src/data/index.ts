import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Listing, ListingStatus, Lease } from '../types';

export function useMemoryStore(): boolean {
  return (
    process.env.DATA_STORE === 'memory' ||
    process.env.API_LOCAL_MODE === 'true'
  );
}

export interface UserRecord {
  userId: string;
  email: string;
  passwordHash: string;
  givenName: string;
  familyName: string;
  role: 'user' | 'landlord' | 'admin';
  createdAt: string;
  updatedAt: string;
}

const PROPERTIES_TABLE =
  process.env.DYNAMODB_PROPERTIES_TABLE || 'rentvision-properties-dev';
const LEASES_TABLE =
  process.env.DYNAMODB_LEASES_TABLE || 'rentvision-leases-dev';
const USERS_TABLE =
  process.env.DYNAMODB_USERS_TABLE || 'rentvision-users-dev';
const USERS_EMAIL_INDEX_NAME =
  process.env.USERS_EMAIL_INDEX_NAME || 'emailIndex';
const GEO_INDEX_NAME =
  process.env.LISTINGS_GEO_INDEX_NAME || 'geoIndex';
const STATUS_INDEX_NAME =
  process.env.LISTINGS_STATUS_INDEX_NAME || 'statusIndex';
const MEDIA_BUCKET =
  process.env.S3_PROPERTY_MEDIA_BUCKET || 'rentvision-property-media-dev';
const LEASE_BUCKET =
  process.env.S3_LEASE_DOCUMENTS_BUCKET || 'rentvision-lease-documents-dev';

const listingsMemory = new Map<string, Listing>();
const leasesMemory = new Map<string, Lease>();
const objectMemory = new Map<string, { contentType: string; body: Buffer }>();
const usersMemory = new Map<string, UserRecord>();
const usersByEmailMemory = new Map<string, string>();

let docClient: DynamoDBDocumentClient | undefined;
let s3Client: S3Client | undefined;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({});
  }
  return s3Client;
}

export function resetMemoryStore(): void {
  listingsMemory.clear();
  leasesMemory.clear();
  objectMemory.clear();
  usersMemory.clear();
  usersByEmailMemory.clear();
}

export function seedListings(listings: Listing[]): void {
  for (const listing of listings) {
    listingsMemory.set(listing.listingId, listing);
  }
}

export async function putListing(listing: Listing): Promise<void> {
  if (useMemoryStore()) {
    listingsMemory.set(listing.listingId, listing);
    return;
  }

  await getDocClient().send(
    new PutCommand({
      TableName: PROPERTIES_TABLE,
      Item: listing,
    })
  );
}

export async function getListing(listingId: string): Promise<Listing | undefined> {
  if (useMemoryStore()) {
    return listingsMemory.get(listingId);
  }

  const result = await getDocClient().send(
    new GetCommand({
      TableName: PROPERTIES_TABLE,
      Key: { listingId },
    })
  );
  return result.Item as Listing | undefined;
}

export async function listActiveListings(
  limit: number,
  exclusiveStartKey?: Record<string, unknown>
): Promise<{ items: Listing[]; lastKey?: Record<string, unknown> }> {
  if (useMemoryStore()) {
    const items = Array.from(listingsMemory.values())
      .filter((item) => item.status === ListingStatus.APPROVED)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = exclusiveStartKey?.offset
      ? Number(exclusiveStartKey.offset)
      : 0;
    const page = items.slice(start, start + limit);
    const nextOffset = start + page.length;
    return {
      items: page,
      lastKey:
        nextOffset < items.length ? { offset: nextOffset } : undefined,
    };
  }

  const result = await getDocClient().send(
    new QueryCommand({
      TableName: PROPERTIES_TABLE,
      IndexName: STATUS_INDEX_NAME,
      KeyConditionExpression: '#status = :approved',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':approved': ListingStatus.APPROVED },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  return {
    items: (result.Items || []) as Listing[],
    lastKey: result.LastEvaluatedKey,
  };
}

export async function queryListingsByGeohash(geohash: string): Promise<Listing[]> {
  if (useMemoryStore()) {
    return Array.from(listingsMemory.values()).filter(
      (item) => item.geohash === geohash
    );
  }

  const result = await getDocClient().send(
    new QueryCommand({
      TableName: PROPERTIES_TABLE,
      IndexName: GEO_INDEX_NAME,
      KeyConditionExpression: 'geohash = :gh',
      ExpressionAttributeValues: { ':gh': geohash },
    })
  );
  return (result.Items || []) as Listing[];
}

export async function putLease(lease: Lease): Promise<void> {
  if (useMemoryStore()) {
    leasesMemory.set(lease.leaseId, lease);
    return;
  }

  await getDocClient().send(
    new PutCommand({
      TableName: LEASES_TABLE,
      Item: lease,
    })
  );
}

export async function getLease(leaseId: string): Promise<Lease | undefined> {
  if (useMemoryStore()) {
    return leasesMemory.get(leaseId);
  }

  // Composite primary key is leaseId + listingId, so Query on the partition key.
  const result = await getDocClient().send(
    new QueryCommand({
      TableName: LEASES_TABLE,
      KeyConditionExpression: 'leaseId = :leaseId',
      ExpressionAttributeValues: { ':leaseId': leaseId },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as Lease | undefined) ?? undefined;
}

export async function createUploadUrl(
  bucket: 'media' | 'leases',
  fileKey: string,
  contentType: string,
  expiresIn: number
): Promise<string> {
  if (useMemoryStore()) {
    const localBase =
      process.env.API_PUBLIC_BASE_URL || 'http://localhost:3001';
    return `${localBase}/local-upload/${bucket}/${encodeURIComponent(fileKey)}`;
  }

  const bucketName = bucket === 'media' ? MEDIA_BUCKET : LEASE_BUCKET;
  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

export async function createDownloadUrl(
  fileKey: string,
  expiresIn: number
): Promise<string> {
  if (useMemoryStore()) {
    const localBase =
      process.env.API_PUBLIC_BASE_URL || 'http://localhost:3001';
    return `${localBase}/local-objects/${encodeURIComponent(fileKey)}`;
  }

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: fileKey,
    }),
    { expiresIn }
  );
}

export function putLocalObject(
  fileKey: string,
  contentType: string,
  body: Buffer
): void {
  objectMemory.set(fileKey, { contentType, body });
}

export function getLocalObject(
  fileKey: string
): { contentType: string; body: Buffer } | undefined {
  return objectMemory.get(fileKey);
}

export async function putUser(user: UserRecord): Promise<void> {
  if (useMemoryStore()) {
    usersMemory.set(user.userId, user);
    usersByEmailMemory.set(user.email.toLowerCase(), user.userId);
    return;
  }

  await getDocClient().send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
    })
  );
}

export async function getUserById(userId: string): Promise<UserRecord | undefined> {
  if (useMemoryStore()) {
    return usersMemory.get(userId);
  }

  const result = await getDocClient().send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );
  return result.Item as UserRecord | undefined;
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const normalized = email.trim().toLowerCase();
  if (useMemoryStore()) {
    const userId = usersByEmailMemory.get(normalized);
    if (!userId) return undefined;
    return usersMemory.get(userId);
  }

  const result = await getDocClient().send(
    new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: USERS_EMAIL_INDEX_NAME,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': normalized },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as UserRecord | undefined) ?? undefined;
}
