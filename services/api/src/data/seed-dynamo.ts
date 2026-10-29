/**
 * Seeds the deployed DynamoDB tables with demo listings and demo users.
 *
 * Usage (from services/api, with AWS credentials configured):
 *   AWS_REGION=eu-north-1 npx ts-node --transpile-only src/data/seed-dynamo.ts
 *
 * It also uploads the 360 panorama images from apps/web/public/images/panoramas
 * to the media bucket (once; re-runs skip files that already exist) so the
 * property-001..004 virtual tours work. The bucket is found automatically, or
 * set S3_PROPERTY_MEDIA_BUCKET=<bucket name>.
 *
 * Safe to re-run: every item is written with a fixed id, so a re-run
 * overwrites the same rows instead of creating duplicates.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  CopyObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { encodeGeohash } from '../utils/geohash';
import { validatePanorama } from '../utils/panorama-validation';
import { Listing, ListingStatus, PanoramaTour, PropertyType } from '../types';
import { putListing, putUser, useMemoryStore, type UserRecord } from './index';
import { DEMO_LISTINGS } from './seed';

const DEMO_LANDLORD_ID = 'landlord-demo';
const DEMO_USER_ID = 'user-demo';
const DEMO_PASSWORD = 'password123';

function hashPassword(password: string): string {
  // Same format that handlers/auth.ts verifies: "<salt>:<scrypt hash>"
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function makeListing(
  partial: Omit<
    Listing,
    'geohash' | 'status' | 'createdAt' | 'updatedAt' | 'currency' | 'landlordId'
  >,
  createdAt: string
): Listing {
  return {
    ...partial,
    currency: 'ETB',
    status: ListingStatus.APPROVED,
    geohash: encodeGeohash(partial.latitude, partial.longitude, 5),
    landlordId: DEMO_LANDLORD_ID,
    createdAt,
    updatedAt: createdAt,
  };
}

/** The same four properties the frontend currently hard-codes (property-001..004). */
function frontendMatchingListings(): Listing[] {
  const base = Date.now();
  // Stagger createdAt so the "newest first" ordering is stable and visible.
  const at = (n: number) => new Date(base - n * 60_000).toISOString();

  return [
    makeListing(
      {
        listingId: 'property-001',
        title: 'Modern 2-Bedroom Apartment',
        description:
          'A bright, modern apartment with comfortable living spaces in Bole.',
        price: 28000,
        propertyType: PropertyType.APARTMENT,
        latitude: 8.998,
        longitude: 38.787,
        address: { street: 'Bole Road', city: 'Addis Ababa', subcity: 'Bole', woreda: '03' },
        bedrooms: 2,
        bathrooms: 2,
        areaSqm: 105,
        amenities: ['Generator', 'Water Tank', 'WiFi', 'Parking'],
        mediaKeys: [],
        panoramaKeys: [],
      },
      at(1)
    ),
    makeListing(
      {
        listingId: 'property-002',
        title: 'Spacious Family Apartment',
        description:
          'A spacious apartment in Kazanchis with room for family living.',
        price: 35000,
        propertyType: PropertyType.APARTMENT,
        latitude: 9.016,
        longitude: 38.764,
        address: { street: 'Kazanchis Street', city: 'Addis Ababa', subcity: 'Kirkos', woreda: '09' },
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 140,
        amenities: ['Generator', 'Water Tank', 'Parking', 'WiFi'],
        mediaKeys: [],
        panoramaKeys: [],
      },
      at(2)
    ),
    makeListing(
      {
        listingId: 'property-003',
        title: 'Modern Villa',
        description:
          'A modern villa in CMC with generous indoor and outdoor space.',
        price: 65000,
        propertyType: PropertyType.VILLA,
        latitude: 9.022,
        longitude: 38.835,
        address: { street: 'CMC Road', city: 'Addis Ababa', subcity: 'Yeka', woreda: '14' },
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 260,
        amenities: ['Generator', 'Water Tank', 'Parking', 'WiFi'],
        mediaKeys: [],
        panoramaKeys: [],
      },
      at(3)
    ),
    makeListing(
      {
        listingId: 'property-004',
        title: 'Affordable One-Bedroom',
        description:
          'A comfortable one-bedroom apartment in Sar Bet at an accessible price.',
        price: 18000,
        propertyType: PropertyType.APARTMENT,
        latitude: 8.96,
        longitude: 38.745,
        address: { street: 'Sar Bet Road', city: 'Addis Ababa', subcity: 'Nifas Silk-Lafto', woreda: '05' },
        bedrooms: 1,
        bathrooms: 1,
        areaSqm: 55,
        amenities: ['Water Tank', 'WiFi', 'Parking', 'Generator'],
        mediaKeys: [],
        panoramaKeys: [],
      },
      at(4)
    ),
  ];
}

// Public https photo URLs. The web app uses an https mediaKey as-is, so these
// need no S3 upload and no signed download URL. Replace with real S3 keys later.
const SEED_PHOTOS = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
];

export function buildSeedListings(): Listing[] {
  // Existing demo listings are reassigned to the demo landlord so that one
  // login can manage every seeded property in the landlord portal.
  const existing = DEMO_LISTINGS.map((l) => ({ ...l, landlordId: DEMO_LANDLORD_ID }));
  const all = [...frontendMatchingListings(), ...existing];
  // Demo photo keys point at S3 files that don't exist and need a token to
  // fetch, so give every listing a public photo instead. Panorama keys are
  // cleared for the same reason (no real panoramas are uploaded yet).
  return all.map((listing, index) => ({
    ...listing,
    mediaKeys: [SEED_PHOTOS[index % SEED_PHOTOS.length]],
    panoramaKeys: [],
  }));
}

export function buildSeedUsers(): UserRecord[] {
  const now = new Date().toISOString();
  return [
    {
      userId: DEMO_LANDLORD_ID,
      email: 'demo@rentvision.com',
      passwordHash: hashPassword(DEMO_PASSWORD),
      givenName: 'Demo',
      familyName: 'Landlord',
      role: 'landlord',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: DEMO_USER_ID,
      email: 'tenant@rentvision.com',
      passwordHash: hashPassword(DEMO_PASSWORD),
      givenName: 'Demo',
      familyName: 'Tenant',
      role: 'user',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ---------------------------------------------------------------------------
// 360 virtual tours
// ---------------------------------------------------------------------------

const PANORAMA_DIR = path.resolve(__dirname, '../../../../apps/web/public/images/panoramas');
const TOUR_LISTING_IDS = ['property-001', 'property-002', 'property-003', 'property-004'];

interface SceneDef {
  id: string;
  title: string;
  file: string;
  hotspots: Array<{ suffix: string; pitch: number; yaw: number; text: string; target: string }>;
}

// Same rooms and hotspot positions the web app's built-in demo tour uses.
const SCENES: SceneDef[] = [
  {
    id: 'living',
    title: 'Living Room',
    file: 'living-room.jpg',
    hotspots: [
      { suffix: 'to-bedroom', pitch: -5, yaw: 42, text: 'Walk to Master Bedroom', target: 'bedroom' },
      { suffix: 'to-dining', pitch: -3, yaw: -60, text: 'Walk to Dining Area', target: 'dining' },
      { suffix: 'to-kitchen', pitch: -4, yaw: -110, text: 'Walk to Kitchen', target: 'kitchen' },
    ],
  },
  {
    id: 'bedroom',
    title: 'Master Bedroom',
    file: 'bedroom.jpg',
    hotspots: [
      { suffix: 'bed-to-living', pitch: -6, yaw: -140, text: 'Back to Living Room', target: 'living' },
      { suffix: 'bed-to-balcony', pitch: -2, yaw: 75, text: 'Step out to Balcony', target: 'balcony' },
    ],
  },
  {
    id: 'kitchen',
    title: 'Modern Kitchen',
    file: 'kitchen.jpg',
    hotspots: [
      { suffix: 'kitch-to-dining', pitch: -4, yaw: 50, text: 'Walk to Dining Room', target: 'dining' },
      { suffix: 'kitch-to-living', pitch: -3, yaw: 130, text: 'Back to Living Room', target: 'living' },
    ],
  },
  {
    id: 'dining',
    title: 'Dining Hall',
    file: 'dining.jpg',
    hotspots: [
      { suffix: 'din-to-kitchen', pitch: -5, yaw: -120, text: 'Enter Kitchen', target: 'kitchen' },
      { suffix: 'din-to-living', pitch: -4, yaw: 35, text: 'Return to Living Room', target: 'living' },
      { suffix: 'din-to-balcony', pitch: -2, yaw: -45, text: 'Open Balcony', target: 'balcony' },
    ],
  },
  {
    id: 'balcony',
    title: 'Scenic Balcony & Terrace',
    file: 'balcony.jpg',
    hotspots: [
      { suffix: 'balc-to-bedroom', pitch: -6, yaw: -80, text: 'Enter Master Bedroom', target: 'bedroom' },
      { suffix: 'balc-to-dining', pitch: -4, yaw: 100, text: 'Enter Dining Room', target: 'dining' },
    ],
  },
];

export function buildPanorama(listingId: string): PanoramaTour {
  const tour: PanoramaTour = {
    defaultSceneId: 'living',
    scenes: SCENES.map((scene) => ({
      id: scene.id,
      title: scene.title,
      s3Key: `listings/${listingId}/panoramas/${scene.id}.jpg`,
      hotspots: scene.hotspots.map((h) => ({
        id: `${listingId}-${h.suffix}`,
        pitch: h.pitch,
        yaw: h.yaw,
        text: h.text,
        targetSceneId: h.target,
      })),
    })),
  };
  validatePanorama(tour, listingId);
  return tour;
}

function attachTours(listings: Listing[], tourReady: Set<string>): Listing[] {
  return listings.map((listing) => {
    if (!tourReady.has(listing.listingId)) return listing;
    const panorama = buildPanorama(listing.listingId);
    return {
      ...listing,
      panorama,
      panoramaKeys: panorama.scenes.map((scene) => scene.s3Key),
    };
  });
}

type S3Like = Pick<S3Client, 'send'>;

async function findMediaBucket(s3: S3Like): Promise<string> {
  if (process.env.S3_PROPERTY_MEDIA_BUCKET) return process.env.S3_PROPERTY_MEDIA_BUCKET;
  const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
  const found = Buckets.find((b) => b.Name?.startsWith('rentvision-property-media-'));
  if (!found?.Name) {
    throw new Error('Could not find the media bucket. Set S3_PROPERTY_MEDIA_BUCKET=<bucket name>.');
  }
  return found.Name;
}

async function objectExists(s3: S3Like, bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Uploads each panorama image once (under the first listing), then copies it
 * inside S3 for the other listings, so the images are only uploaded one time.
 * Returns the listing ids whose tours are ready.
 */
export async function uploadPanoramas(
  listingIds: string[],
  s3: S3Like = new S3Client({ region: process.env.AWS_REGION || 'eu-north-1' }),
  imageDir: string = PANORAMA_DIR
): Promise<Set<string>> {
  const bucket = await findMediaBucket(s3);
  console.log(`media bucket: ${bucket}`);
  const [first, ...others] = listingIds;
  const keyFor = (listingId: string, sceneId: string) =>
    `listings/${listingId}/panoramas/${sceneId}.jpg`;

  for (const scene of SCENES) {
    const key = keyFor(first, scene.id);
    if (await objectExists(s3, bucket, key)) {
      console.log(`panorama exists    ${key}`);
      continue;
    }
    const body = fs.readFileSync(path.join(imageDir, scene.file));
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/jpeg' })
    );
    console.log(`panorama uploaded  ${key} (${(body.length / 1048576).toFixed(1)} MB)`);
  }

  for (const listingId of others) {
    for (const scene of SCENES) {
      const key = keyFor(listingId, scene.id);
      if (await objectExists(s3, bucket, key)) continue;
      await s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: key,
          CopySource: `${bucket}/${keyFor(first, scene.id)}`,
          ContentType: 'image/jpeg',
          MetadataDirective: 'REPLACE',
        })
      );
    }
    console.log(`panorama copied    ${listingId} (${SCENES.length} scenes)`);
  }

  return new Set(listingIds);
}

export async function seedAll(
  options: { allowMemory?: boolean; skipUpload?: boolean } = {}
): Promise<void> {
  if (useMemoryStore() && !options.allowMemory) {
    throw new Error(
      'Refusing to seed: the API is in memory mode (DATA_STORE=memory or API_LOCAL_MODE=true). ' +
        'Unset those variables so the script writes to DynamoDB.'
    );
  }

  const users = buildSeedUsers();
  for (const user of users) {
    await putUser(user);
    console.log(`user    ${user.userId}  ${user.email}  (${user.role})`);
  }

  // Upload tour images first; a listing only gets a tour if its images are in S3.
  let tourReady = new Set<string>();
  if (options.skipUpload || useMemoryStore()) {
    tourReady = new Set(TOUR_LISTING_IDS);
  } else {
    try {
      tourReady = await uploadPanoramas(TOUR_LISTING_IDS);
    } catch (err) {
      console.warn(
        `\nWARNING: panorama upload failed, seeding listings without 360 tours.\n${
          err instanceof Error ? err.message : err
        }\n`
      );
    }
  }

  const listings = attachTours(buildSeedListings(), tourReady);
  for (const listing of listings) {
    await putListing(listing);
    console.log(
      `listing ${listing.listingId}  ${listing.title}  ${listing.price} ${listing.currency}${
        listing.panorama ? '  [360 tour]' : ''
      }`
    );
  }

  console.log(`\nDone: ${users.length} users, ${listings.length} listings.`);
  console.log(`Demo logins (password "${DEMO_PASSWORD}"): demo@rentvision.com (landlord), tenant@rentvision.com (user)`);
}

if (require.main === module) {
  seedAll().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
