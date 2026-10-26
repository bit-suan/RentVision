import type {
  ListingStatus,
  Listing,
} from "../../../../shared/contracts";

export type PropertyAvailability = "AVAILABLE" | "COMING_SOON" | "RENTED" | "OCCUPIED";

export interface PropertyCoordinates {
  lat: number;
  lng: number;
}

export interface PropertyPanoramaConfig {
  deliveryUrl: string;
  title?: string;
  initialView?: {
    yaw?: number;
    pitch?: number;
    hfov?: number;
  };
  hotspots?: Array<{
    id: string;
    pitch: number;
    yaw: number;
    text: string;
    type: "SCENE" | "INFO";
    targetPanoramaId?: string;
  }>;
}

export interface MockProperty {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  availability: PropertyAvailability;
  coordinates?: PropertyCoordinates;
  panorama?: PropertyPanoramaConfig;
  imageUrl: string;
  galleryImages: string[];
  description: string;
  amenities: string[];
  trustStatus: string;
}

export const mockProperties: MockProperty[] = [
  {
    id: "property-001",
    title: "Modern 2-Bedroom Apartment",
    location: "Bole, Addis Ababa",
    price: 28000,
    bedrooms: 2,
    bathrooms: 2,
    propertyType: "Apartment",
    availability: "AVAILABLE",
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
    galleryImages: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    ],
    description:
      "A bright, modern apartment with comfortable living spaces in Bole.",
    amenities: ["Fitted kitchen", "Built-in wardrobes", "Balcony"],
    trustStatus: "Verification pending",
  },
  {
    id: "property-002",
    title: "Spacious Family Apartment",
    location: "Kazanchis, Addis Ababa",
    price: 35000,
    bedrooms: 3,
    bathrooms: 2,
    propertyType: "Apartment",
    availability: "AVAILABLE",
    imageUrl:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
    galleryImages: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    ],
    description:
      "A spacious apartment in Kazanchis with room for family living.",
    amenities: ["Fitted kitchen", "Laundry area", "Secure parking"],
    trustStatus: "Verification pending",
  },
  {
    id: "property-003",
    title: "Modern Villa",
    location: "CMC, Addis Ababa",
    price: 65000,
    bedrooms: 4,
    bathrooms: 3,
    propertyType: "Villa",
    availability: "COMING_SOON",
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    galleryImages: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    ],
    description:
      "A modern villa in CMC with generous indoor and outdoor space.",
    amenities: ["Private garden", "Fitted kitchen", "Secure parking"],
    trustStatus: "Verification pending",
  },
  {
    id: "property-004",
    title: "Affordable One-Bedroom",
    location: "Sar Bet, Addis Ababa",
    price: 18000,
    bedrooms: 1,
    bathrooms: 1,
    propertyType: "Apartment",
    availability: "OCCUPIED",
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
    galleryImages: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    ],
    description:
      "A comfortable one-bedroom apartment in Sar Bet at an accessible price.",
    amenities: ["Fitted kitchen", "Built-in wardrobes"],
    trustStatus: "Verification pending",
  },
];
