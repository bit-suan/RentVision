import { encodeGeohash } from '../utils/geohash';
import { Lease, Listing, ListingStatus, PropertyType } from '../types';
import { putLease, seedListings } from './index';

const now = new Date().toISOString();

function listing(
  partial: Omit<Listing, 'geohash' | 'status' | 'createdAt' | 'updatedAt' | 'currency'> & {
    currency?: Listing['currency'];
  }
): Listing {
  return {
    ...partial,
    currency: partial.currency ?? 'ETB',
    status: ListingStatus.ACTIVE,
    geohash: encodeGeohash(partial.latitude, partial.longitude, 5),
    createdAt: now,
    updatedAt: now,
  };
}

export const DEMO_LISTINGS: Listing[] = [
  listing({
    listingId: 'listing-bole-loft',
    title: 'Bole loft with city views',
    description:
      'Bright two-bedroom loft near Bole Atlas, walking distance to cafes and the airport corridor.',
    price: 45000,
    propertyType: PropertyType.APARTMENT,
    latitude: 8.9942,
    longitude: 38.7891,
    address: {
      street: 'Cameroon St',
      city: 'Addis Ababa',
      subcity: 'Bole',
      woreda: '03',
    },
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 118,
    amenities: ['elevator', 'backup-power', 'fiber', 'parking'],
    mediaKeys: ['listings/listing-bole-loft/photos/living.jpg'],
    panoramaKeys: ['listings/listing-bole-loft/panoramas/living.jpg'],
    landlordId: 'landlord-hana',
  }),
  listing({
    listingId: 'listing-kirkos-flat',
    title: 'Kirkos family apartment',
    description:
      'Quiet compound apartment close to Meskel Square with a balcony and dedicated parking.',
    price: 32000,
    propertyType: PropertyType.APARTMENT,
    latitude: 9.0104,
    longitude: 38.7613,
    address: {
      street: 'Ras Mekonnen Ave',
      city: 'Addis Ababa',
      subcity: 'Kirkos',
      woreda: '08',
    },
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 140,
    amenities: ['compound', 'parking', 'water-tank'],
    mediaKeys: [],
    panoramaKeys: ['listings/listing-kirkos-flat/panoramas/living.jpg'],
    landlordId: 'landlord-dawit',
  }),
  listing({
    listingId: 'listing-yeka-villa',
    title: 'Yeka garden villa',
    description:
      'Detached villa with a private garden, ideal for families who want space outside the center.',
    price: 78000,
    propertyType: PropertyType.VILLA,
    latitude: 9.0378,
    longitude: 38.8034,
    address: {
      street: 'Megenagna Rd',
      city: 'Addis Ababa',
      subcity: 'Yeka',
      woreda: '09',
    },
    bedrooms: 4,
    bathrooms: 3,
    areaSqm: 260,
    amenities: ['garden', 'generator', 'security', 'parking'],
    mediaKeys: [],
    panoramaKeys: ['listings/listing-yeka-villa/panoramas/living.jpg'],
    landlordId: 'landlord-selam',
  }),
  listing({
    listingId: 'listing-arada-studio',
    title: 'Piassa studio near Piazza',
    description:
      'Compact studio in a restored Arada building, close to cafes, bookstores, and transit.',
    price: 18000,
    propertyType: PropertyType.STUDIO,
    latitude: 9.0336,
    longitude: 38.7518,
    address: {
      street: 'Churchill Ave',
      city: 'Addis Ababa',
      subcity: 'Arada',
      woreda: '01',
    },
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 42,
    amenities: ['furnished', 'fiber'],
    mediaKeys: [],
    panoramaKeys: ['listings/listing-arada-studio/panoramas/living.jpg'],
    landlordId: 'landlord-yonas',
  }),
  listing({
    listingId: 'listing-sarbet-house',
    title: 'Sarbet courtyard house',
    description:
      'Three-bedroom house with a courtyard, minutes from schools and the ring road.',
    price: 52000,
    propertyType: PropertyType.HOUSE,
    latitude: 8.9961,
    longitude: 38.7414,
    address: {
      street: 'Sarbet Rd',
      city: 'Addis Ababa',
      subcity: 'Nifas Silk-Lafto',
      woreda: '05',
    },
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 175,
    amenities: ['courtyard', 'parking', 'backup-power'],
    mediaKeys: [],
    panoramaKeys: ['listings/listing-sarbet-house/panoramas/living.jpg'],
    landlordId: 'landlord-meron',
  }),
  listing({
    listingId: 'listing-cmc-apartment',
    title: 'CMC apartment with parking',
    description:
      'Modern apartment on the CMC road with a gym, generator, and 24-hour security.',
    price: 40000,
    propertyType: PropertyType.APARTMENT,
    latitude: 9.0218,
    longitude: 38.8346,
    address: {
      street: 'CMC Road',
      city: 'Addis Ababa',
      subcity: 'Yeka',
      woreda: '14',
    },
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 110,
    amenities: ['gym', 'security', 'parking', 'generator'],
    mediaKeys: [],
    panoramaKeys: ['listings/listing-cmc-apartment/panoramas/living.jpg'],
    landlordId: 'landlord-abel',
  }),
];

export const DEMO_LEASES: Lease[] = DEMO_LISTINGS.map((item) => ({
  leaseId: `lease-${item.listingId}`,
  listingId: item.listingId,
  fileName: 'residential-lease.pdf',
  fileKey: `leases/${item.listingId}/sample.pdf`,
  fileSize: 18432,
  mimeType: 'application/pdf',
  status: 'extracted',
  uploadedBy: item.landlordId,
  createdAt: now,
  updatedAt: now,
}));

export function loadDemoListings(): void {
  seedListings(DEMO_LISTINGS);
  for (const lease of DEMO_LEASES) {
    void putLease(lease);
  }
}
