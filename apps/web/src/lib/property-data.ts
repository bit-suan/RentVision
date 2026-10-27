import type {} from "../../../../shared/contracts";

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
    amenities: ["Generator", "Water Tank", "WiFi", "Parking"],
    trustStatus: "Verified",
    panorama: {
      deliveryUrl: "/images/panoramas/living-room.jpg",
      title: "Bole Apartment Living Room",
      initialView: { yaw: 0, pitch: 0, hfov: 100 },
      hotspots: [
        {
          id: "p1-spot-bedroom",
          pitch: -6,
          yaw: 38,
          text: "Master Bedroom",
          type: "SCENE",
          targetPanoramaId: "bedroom",
        },
      ],
    },
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
    amenities: ["Generator", "Water Tank", "Parking", "WiFi"],
    trustStatus: "Verified",
    panorama: {
      deliveryUrl: "/images/panoramas/bedroom.jpg",
      title: "Kazanchis Family Apartment",
      initialView: { yaw: 10, pitch: 0, hfov: 100 },
      hotspots: [
        {
          id: "p2-spot-living",
          pitch: -4,
          yaw: -110,
          text: "Living Area",
          type: "SCENE",
          targetPanoramaId: "living",
        },
      ],
    },
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
    amenities: ["Generator", "Water Tank", "Parking", "WiFi"],
    trustStatus: "Verified",
    panorama: {
      deliveryUrl: "/images/panoramas/living-room.jpg",
      title: "CMC Modern Villa",
      initialView: { yaw: -15, pitch: -2, hfov: 100 },
      hotspots: [
        {
          id: "p3-spot-patio",
          pitch: -5,
          yaw: 55,
          text: "Garden Terrace",
          type: "INFO",
        },
      ],
    },
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
    amenities: ["Water Tank", "WiFi", "Parking", "Generator"],
    trustStatus: "Verified",
  },
  {
    id: "listing-bole-loft",
    title: "Bole Loft with City Views",
    location: "Bole Atlas, Addis Ababa",
    price: 45000,
    bedrooms: 2,
    bathrooms: 2,
    propertyType: "Apartment",
    availability: "AVAILABLE",
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
    galleryImages: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    ],
    description:
      "Bright two-bedroom loft near Bole Atlas, walking distance to cafes and the airport corridor. Complete with 360° virtual tour.",
    amenities: ["Generator", "Water Tank", "Elevator", "Fiber WiFi", "Parking"],
    trustStatus: "Verified",
    panorama: {
      deliveryUrl: "/images/panoramas/living-room.jpg",
      title: "Bole Loft Living Room",
      initialView: { yaw: 0, pitch: 0, hfov: 100 },
      hotspots: [
        {
          id: "bole-spot-bedroom",
          pitch: -6,
          yaw: 40,
          text: "Master Bedroom",
          type: "SCENE",
          targetPanoramaId: "bedroom",
        },
      ],
    },
  },
];
